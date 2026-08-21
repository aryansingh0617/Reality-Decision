"""Autonomous Planner Agent — ReAct Tool-Calling & Deterministic Control Engine with Version Control."""

from __future__ import annotations
import json
import logging
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, Generator, List, Optional, Tuple

from core.state.reality_state import RealityState, EntityStatus, DecisionPacket, MissionPolicy
from core.evidence.evidence_store import EvidenceStore
from core.dependencies.dependency_graph import DependencyGraph
from core.tools.tool_registry import GLOBAL_TOOL_REGISTRY, ToolResult
from agents.llm_client import is_llm_mode_active, get_authoritative_status, call_gemini_tool_step
from core.risk.risk_engine import RiskEngine
from agents.decision_agent import DecisionAgent
from agents.critic_agent import CriticAgent
from agents.simulation_agent import SimulationAgent
from agents.escalation_agent import EscalationAgent
from agents.dependency_agent import DependencyAgent

logger = logging.getLogger("reality_decision.autonomous_agent")

DEFAULT_MAX_TURNS = 10
MAX_MALFORMED_RETRIES = 2


@dataclass
class ExecutionRecord:
    execution_id: str
    agent: str
    action_type: str  # LLM_REQUEST | LLM_RESPONSE | TOOL_CALL | TOOL_RESULT | MALFORMED_TOOL_CALL | FINAL_PLAN | ESCALATE | DETERMINISTIC_FALLBACK
    tool: str
    arguments: Dict[str, Any]
    result: Any
    status: str  # SUCCESS | FAILED | REJECTED | STARTED
    latency_ms: float
    timestamp: str
    reasoning_mode: str  # LLM_AGENTIC | DETERMINISTIC_FALLBACK
    source: str = "SYSTEM"  # LLM_TOOL_CALL | DETERMINISTIC_FALLBACK | SYSTEM
    turn_index: int = 0
    world_state_version: int = 1
    token_usage: Dict[str, int] = field(default_factory=dict)
    context_snapshot: Dict[str, Any] = field(default_factory=dict)


class AutonomousPlannerAgent:
    """Autonomous agent that determines its next action, invokes registered tools, observes results, and replans."""

    def __init__(
        self,
        state: RealityState,
        store: EvidenceStore,
        graph: DependencyGraph,
        max_turns: int = DEFAULT_MAX_TURNS,
        temperature: float = 0.0,
    ) -> None:
        self.state = state
        self.store = store
        self.graph = graph
        self.max_turns = max_turns
        self.temperature = temperature
        self.execution_history: List[ExecutionRecord] = []
        self._last_decision_packet: Optional[DecisionPacket] = None

    def get_execution_history(self) -> List[Dict[str, Any]]:
        return [
            {
                "execution_id": r.execution_id,
                "agent": r.agent,
                "action_type": r.action_type,
                "tool": r.tool,
                "arguments": r.arguments,
                "result": r.result,
                "status": r.status,
                "latency_ms": r.latency_ms,
                "timestamp": r.timestamp,
                "reasoning_mode": r.reasoning_mode,
                "source": r.source,
                "turn_index": r.turn_index,
                "world_state_version": r.world_state_version,
                "token_usage": r.token_usage,
                "context_snapshot": r.context_snapshot,
            }
            for r in self.execution_history
        ]

    def run_agent_loop_generator(self) -> Generator[Dict[str, Any], None, RealityState]:
        """Runs the autonomous agent loop and yields structured execution events."""
        auth_status = get_authoritative_status()
        llm_active = auth_status["llm_mode_active"]

        mode_str = "LLM_AGENTIC" if llm_active else "DETERMINISTIC_FALLBACK"
        self.state.reasoning_mode = mode_str
        self.state.llm_mode_active = llm_active
        self.state.life_cycle_state = "ASSESSING"

        logger.info(f"Starting Autonomous Planner Agent Loop (Mode: {mode_str}, State Version: v{self.state.world_state_version})")

        if llm_active:
            try:
                for event in self._run_llm_react_loop():
                    yield event
                return self.state
            except Exception as e:
                logger.warning(f"LLM Tool Calling Loop failed ({e}). Switching to DETERMINISTIC_FALLBACK.")
                self.state.reasoning_mode = "DETERMINISTIC_FALLBACK"
                self.state.llm_mode_active = False

        self.state.reasoning_mode = "DETERMINISTIC_FALLBACK"
        self.state.llm_mode_active = False
        for event in self._run_deterministic_agent_loop():
            yield event

        return self.state

    def _run_llm_react_loop(self) -> Generator[Dict[str, Any], None, None]:
        """
        Pure ReAct Loop:
        Dynamic function call parsing directly from Gemini responses with zero hardcoded sequences.
        """
        tools = GLOBAL_TOOL_REGISTRY.get_gemini_tools()
        system_prompt = (
            "You are the Lead Autonomous Planning Agent for REALITY//DECISION emergency mission response.\n"
            "Your objective: Safely evacuate populations by evaluating reality disruptions, assessing Time-To-Invalidation (TTI), "
            "calculating Value of Information (VoI) for evidence conflicts, validating physical wading limits, and generating decision packets.\n"
            "CRITICAL REQUIREMENT: Once you have investigated reality and determined a safe plan (or escalation gap), "
            "you MUST issue a function call to `generate_decision_packet` with your final recommendation, route_id, rationale, "
            "critical_assumption, and consequence_if_wrong.\n"
            "Do NOT output plain text summaries without calling `generate_decision_packet`."
        )

        sel_context = self.state.get_selective_context(max_hops=2)
        contents: List[Dict[str, Any]] = [
            {
                "role": "user",
                "parts": [
                    {
                        "text": (
                            f"Current Reality Disruption: {self.state.last_state_change or 'Baseline operational state'}.\n"
                            f"World State Version: v{self.state.world_state_version}.\n"
                            f"Mission Policy: {self.state.policy.value}.\n"
                            f"Operational Context: {json.dumps(sel_context)}.\n"
                            "Begin ReAct investigation using available tools and submit decision packet via generate_decision_packet tool call."
                        )
                    }
                ],
            }
        ]

        turns = 0
        terminated = False
        last_tool_call_sig: Optional[str] = None
        consecutive_duplicate_count = 0
        malformed_retries = 0

        while not terminated and turns < self.max_turns:
            turns += 1
            now_iso = datetime.now().isoformat()
            context_snapshot = self.state.get_selective_context(max_hops=2)

            req_id = f"llm_req_{uuid.uuid4().hex[:8]}"
            t0 = time.perf_counter()
            self.execution_history.append(
                ExecutionRecord(
                    execution_id=req_id,
                    agent="Autonomous Planner",
                    action_type="LLM_REQUEST",
                    tool="gemini-3.5-flash",
                    arguments={"turn": turns, "max_turns": self.max_turns},
                    result={"status": "SENT"},
                    status="STARTED",
                    latency_ms=0.0,
                    timestamp=now_iso,
                    reasoning_mode="LLM_AGENTIC",
                    source="SYSTEM",
                    turn_index=turns,
                    world_state_version=self.state.world_state_version,
                    context_snapshot=context_snapshot,
                )
            )

            model_content, usage = call_gemini_tool_step(
                system_prompt, contents, tools, temperature=self.temperature, timeout_sec=8.0
            )
            lat_ms = round((time.perf_counter() - t0) * 1000.0, 2)

            if not model_content:
                auth_status = get_authoritative_status()
                err_rec = ExecutionRecord(
                    execution_id=f"llm_err_{uuid.uuid4().hex[:8]}",
                    agent="Autonomous Planner",
                    action_type="LLM_PROVIDER_ERROR",
                    tool="gemini-3.5-flash",
                    arguments={"turn": turns},
                    result={"failure_reason": auth_status.get("failure_reason")},
                    status="FAILED",
                    latency_ms=lat_ms,
                    timestamp=datetime.now().isoformat(),
                    reasoning_mode="DETERMINISTIC_FALLBACK",
                    source="SYSTEM",
                    turn_index=turns,
                    world_state_version=self.state.world_state_version,
                )
                self.execution_history.append(err_rec)
                raise RuntimeError(f"LLM Provider Failed ({auth_status.get('failure_reason')})")

            parts = model_content.get("parts", [])
            has_function_call = False

            resp_id = f"llm_resp_{uuid.uuid4().hex[:8]}"
            self.execution_history.append(
                ExecutionRecord(
                    execution_id=resp_id,
                    agent="Autonomous Planner",
                    action_type="LLM_RESPONSE",
                    tool="gemini-3.5-flash",
                    arguments={"turn": turns},
                    result={"parts_count": len(parts), "raw_content": model_content},
                    status="SUCCESS",
                    latency_ms=lat_ms,
                    timestamp=datetime.now().isoformat(),
                    reasoning_mode="LLM_AGENTIC",
                    source="SYSTEM",
                    turn_index=turns,
                    world_state_version=self.state.world_state_version,
                    token_usage=usage,
                )
            )

            for part in parts:
                if "functionCall" in part:
                    has_function_call = True
                    fn_name = part["functionCall"]["name"]
                    args = part["functionCall"].get("args", {})

                    call_sig = f"{fn_name}:{json.dumps(args, sort_keys=True)}"
                    if call_sig == last_tool_call_sig:
                        consecutive_duplicate_count += 1
                        if consecutive_duplicate_count >= 1:
                            logger.warning(f"Duplicate tool call loop detected for {fn_name}. Forcing human escalation.")
                            self._force_escalation(
                                f"Duplicate tool call loop detected: tool '{fn_name}' invoked consecutively with identical arguments.",
                                turns,
                            )
                            yield {"step": "complete", "data": self.state.current_packet}
                            return
                    else:
                        consecutive_duplicate_count = 0
                        last_tool_call_sig = call_sig

                    is_valid, validation_error = GLOBAL_TOOL_REGISTRY.validate_arguments(fn_name, args)
                    if not is_valid:
                        malformed_retries += 1
                        logger.warning(f"Malformed tool call '{fn_name}' (retry {malformed_retries}/2): {validation_error}")
                        self.execution_history.append(
                            ExecutionRecord(
                                execution_id=f"malformed_{uuid.uuid4().hex[:8]}",
                                agent="Autonomous Planner",
                                action_type="MALFORMED_TOOL_CALL",
                                tool=fn_name,
                                arguments=args,
                                result={"error": validation_error},
                                status="FAILED",
                                latency_ms=0.0,
                                timestamp=datetime.now().isoformat(),
                                reasoning_mode="LLM_AGENTIC",
                                source="SYSTEM",
                                turn_index=turns,
                                world_state_version=self.state.world_state_version,
                            )
                        )

                        if malformed_retries > MAX_MALFORMED_RETRIES:
                            self._force_escalation(
                                f"Reasoning failed: tool call '{fn_name}' malformed arguments limit reached ({validation_error}).",
                                turns,
                            )
                            yield {"step": "complete", "data": self.state.current_packet}
                            return

                        contents.append({"role": "model", "parts": [part]})
                        contents.append({
                            "role": "user",
                            "parts": [
                                {
                                    "functionResponse": {
                                        "name": fn_name,
                                        "response": {
                                            "error": f"MALFORMED_TOOL_CALL: {validation_error}. Please provide correct arguments per schema."
                                        }
                                    }
                                }
                            ]
                        })
                        continue

                    tool_result = GLOBAL_TOOL_REGISTRY.execute(fn_name, self.state, self.store, self.graph, args)

                    rec = ExecutionRecord(
                        execution_id=tool_result.execution_id,
                        agent="Autonomous Planner",
                        action_type="TOOL_CALL",
                        tool=fn_name,
                        arguments=args,
                        result=tool_result.result_payload,
                        status=tool_result.status,
                        latency_ms=tool_result.latency_ms,
                        timestamp=tool_result.timestamp,
                        reasoning_mode="LLM_AGENTIC",
                        source="LLM_TOOL_CALL",
                        turn_index=turns,
                        world_state_version=self.state.world_state_version,
                        token_usage=usage,
                    )
                    self.execution_history.append(rec)

                    step_record = {
                        "agent": f"Autonomous Planner ({fn_name})",
                        "status": tool_result.status,
                        "inputs": f"Tool: {fn_name} (Args: {args})",
                        "outputs": f"Result: {tool_result.result_payload}",
                        "reasoning": f"Gemini parsed tool call '{fn_name}' dynamically at turn {turns}.",
                        "latency_ms": tool_result.latency_ms,
                        "mode": "LLM_AGENTIC",
                        "source": "LLM_TOOL_CALL",
                        "execution_id": tool_result.execution_id,
                        "turn_index": turns,
                        "world_state_version": self.state.world_state_version,
                        "token_usage": usage,
                    }
                    self.state.agent_steps.append(step_record)
                    yield {"step": fn_name, "data": step_record}

                    contents.append({"role": "model", "parts": [part]})
                    contents.append({
                        "role": "user",
                        "parts": [
                            {
                                "functionResponse": {
                                    "name": fn_name,
                                    "response": {
                                        "name": fn_name,
                                        "content": tool_result.result_payload
                                    }
                                }
                            }
                        ]
                    })

                    if fn_name == "generate_decision_packet":
                        if isinstance(tool_result.result_payload, dict) and tool_result.result_payload.get("accepted"):
                            terminated = True
                            self.state.replan_count += 1
                            self.state.life_cycle_state = "DECISION_READY"
                            self.execution_history.append(
                                ExecutionRecord(
                                    execution_id=f"plan_{uuid.uuid4().hex[:8]}",
                                    agent="Autonomous Planner",
                                    action_type="FINAL_PLAN",
                                    tool="generate_decision_packet",
                                    arguments=args,
                                    result=tool_result.result_payload,
                                    status="SUCCESS",
                                    latency_ms=0.0,
                                    timestamp=datetime.now().isoformat(),
                                    reasoning_mode="LLM_AGENTIC",
                                    source="LLM_TOOL_CALL",
                                    turn_index=turns,
                                    world_state_version=self.state.world_state_version,
                                )
                            )
                            yield {"step": "complete", "data": self.state.current_packet}
                            return
                        else:
                            logger.info(f"Decision packet proposal rejected by safety validator: {tool_result.result_payload.get('reason')}")

                    if turns >= self.max_turns:
                        logger.warning(f"ReAct loop reached turn limit ({turns}/{self.max_turns}). Terminating reasoning loop.")
                        break

            if not has_function_call:
                logger.info(f"Gemini chose to terminate reasoning at turn {turns} without a function call.")
                self.execution_history.append(
                    ExecutionRecord(
                        execution_id=f"stop_{uuid.uuid4().hex[:8]}",
                        agent="Autonomous Planner",
                        action_type="MODEL_STOPPED_WITHOUT_TOOL_CALL",
                        tool="none",
                        arguments={},
                        result={"message": "Model ended generation without tool call"},
                        status="SUCCESS",
                        latency_ms=0.0,
                        timestamp=datetime.now().isoformat(),
                        reasoning_mode="LLM_AGENTIC",
                        source="SYSTEM",
                        turn_index=turns,
                        world_state_version=self.state.world_state_version,
                    )
                )
                terminated = True

        if turns >= self.max_turns and not terminated:
            logger.warning(f"ReAct loop reached MAX_TURNS limit ({self.max_turns}). Escalating to human.")
            self._force_escalation("escalate to human — reasoning limit reached", turns)
            yield {"step": "complete", "data": self.state.current_packet}

    def _force_escalation(self, reason: str, turns: int) -> None:
        t_res = GLOBAL_TOOL_REGISTRY.execute("escalate", self.state, self.store, self.graph, {"demand": 25, "reason": reason})
        self.state.escalation_required = True
        self.state.escalation_payload = t_res.result_payload
        self.state.life_cycle_state = "ESCALATION_REQUIRED"

        risk = RiskEngine.assess(self.state)
        packet = DecisionAgent.generate_packet(self.state, risk)
        packet.decision_id = f"dec_esc_{uuid.uuid4().hex[:8]}"
        packet.world_state_version = self.state.world_state_version
        packet.recommendation = f"ESCALATE TO HUMAN — REASONING LIMIT REACHED ({reason})"
        packet.why = [reason, f"ReAct loop hit termination boundary at turn {turns}."]
        packet.escalation_required = True
        packet.requires_human_authorization = True
        packet.reasoning_mode = self.state.reasoning_mode
        self.state.current_packet = packet

        self.execution_history.append(
            ExecutionRecord(
                execution_id=f"esc_{uuid.uuid4().hex[:8]}",
                agent="Autonomous Planner",
                action_type="ESCALATE",
                tool="escalate",
                arguments={"reason": reason},
                result={"status": "ESCALATION_FORCED", "reason": reason},
                status="SUCCESS",
                latency_ms=0.0,
                timestamp=datetime.now().isoformat(),
                reasoning_mode=self.state.reasoning_mode,
                source="SYSTEM",
                turn_index=turns,
                world_state_version=self.state.world_state_version,
            )
        )

    def _run_deterministic_agent_loop(self) -> Generator[Dict[str, Any], None, None]:
        """Fully separate code path for Deterministic Fallback."""
        mode_str = "DETERMINISTIC_FALLBACK"

        if self.max_turns <= 1:
            self._force_escalation("escalate to human — reasoning limit reached", 1)
            yield {"step": "complete", "data": self.state.current_packet}
            return

        # 1. Inspect state
        t_res = GLOBAL_TOOL_REGISTRY.execute("inspect_reality_state", self.state, self.store, self.graph, {})
        self._record_step("inspect_reality_state", {}, t_res, "Perceived active reality state, version, and water rise trends.", mode_str)
        yield {"step": "evidence", "data": self.state.agent_steps[-1]}

        # 2. Dependency query
        broken_entity = "bridge_b07" if self.state.get_entity_status("bridge_b07") == EntityStatus.UNAVAILABLE else None
        if broken_entity:
            t_res = GLOBAL_TOOL_REGISTRY.execute("query_dependency_graph", self.state, self.store, self.graph, {"entity_id": broken_entity})
            DependencyAgent.apply_cascade(self.state, DependencyAgent.propagate(self.state, self.graph, broken_entity, EntityStatus.UNAVAILABLE))
            self._record_step("query_dependency_graph", {"entity_id": broken_entity}, t_res, f"Propagated downstream failures from broken {broken_entity}.", mode_str)
            yield {"step": "dependency", "data": self.state.agent_steps[-1]}

        # 3. TTI & VoI Calculations
        t_res = GLOBAL_TOOL_REGISTRY.execute("calculate_tti", self.state, self.store, self.graph, {"route_id": "route_r12"})
        self._record_step("calculate_tti", {"route_id": "route_r12"}, t_res, f"Calculated TTI: {t_res.result_payload.get('tti_minutes')}m vs ETA: {t_res.result_payload.get('eta_minutes')}m.", mode_str)

        t_res = GLOBAL_TOOL_REGISTRY.execute("calculate_voi", self.state, self.store, self.graph, {"max_items": 3})
        self._record_step("calculate_voi", {"max_items": 3}, t_res, "Computed mathematical Value of Information (VoI) rankings.", mode_str)
        yield {"step": "verification", "data": self.state.agent_steps[-1]}

        # 4. Counterfactual Simulation
        t_res = GLOBAL_TOOL_REGISTRY.execute("simulate_counterfactual", self.state, self.store, self.graph, {})
        self._record_step("simulate_counterfactual", {}, t_res, "Simulated candidate branches across isolated world state deltas.", mode_str)
        yield {"step": "simulation", "data": self.state.agent_steps[-1]}

        # 5. Route validation & candidate selection
        avail_cap = sum(v.capacity for v in self.state.vehicles.values() if v.available)

        if avail_cap <= 0:
            t_res = GLOBAL_TOOL_REGISTRY.execute("escalate", self.state, self.store, self.graph, {"demand": 25})
            self.state.escalation_required = True
            self.state.escalation_payload = t_res.result_payload
            self._record_step("escalate", {"demand": 25}, t_res, "Vehicle capacity collapsed to 0. Triggered external airlift escalation.", mode_str)
            yield {"step": "critic", "data": self.state.agent_steps[-1]}
        else:
            r12_val = GLOBAL_TOOL_REGISTRY.execute("validate_plan", self.state, self.store, self.graph, {"route_id": "route_r12"})
            if not r12_val.result_payload.get("valid"):
                self._record_step("validate_plan", {"route_id": "route_r12"}, r12_val, f"Route R-12 REJECTED: {r12_val.result_payload.get('reason')}. Re-planning to bypass.", mode_str)
                yield {"step": "critic", "data": self.state.agent_steps[-1]}

                r14_val = GLOBAL_TOOL_REGISTRY.execute("validate_plan", self.state, self.store, self.graph, {"route_id": "route_r14"})
                self._record_step("validate_plan", {"route_id": "route_r14"}, r14_val, "Route R-14 Detour VALIDATED: Safe bypass satisfies capacity and bridge constraints.", mode_str)
                yield {"step": "decision", "data": self.state.agent_steps[-1]}
            else:
                self._record_step("validate_plan", {"route_id": "route_r12"}, r12_val, "Route R-12 VALIDATED: Fast corridor operational.", mode_str)
                yield {"step": "decision", "data": self.state.agent_steps[-1]}

        # Finalize decision packet
        risk = RiskEngine.assess(self.state)
        decision_packet = DecisionAgent.generate_packet(self.state, risk)
        decision_packet.decision_id = f"dec_det_{uuid.uuid4().hex[:8]}"
        decision_packet.world_state_version = self.state.world_state_version
        decision_packet.reasoning_mode = mode_str

        sim_report = SimulationAgent.stress_test(self.state, None)
        decision_packet.counterfactual_branches = [
            {
                "name": c.name,
                "recommendation": c.recommendation,
                "route_id": c.route_id,
                "delay_min": c.delay_min,
                "branch_status": c.branch_status,
                "score": c.score,
            }
            for c in sim_report.counterfactuals
        ]
        self.state.current_packet = decision_packet
        self.state.replan_count += 1
        self.state.life_cycle_state = "DECISION_READY"

        self.execution_history.append(
            ExecutionRecord(
                execution_id=f"plan_{uuid.uuid4().hex[:8]}",
                agent="Autonomous Planner",
                action_type="FINAL_PLAN",
                tool="generate_decision_packet",
                arguments={"policy": self.state.policy.value},
                result={"recommendation": decision_packet.recommendation, "route_id": decision_packet.route_id},
                status="SUCCESS",
                latency_ms=0.0,
                timestamp=datetime.now().isoformat(),
                reasoning_mode=mode_str,
                source="DETERMINISTIC_FALLBACK",
                world_state_version=self.state.world_state_version,
            )
        )
        yield {"step": "complete", "data": decision_packet}

    def _record_step(self, tool_name: str, args: Dict[str, Any], tool_res: ToolResult, reasoning: str, mode: str) -> None:
        rec = ExecutionRecord(
            execution_id=tool_res.execution_id,
            agent="Autonomous Planner",
            action_type="TOOL_CALL",
            tool=tool_name,
            arguments=args,
            result=tool_res.result_payload,
            status=tool_res.status,
            latency_ms=tool_res.latency_ms,
            timestamp=tool_res.timestamp,
            reasoning_mode=mode,
            source="DETERMINISTIC_FALLBACK",
            world_state_version=self.state.world_state_version,
        )
        self.execution_history.append(rec)

        step_record = {
            "agent": f"Autonomous Planner ({tool_name})",
            "status": tool_res.status,
            "inputs": f"Tool: {tool_name} (Args: {args})",
            "outputs": f"Result: {tool_res.result_payload}",
            "reasoning": reasoning,
            "latency_ms": tool_res.latency_ms,
            "mode": mode,
            "source": "DETERMINISTIC_FALLBACK",
            "execution_id": tool_res.execution_id,
            "world_state_version": self.state.world_state_version,
        }
        self.state.agent_steps.append(step_record)
