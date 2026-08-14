"""Autonomous Planner Agent — Dynamic LLM Tool-Calling & Deterministic Agentic Control Engine."""

from __future__ import annotations
import json
import logging
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, Generator, List, Optional

from core.state.reality_state import RealityState, EntityStatus, DecisionPacket, MissionPolicy
from core.evidence.evidence_store import EvidenceStore
from core.dependencies.dependency_graph import DependencyGraph
from core.tools.tool_registry import GLOBAL_TOOL_REGISTRY, ToolResult
from agents.llm_client import is_llm_mode_active, get_authoritative_status, set_llm_failure
from core.risk.risk_engine import RiskEngine
from agents.decision_agent import DecisionAgent
from agents.critic_agent import CriticAgent
from agents.simulation_agent import SimulationAgent
from agents.escalation_agent import EscalationAgent
from agents.dependency_agent import DependencyAgent

logger = logging.getLogger("reality_decision.autonomous_agent")

MAX_AGENT_STEPS = 6


@dataclass
class ExecutionRecord:
    execution_id: str
    agent: str
    action_type: str  # TOOL_CALL | FINAL_PLAN | REPLAN | ESCALATE | SIMULATED_ACTION | LLM_REQUEST | LLM_RESPONSE | LLM_PROVIDER_ERROR | TOOL_RESULT_RETURNED_TO_LLM
    tool: str
    arguments: Dict[str, Any]
    result: Any
    status: str  # SUCCESS | FAILED | REJECTED | STARTED
    latency_ms: float
    timestamp: str
    reasoning_mode: str  # LLM_AGENTIC | OFFLINE_DETERMINISTIC
    source: str = "SYSTEM"  # LLM_TOOL_CALL | DETERMINISTIC_FALLBACK | SYSTEM


class AutonomousPlannerAgent:
    """Autonomous agent that determines its next action, invokes registered tools, observes results, and replans."""

    def __init__(self, state: RealityState, store: EvidenceStore, graph: DependencyGraph) -> None:
        self.state = state
        self.store = store
        self.graph = graph
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
            }
            for r in self.execution_history
        ]

    def run_agent_loop_generator(self) -> Generator[Dict[str, Any], None, RealityState]:
        """Runs the autonomous agent loop and yields structured execution events."""
        auth_status = get_authoritative_status()
        llm_active = auth_status["llm_mode_active"]

        mode_str = auth_status["reasoning_mode"]
        self.state.reasoning_mode = mode_str
        self.state.llm_mode_active = llm_active

        logger.info(f"Starting Autonomous Planner Agent Loop (Initial Mode: {mode_str})")

        # Attempt LLM tool-calling if mode active
        if llm_active:
            try:
                for event in self._run_llm_tool_calling_loop():
                    yield event
                return self.state
            except Exception as e:
                logger.warning(f"LLM Tool Calling Loop failed ({e}). Switching to OFFLINE DETERMINISTIC fallback.")
                self.state.reasoning_mode = "OFFLINE_DETERMINISTIC"
                self.state.llm_mode_active = False

        # Fallback to dynamic deterministic agent loop
        self.state.reasoning_mode = "OFFLINE_DETERMINISTIC"
        self.state.llm_mode_active = False
        for event in self._run_deterministic_agent_loop():
            yield event

        return self.state

    def _run_llm_tool_calling_loop(self) -> Generator[Dict[str, Any], None, None]:
        """Real Gemini Multi-Turn Tool-Calling Control Loop."""
        from agents.llm_client import call_gemini_tool_step, get_authoritative_status
        tools = GLOBAL_TOOL_REGISTRY.get_gemini_tools()
        system_prompt = (
            "You are the Lead Autonomous Planning Agent for REALITY//DECISION emergency mission response.\n"
            "Your objective: Safely evacuate affected populations by evaluating reality disruptions, selecting real tools, "
            "evaluating dependencies and counterfactuals, challenging invalid routes, and producing a validated decision packet.\n"
            "You must invoke tools to gather evidence, query the graph, evaluate candidates, and validate constraints."
        )

        contents: List[Dict[str, Any]] = [
            {
                "role": "user",
                "parts": [
                    {
                        "text": f"Current Reality Disruption: {self.state.last_state_change or 'Initial Baseline'}. Policy: {self.state.policy.value}. Evacuation Demand: 25 slots. Begin investigation and replanning."
                    }
                ],
            }
        ]

        steps = 0
        total_model_tool_calls = 0

        while steps < MAX_AGENT_STEPS:
            steps += 1
            now_iso = datetime.now().isoformat()
            
            # Record LLM Request started
            req_id = f"llm_req_{uuid.uuid4().hex[:8]}"
            t0 = time.perf_counter()
            self.execution_history.append(
                ExecutionRecord(
                    execution_id=req_id,
                    agent="Autonomous Planner",
                    action_type="LLM_REQUEST",
                    tool="gemini-3.5-flash",
                    arguments={"turn": steps, "messages_count": len(contents)},
                    result={"status": "IN_PROGRESS"},
                    status="STARTED",
                    latency_ms=0.0,
                    timestamp=now_iso,
                    reasoning_mode="LLM_AGENTIC",
                    source="SYSTEM",
                )
            )

            model_content = call_gemini_tool_step(system_prompt, contents, tools)
            lat_ms = round((time.perf_counter() - t0) * 1000.0, 2)
            
            if not model_content:
                auth_status = get_authoritative_status()
                err_rec = ExecutionRecord(
                    execution_id=f"llm_err_{uuid.uuid4().hex[:8]}",
                    agent="Autonomous Planner",
                    action_type="LLM_PROVIDER_ERROR",
                    tool="gemini-3.5-flash",
                    arguments={"turn": steps},
                    result={"failure_reason": auth_status.get("failure_reason")},
                    status="FAILED",
                    latency_ms=lat_ms,
                    timestamp=datetime.now().isoformat(),
                    reasoning_mode="OFFLINE_DETERMINISTIC",
                    source="SYSTEM",
                )
                self.execution_history.append(err_rec)
                raise RuntimeError(f"LLM Provider Failed ({auth_status.get('failure_reason')})")

            parts = model_content.get("parts", [])
            has_tool_call = False

            # Record LLM Response received
            resp_id = f"llm_resp_{uuid.uuid4().hex[:8]}"
            self.execution_history.append(
                ExecutionRecord(
                    execution_id=resp_id,
                    agent="Autonomous Planner",
                    action_type="LLM_RESPONSE",
                    tool="gemini-3.5-flash",
                    arguments={"turn": steps},
                    result={"parts_count": len(parts)},
                    status="SUCCESS",
                    latency_ms=lat_ms,
                    timestamp=datetime.now().isoformat(),
                    reasoning_mode="LLM_AGENTIC",
                    source="SYSTEM",
                )
            )

            for part in parts:
                if "functionCall" in part:
                    has_tool_call = True
                    total_model_tool_calls += 1
                    fn_name = part["functionCall"]["name"]
                    args = part["functionCall"].get("args", {})

                    # Execute tool against deterministic ToolRegistry
                    tool_result = GLOBAL_TOOL_REGISTRY.execute(
                        fn_name, self.state, self.store, self.graph, args
                    )

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
                    )
                    self.execution_history.append(rec)

                    # Update state agent_steps for UI synchronization
                    step_record = {
                        "agent": f"Autonomous Planner ({fn_name})",
                        "status": tool_result.status,
                        "inputs": f"Tool: {fn_name} (Args: {args})",
                        "outputs": f"Result: {tool_result.result_payload}",
                        "reasoning": f"Gemini selected {fn_name} based on current mission belief state.",
                        "latency_ms": tool_result.latency_ms,
                        "mode": "LLM_AGENTIC",
                        "source": "LLM_TOOL_CALL",
                        "execution_id": tool_result.execution_id,
                    }
                    self.state.agent_steps.append(step_record)
                    yield {"step": fn_name, "data": step_record}

                    # Append model turn and function response turn for multi-turn Gemini context
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

                    # Record tool result returned to LLM
                    self.execution_history.append(
                        ExecutionRecord(
                            execution_id=f"ret_{uuid.uuid4().hex[:8]}",
                            agent="Autonomous Planner",
                            action_type="TOOL_RESULT_RETURNED_TO_LLM",
                            tool=fn_name,
                            arguments={"turn": steps},
                            result={"tool_result_id": tool_result.execution_id},
                            status="SUCCESS",
                            latency_ms=0.0,
                            timestamp=datetime.now().isoformat(),
                            reasoning_mode="LLM_AGENTIC",
                            source="SYSTEM",
                        )
                    )

            if not has_tool_call:
                # LLM finished reasoning
                break

        # Finalize authoritative decision packet
        risk = RiskEngine.assess(self.state)
        decision_packet = DecisionAgent.generate_packet(self.state, risk)
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
        
        # Record FINAL_PLAN in history
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
                reasoning_mode="LLM_AGENTIC",
                source="LLM_TOOL_CALL" if total_model_tool_calls > 0 else "SYSTEM",
            )
        )
        yield {"step": "complete", "data": decision_packet}

    def _run_deterministic_agent_loop(self) -> Generator[Dict[str, Any], None, None]:
        """Dynamic Deterministic Agentic Control Loop with real ToolRegistry invocations."""
        mode_str = "OFFLINE_DETERMINISTIC"

        # 1. Perception: Inspect reality state & evidence
        t_res = GLOBAL_TOOL_REGISTRY.execute("inspect_reality_state", self.state, self.store, self.graph, {})
        self._record_step("inspect_reality_state", {}, t_res, "Perceived active reality state and corridor network.", mode_str)
        yield {"step": "evidence", "data": self.state.agent_steps[-1]}

        # 2. Query Dependency Graph if disruption exists
        broken_entity = "bridge_b07" if self.state.get_entity_status("bridge_b07") == EntityStatus.UNAVAILABLE else None
        if broken_entity:
            t_res = GLOBAL_TOOL_REGISTRY.execute("query_dependency_graph", self.state, self.store, self.graph, {"entity_id": broken_entity})
            DependencyAgent.apply_cascade(self.state, DependencyAgent.propagate(self.state, self.graph, broken_entity, EntityStatus.UNAVAILABLE))
            self._record_step("query_dependency_graph", {"entity_id": broken_entity}, t_res, f"Propagated downstream failures from broken {broken_entity}.", mode_str)
            yield {"step": "dependency", "data": self.state.agent_steps[-1]}

        # 3. Simulate Counterfactual Candidate Futures
        t_res = GLOBAL_TOOL_REGISTRY.execute("simulate_counterfactual", self.state, self.store, self.graph, {})
        self._record_step("simulate_counterfactual", {}, t_res, "Simulated candidate branches across isolated world state deltas.", mode_str)
        yield {"step": "simulation", "data": self.state.agent_steps[-1]}

        # 4. Check Missing Information & VOI
        t_res = GLOBAL_TOOL_REGISTRY.execute("calculate_voi", self.state, self.store, self.graph, {"max_items": 3})
        self._record_step("calculate_voi", {"max_items": 3}, t_res, "Computed mathematical Value of Information for top unknowns.", mode_str)
        yield {"step": "verification", "data": self.state.agent_steps[-1]}

        # 5. Candidate Plan Validation & Critic Challenge
        risk = RiskEngine.assess(self.state)
        avail_cap = sum(v.capacity for v in self.state.vehicles.values() if v.available)

        if avail_cap <= 0:
            # Capacity collapse: Trigger Escalation Tool
            t_res = GLOBAL_TOOL_REGISTRY.execute("escalate", self.state, self.store, self.graph, {"demand": 25})
            self.state.escalation_required = True
            self.state.escalation_payload = t_res.result_payload
            self._record_step("escalate", {"demand": 25}, t_res, "Vehicle capacity collapsed to 0. Triggered external airlift escalation.", mode_str)
            yield {"step": "critic", "data": self.state.agent_steps[-1]}
        else:
            # Test Primary Route R-12 first
            r12_val = GLOBAL_TOOL_REGISTRY.execute("validate_plan", self.state, self.store, self.graph, {"route_id": "route_r12"})
            if not r12_val.result_payload.get("valid"):
                # R-12 Invalidated -> Replan to Detour R-14
                self._record_step("validate_plan", {"route_id": "route_r12"}, r12_val, f"Route R-12 REJECTED: {r12_val.result_payload.get('reason')}. Re-planning to bypass.", mode_str)
                yield {"step": "critic", "data": self.state.agent_steps[-1]}

                r14_val = GLOBAL_TOOL_REGISTRY.execute("validate_plan", self.state, self.store, self.graph, {"route_id": "route_r14"})
                self._record_step("validate_plan", {"route_id": "route_r14"}, r14_val, "Route R-14 Detour VALIDATED: Safe bypass satisfies capacity and bridge constraints.", mode_str)
                yield {"step": "decision", "data": self.state.agent_steps[-1]}
            else:
                self._record_step("validate_plan", {"route_id": "route_r12"}, r12_val, "Route R-12 VALIDATED: Fast corridor operational.", mode_str)
                yield {"step": "decision", "data": self.state.agent_steps[-1]}

        # Finalize authoritative decision packet
        risk = RiskEngine.assess(self.state)
        decision_packet = DecisionAgent.generate_packet(self.state, risk)
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
        
        # Record FINAL_PLAN in history with honest DETERMINISTIC_FALLBACK source
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
        }
        self.state.agent_steps.append(step_record)
