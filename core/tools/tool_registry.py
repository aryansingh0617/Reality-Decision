"""Tool Registry — Typed, deterministic tools executable by autonomous reasoning agents."""

from __future__ import annotations
import time
import uuid
import json
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional

from core.state.reality_state import RealityState, EntityStatus, Route
from core.evidence.evidence_store import EvidenceStore
from core.dependencies.dependency_graph import DependencyGraph
from agents.evidence_agent import EvidenceAgent
from agents.dependency_agent import DependencyAgent
from agents.verification_agent import VerificationAgent
from agents.simulation_agent import SimulationAgent
from agents.decision_agent import DecisionAgent
from agents.critic_agent import CriticAgent
from agents.escalation_agent import EscalationAgent
from agents.information_agent import InformationValueAgent
from core.risk.risk_engine import RiskEngine


@dataclass
class ToolResult:
    execution_id: str
    tool_name: str
    status: str  # SUCCESS | FAILURE | TIMEOUT
    input_params: Dict[str, Any]
    result_payload: Any
    latency_ms: float
    timestamp: str


@dataclass
class ToolDefinition:
    name: str
    description: str
    parameters: Dict[str, Any]
    fn: Callable[[RealityState, EvidenceStore, DependencyGraph, Dict[str, Any]], Any]


class ToolRegistry:
    """Central registry of registered deterministic engine tools available to agents."""

    def __init__(self) -> None:
        self._tools: Dict[str, ToolDefinition] = {}
        self._register_default_tools()

    def register(self, name: str, description: str, parameters: Dict[str, Any], fn: Callable) -> None:
        self._tools[name] = ToolDefinition(name=name, description=description, parameters=parameters, fn=fn)

    def get_available_tools(self) -> List[Dict[str, Any]]:
        return [{"name": t.name, "description": t.description, "parameters": t.parameters} for t in self._tools.values()]

    def get_openai_tools(self) -> List[Dict[str, Any]]:
        """Export tools in OpenAI Function Calling format."""
        openai_tools = []
        for tool in self._tools.values():
            openai_tools.append({
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": tool.parameters
                }
            })
        return openai_tools

    def get_gemini_tools(self) -> List[Dict[str, Any]]:
        """Export tools in Gemini Function Declarations format."""
        func_decls = []
        for tool in self._tools.values():
            func_decls.append({
                "name": tool.name,
                "description": tool.description,
                "parameters": tool.parameters
            })
        return [{"functionDeclarations": func_decls}]

    def execute(
        self,
        tool_name: str,
        state: RealityState,
        store: EvidenceStore,
        graph: DependencyGraph,
        params: Optional[Dict[str, Any]] = None,
    ) -> ToolResult:
        params = params or {}
        exec_id = f"tool_exec_{uuid.uuid4().hex[:8]}"
        t0 = time.perf_counter()
        now_str = datetime.now().isoformat()

        if tool_name not in self._tools:
            return ToolResult(
                execution_id=exec_id,
                tool_name=tool_name,
                status="FAILURE",
                input_params=params,
                result_payload={"error": f"Tool '{tool_name}' not registered in ToolRegistry"},
                latency_ms=0.0,
                timestamp=now_str,
            )

        tool_def = self._tools[tool_name]
        try:
            payload = tool_def.fn(state, store, graph, params)
            latency = (time.perf_counter() - t0) * 1000.0
            return ToolResult(
                execution_id=exec_id,
                tool_name=tool_name,
                status="SUCCESS",
                input_params=params,
                result_payload=payload,
                latency_ms=round(latency, 2),
                timestamp=now_str,
            )
        except Exception as e:
            latency = (time.perf_counter() - t0) * 1000.0
            return ToolResult(
                execution_id=exec_id,
                tool_name=tool_name,
                status="FAILURE",
                input_params=params,
                result_payload={"error": str(e)},
                latency_ms=round(latency, 2),
                timestamp=now_str,
            )

    def _register_default_tools(self) -> None:
        # 1. inspect_reality_state
        self.register(
            "inspect_reality_state",
            "Inspect current authoritative reality state, weather, routes, and vehicle assets.",
            {
                "type": "object",
                "properties": {
                    "entity_id": {"type": "string", "description": "Optional specific entity ID to inspect"}
                }
            },
            lambda s, st, g, p: {
                "weather": s.weather,
                "policy": s.policy.value,
                "replan_count": s.replan_count,
                "routes": {k: {"status": r.status.value, "capacity": r.people_capacity, "eta": r.eta_minutes} for k, r in s.routes.items()},
                "vehicles": {k: {"status": v.status.value, "capacity": v.capacity, "available": v.available} for k, v in s.vehicles.items()},
                "last_change": s.last_state_change,
            }
        )

        # 2. inspect_evidence
        self.register(
            "inspect_evidence",
            "Inspect evidence store and extract conflicting observations and reliability ratings.",
            {
                "type": "object",
                "properties": {
                    "entity": {"type": "string", "description": "Optional entity to filter evidence for"}
                }
            },
            lambda s, st, g, p: {
                "conflicts": [c.entity for c in EvidenceAgent(st).extract("check", "store", s.now())],
                "evidence_count": len(st.items),
                "latest_items": [{"id": e.id, "entity": e.entity, "source": e.source, "status": e.status.value, "confidence": e.confidence.value} for e in st.items[-5:]]
            }
        )

        # 3. query_dependency_graph
        self.register(
            "query_dependency_graph",
            "Traverse dependency graph and propagate downstream failures when an entity breaks.",
            {
                "type": "object",
                "properties": {
                    "entity_id": {"type": "string", "description": "Entity ID that failed (e.g. bridge_b07)"},
                    "status": {"type": "string", "description": "New entity status (e.g. UNAVAILABLE)"}
                },
                "required": ["entity_id"]
            },
            lambda s, st, g, p: DependencyAgent.propagate(s, g, p.get("entity_id", "bridge_b07"), EntityStatus.UNAVAILABLE)
        )

        # 4. calculate_voi
        self.register(
            "calculate_voi",
            "Calculate mathematical Value of Information for unresolved variables and unknowns.",
            {
                "type": "object",
                "properties": {
                    "max_items": {"type": "integer", "description": "Max unknowns to rank"}
                }
            },
            lambda s, st, g, p: [
                {
                    "entity": u.entity,
                    "score": u.priority_score,
                    "recommendation": u.recommendation,
                    "latency_min": u.verification_time_min,
                }
                for u in VerificationAgent.rank_unknowns(s, st, g)[:p.get("max_items", 3)]
            ]
        )

        # 5. simulate_counterfactual
        self.register(
            "simulate_counterfactual",
            "Simulate counterfactual candidate branches over cloned isolated state deltas.",
            {
                "type": "object",
                "properties": {
                    "policy": {"type": "string", "description": "Optional policy to test"}
                }
            },
            lambda s, st, g, p: [
                {
                    "name": c.name,
                    "recommendation": c.recommendation,
                    "route_id": c.route_id,
                    "score": c.score,
                    "branch_status": c.branch_status,
                    "delay_min": c.delay_min
                }
                for c in SimulationAgent.stress_test(s, s.current_packet).counterfactuals
            ]
        )

        # 6. validate_plan
        self.register(
            "validate_plan",
            "Validate candidate route against hard deterministic constraints (bridge failures, capacity, dependencies).",
            {
                "type": "object",
                "properties": {
                    "route_id": {"type": "string", "description": "Route ID to validate (e.g. route_r12, route_r14)"}
                },
                "required": ["route_id"]
            },
            lambda s, st, g, p: _validate_route_candidate(s, p.get("route_id"))
        )

        # 7. critique_plan
        self.register(
            "critique_plan",
            "Critic review of proposed decision packet against safety boundaries.",
            {
                "type": "object",
                "properties": {
                    "recommendation": {"type": "string", "description": "Proposed action recommendation text"}
                }
            },
            lambda s, st, g, p: {
                "approved": CriticAgent.review_decision(s, s.current_packet, RiskEngine.assess(s))[0],
                "critique": CriticAgent.review_decision(s, s.current_packet, RiskEngine.assess(s))[1],
                "violations": CriticAgent.review_decision(s, s.current_packet, RiskEngine.assess(s))[2]
            }
        )

        # 8. escalate
        self.register(
            "escalate",
            "Trigger external emergency airlift/state escalation when local vehicle capacity < demand.",
            {
                "type": "object",
                "properties": {
                    "demand": {"type": "integer", "description": "Evacuation demand (default: 25)"}
                }
            },
            lambda s, st, g, p: EscalationAgent.evaluate_escalation(s, p.get("demand", 25)) or {"status": "ESCALATION_NOT_REQUIRED", "message": "Local capacity is sufficient"}
        )

        # 9. simulate_action
        self.register(
            "simulate_action",
            "Simulate operational execution action (dispatch truck, reroute, deploy drone).",
            {
                "type": "object",
                "properties": {
                    "action_type": {"type": "string", "description": "Action type: DISPATCH, REROUTE, RECON_DRONE, AIRLIFT_REQUEST"},
                    "detail": {"type": "string", "description": "Action description detail"}
                },
                "required": ["action_type"]
            },
            lambda s, st, g, p: {
                "action_type": p.get("action_type"),
                "detail": p.get("detail", "Simulated tactical action"),
                "timestamp": s.now().isoformat(),
                "status": "SIMULATED_ACTION_RECORDED"
            }
        )

        # 10. generate_decision_packet
        self.register(
            "generate_decision_packet",
            "Autonomously generate and submit the final DecisionPacket recommendation for human authorization after inspecting reality state and constraints.",
            {
                "type": "object",
                "properties": {
                    "recommendation": {
                        "type": "string",
                        "description": "Final recommendation title (e.g. 'ROUTE R-12 — FAST CORRIDOR', 'ROUTE R-14 — SAFE BYPASS DETOUR', 'CAPACITY GAP — EXTERNAL ESCALATION REQUIRED')"
                    },
                    "route_id": {
                        "type": "string",
                        "description": "Selected corridor route_id if applicable (e.g. 'route_r12', 'route_r14')"
                    },
                    "rationale": {
                        "type": "string",
                        "description": "Detailed reasoning for the recommendation based on tool evidence"
                    },
                    "critical_assumption": {
                        "type": "string",
                        "description": "Key assumption underlying the recommendation"
                    },
                    "consequence_if_wrong": {
                        "type": "string",
                        "description": "Potential negative consequence if the assumption fails"
                    },
                    "confidence": {
                        "type": "string",
                        "description": "Confidence assessment: 'HIGH', 'MEDIUM', or 'LOW'"
                    }
                },
                "required": ["recommendation", "rationale"]
            },
            lambda s, st, g, p: _generate_decision_packet_tool(s, st, g, p)
        )


def _generate_decision_packet_tool(
    state: RealityState, store: EvidenceStore, graph: DependencyGraph, params: Dict[str, Any]
) -> Dict[str, Any]:
    rec = params.get("recommendation", "ROUTE R-12 — FAST CORRIDOR")
    route_id = params.get("route_id")
    rationale = params.get("rationale", "Evaluated operational state and candidate routes.")
    crit_assumption = params.get("critical_assumption", "Selected corridor remains operational.")
    consequence = params.get("consequence_if_wrong", "Evacuation delay increased.")
    conf_str = params.get("confidence", "HIGH").upper()

    # 1. Deterministic Safety Validation
    validation = _validate_decision_packet_proposal(state, rec, route_id)
    if not validation["valid"]:
        return {
            "accepted": False,
            "status": "REJECTED_BY_SAFETY_VALIDATOR",
            "reason": validation["reason"],
            "suggestion": validation.get("suggestion", "Select an operational alternative route or call escalate tool.")
        }

    # 2. Build authoritative DecisionPacket reusing existing DecisionAgent / state model
    risk = RiskEngine.assess(state)
    packet = DecisionAgent.generate_packet(state, risk)

    # Override fields with Gemini model-generated arguments
    if rec:
        packet.recommendation = rec
    if route_id:
        packet.route_id = route_id
    elif not packet.route_id:
        if "R-12" in rec or "r12" in rec.lower():
            packet.route_id = "route_r12"
        elif "R-14" in rec or "r14" in rec.lower():
            packet.route_id = "route_r14"

    if rationale:
        packet.why = rationale
    if crit_assumption:
        packet.critical_assumption = crit_assumption
    if consequence:
        packet.consequence_if_wrong = consequence

    sim_report = SimulationAgent.stress_test(state, None)
    packet.counterfactual_branches = [
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

    # Assign state.current_packet
    state.current_packet = packet

    return {
        "accepted": True,
        "status": "DECISION_PACKET_VALIDATED_AND_CREATED",
        "recommendation": packet.recommendation,
        "route_id": packet.route_id,
        "confidence": packet.confidence.value,
        "policy": packet.policy.value,
        "why": packet.why,
        "critical_assumption": packet.critical_assumption,
    }


def _validate_decision_packet_proposal(
    state: RealityState, recommendation: str, route_id: Optional[str]
) -> Dict[str, Any]:
    rec_upper = recommendation.upper()

    # Check for capacity gap / escalation proposal
    if "ESCALATION" in rec_upper or "CAPACITY GAP" in rec_upper:
        avail_cap = sum(v.capacity for v in state.vehicles.values() if v.available)
        if avail_cap <= 0 or state.escalation_required:
            return {"valid": True}
        viable = [r for r, obj in state.routes.items() if obj.operational and obj.status != EntityStatus.UNAVAILABLE]
        if not viable:
            return {"valid": True}

    # Infer target route ID if missing
    target_route = route_id
    if not target_route:
        if "R-12" in rec_upper or "r12" in recommendation.lower():
            target_route = "route_r12"
        elif "R-14" in rec_upper or "r14" in recommendation.lower():
            target_route = "route_r14"

    if target_route and target_route in state.routes:
        route_obj = state.routes[target_route]
        if route_obj.status == EntityStatus.UNAVAILABLE or not route_obj.operational:
            return {
                "valid": False,
                "reason": f"Safety Validator Rejected: Proposed route '{route_obj.name}' ({target_route}) is UNAVAILABLE due to bridge/corridor failure.",
                "suggestion": "Select a viable operational detour (e.g. route_r14) or call escalate tool."
            }

    avail_cap = sum(v.capacity for v in state.vehicles.values() if v.available)
    if avail_cap <= 0 and not ("ESCALATION" in rec_upper or "CAPACITY" in rec_upper):
        return {
            "valid": False,
            "reason": "Safety Validator Rejected: Vehicle capacity is 0. Recommendation must request EXTERNAL ESCALATION.",
            "suggestion": "Propose CAPACITY GAP — EXTERNAL ESCALATION REQUIRED or call escalate tool."
        }

    return {"valid": True}


def _validate_route_candidate(state: RealityState, route_id: Optional[str]) -> Dict[str, Any]:
    if not route_id or route_id not in state.routes:
        return {"valid": False, "reason": f"Route '{route_id}' does not exist in network."}
    
    route = state.routes[route_id]
    if route.status == EntityStatus.UNAVAILABLE or not route.operational:
        return {
            "valid": False,
            "route_id": route_id,
            "reason": f"Route '{route.name}' is UNAVAILABLE due to bridge/corridor failure.",
            "status": route.status.value
        }
    
    # Check vehicle capacity
    avail_cap = sum(v.capacity for v in state.vehicles.values() if v.available)
    if avail_cap <= 0:
        return {
            "valid": False,
            "route_id": route_id,
            "reason": "Total local vehicle capacity is 0 slots. Capacity gap exists.",
            "available_capacity": 0
        }
    
    return {
        "valid": True,
        "route_id": route_id,
        "name": route.name,
        "status": route.status.value,
        "capacity_confirmed": avail_cap,
        "eta_minutes": route.eta_minutes
    }


GLOBAL_TOOL_REGISTRY = ToolRegistry()
