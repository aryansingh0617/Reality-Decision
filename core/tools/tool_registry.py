"""Tool Registry — Typed, deterministic tools executable by PRAVAH autonomous reasoning agents."""

from __future__ import annotations
import time
import uuid
import json
import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional, Tuple

from core.state.reality_state import RealityState, EntityStatus, Route, DecisionPacket
from core.evidence.evidence_store import EvidenceStore
from core.dependencies.dependency_graph import DependencyGraph
from core.prediction.tti_engine import TTIEngine
from core.evidence.voi_engine import VoIEngine
from core.prediction.accessibility_engine import AccessibilityEngine
from core.risk.mission_risk_engine import MissionRiskEngine
from core.validation.safety_gate import DeterministicSafetyGate
from agents.evidence_agent import EvidenceAgent
from agents.dependency_agent import DependencyAgent
from agents.simulation_agent import SimulationAgent
from agents.escalation_agent import EscalationAgent
from agents.critic_agent import CriticAgent

logger = logging.getLogger("pravah.tool_registry")


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
        func_decls = []
        for tool in self._tools.values():
            func_decls.append({
                "name": tool.name,
                "description": tool.description,
                "parameters": tool.parameters
            })
        return [{"functionDeclarations": func_decls}]

    def validate_arguments(self, tool_name: str, args: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        if tool_name not in self._tools:
            return False, f"Tool '{tool_name}' is not registered in ToolRegistry"

        tool_def = self._tools[tool_name]
        required_params = tool_def.parameters.get("required", [])
        missing = [p for p in required_params if p not in args or args[p] is None or args[p] == ""]
        if missing:
            return False, f"Missing required parameter(s): {', '.join(missing)} for tool '{tool_name}'"

        return True, None

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
            "Inspect authoritative operational reality state: weather, water depths, road statuses, vehicle fleet, and world state version.",
            {
                "type": "object",
                "properties": {
                    "entity_id": {"type": "string", "description": "Optional specific entity ID to inspect"}
                }
            },
            lambda s, st, g, p: {
                "world_state_version": s.world_state_version,
                "life_cycle_state": s.life_cycle_state,
                "weather": s.weather.value,
                "water_depth_m": s.current_water_depth,
                "water_rise_rate_m_hr": s.water_rise_rate,
                "policy": s.policy.value,
                "routes": {k: {"name": r.name, "status": r.status.value, "capacity": r.people_capacity, "eta": r.eta_minutes, "operational": r.operational} for k, r in s.routes.items()},
                "vehicles": {k: {"name": v.name, "capacity": v.capacity, "available": v.available, "status": v.status.value} for k, v in s.vehicles.items()},
                "last_change": s.last_state_change,
            }
        )

        # 2. inspect_evidence
        self.register(
            "inspect_evidence",
            "Inspect evidence store, extract conflicting observations, and check scout reports.",
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
            "Traverse dependency graph and propagate downstream cascades when a bridge/road breaks.",
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

        # 4. calculate_route_eta
        self.register(
            "calculate_route_eta",
            "Calculate deterministic travel ETA, delays, and traffic congestion penalties for a corridor.",
            {
                "type": "object",
                "properties": {
                    "route_id": {"type": "string", "description": "Route ID (e.g. route_r12, route_r14)"},
                    "traffic_congestion_pct": {"type": "number", "description": "Traffic congestion percentage (0-100)"}
                },
                "required": ["route_id"]
            },
            lambda s, st, g, p: _calculate_route_eta_tool(s, p)
        )

        # 5. assess_mission_risk
        self.register(
            "assess_mission_risk",
            "Evaluate mission vulnerability against delivery deadline (45m), 5-factor risk score, and downstream hospital impact.",
            {
                "type": "object",
                "properties": {
                    "route_id": {"type": "string", "description": "Proposed route ID to evaluate for the mission"}
                }
            },
            lambda s, st, g, p: _assess_mission_risk_tool(s, p)
        )

        # 6. calculate_voi
        self.register(
            "calculate_voi",
            "Calculate mathematical Value of Information (VoI) based on Expected Loss Reduction vs Verification Cost to prioritize drone reconnaissance.",
            {
                "type": "object",
                "properties": {
                    "max_items": {"type": "integer", "description": "Max verification tasks to rank"}
                }
            },
            lambda s, st, g, p: [
                {
                    "action_type": a.action_type,
                    "entity_id": a.entity_id,
                    "target_name": a.target_name,
                    "voi_score": a.voi_score,
                    "net_voi": a.net_voi,
                    "expected_loss_reduction": a.expected_loss_reduction,
                    "verification_cost": a.verification_cost,
                    "investigate_recommended": a.investigate_recommended,
                    "reason": a.recommendation_reason,
                }
                for a in VoIEngine.calculate_voi_rankings(s, st, g, p.get("max_items", 3))
            ]
        )

        # 7. simulate_counterfactual
        self.register(
            "simulate_counterfactual",
            "Simulate counterfactual candidate branches (Route R-12 vs Route R-14 vs Wait/Verify vs Escalate) over cloned state deltas.",
            {
                "type": "object",
                "properties": {
                    "policy": {"type": "string", "description": "Optional policy to test (SAFE, BALANCED, URGENT)"}
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

        # 8. propose_replan
        self.register(
            "propose_replan",
            "Agent proposal: Formulate a candidate route reroute or escalation for independent deterministic safety gate validation.",
            {
                "type": "object",
                "properties": {
                    "proposed_route_id": {"type": "string", "description": "Candidate route (e.g. route_r14)"},
                    "action_type": {"type": "string", "description": "REROUTE | HOLD | ESCALATE"},
                    "reason": {"type": "string", "description": "Why this proposal was selected"}
                },
                "required": ["proposed_route_id", "reason"]
            },
            lambda s, st, g, p: _propose_replan_tool(s, p)
        )

        # 9. validate_plan (Deterministic Safety Gate)
        self.register(
            "validate_plan",
            "Validate candidate route proposal through the independent Deterministic Safety Gate (checks bridge failure, TTI, fleet capacity, deadline).",
            {
                "type": "object",
                "properties": {
                    "route_id": {"type": "string", "description": "Route ID to validate (e.g. route_r12, route_r14)"},
                    "demand": {"type": "integer", "description": "Evacuee / Supply Demand (default: 20)"}
                },
                "required": ["route_id"]
            },
            lambda s, st, g, p: _validate_plan_tool(s, p)
        )

        # 10. escalate
        self.register(
            "escalate",
            "Trigger external emergency state escalation / Mutual Aid when local vehicle capacity or road access is completely compromised.",
            {
                "type": "object",
                "properties": {
                    "demand": {"type": "integer", "description": "Evacuation demand (default: 25)"},
                    "reason": {"type": "string", "description": "Reason for escalation"}
                }
            },
            lambda s, st, g, p: EscalationAgent.evaluate_escalation(s, p.get("demand", 25)) or {"status": "ESCALATION_NOT_REQUIRED", "message": "Local capacity is sufficient"}
        )

        # 11. generate_decision_packet
        self.register(
            "generate_decision_packet",
            "Synthesize and serialize the final structured DecisionPacket contract for human incident commander sign-off.",
            {
                "type": "object",
                "properties": {
                    "recommendation": {
                        "type": "string",
                        "description": "Final recommendation title (e.g. 'ROUTE R-14 — SAFE BYPASS DETOUR (NH-6)', 'HOLD AND VERIFY', 'CAPACITY GAP — STATE ESCALATION')"
                    },
                    "route_id": {
                        "type": "string",
                        "description": "Selected corridor route_id if applicable ('route_r12', 'route_r14')"
                    },
                    "rationale": {
                        "type": "string",
                        "description": "Detailed reasoning based on tool evidence, TTI, and mission deadline"
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


def _calculate_route_eta_tool(state: RealityState, params: Dict[str, Any]) -> Dict[str, Any]:
    route_id = params.get("route_id", "route_r12")
    congestion = float(params.get("traffic_congestion_pct", 30.0))
    
    if route_id not in state.routes:
        return {"error": f"Route '{route_id}' not found"}

    route = state.routes[route_id]
    rain = 12.0 if state.weather.value == "Rain" else 0.0
    
    # Use deterministic accessibility engine
    from core.state.ner_world_model import RouteOption, Bridge
    r_opt = RouteOption(
        id=route.id,
        name=route.name,
        label=route.label,
        corridor_desc=route.name,
        coordinates=route.coords,
        distance_km=28.0 if route.id == "route_r12" else 42.0,
        baseline_eta_min=route.eta_minutes,
        current_eta_min=route.eta_minutes,
        estimated_delay_min=0,
        traffic_congestion_pct=congestion,
        risk_level="LOW",
        risk_score=20.0,
        tti_minutes=999.0,
        operational=route.operational,
        feasibility_status="FEASIBLE" if route.operational else "PHYSICALLY_BLOCKED",
        depends_on=route.depends_on,
    )
    
    bridges = {}
    if "bridge_b07" in state.entities:
        b07 = state.entities["bridge_b07"]
        bridges["bridge_b07"] = Bridge(
            id="bridge_b07",
            name="Saraighat Bridge B-07",
            river_name="Brahmaputra",
            coordinates=[26.19, 91.74],
            water_clearance_m=2.0,
            critical_submergence_threshold_m=0.50,
            current_water_depth_m=state.current_water_depth,
            rate_of_rise_m_hr=state.water_rise_rate,
            operational=(b07.status != EntityStatus.UNAVAILABLE),
        )

    return AccessibilityEngine.calculate_corridor_accessibility(
        r_opt, bridges, traffic_congestion_pct=congestion, rainfall_mm_hr=rain
    )


def _assess_mission_risk_tool(state: RealityState, params: Dict[str, Any]) -> Dict[str, Any]:
    route_id = params.get("route_id", "route_r12")
    route = state.routes.get(route_id)
    if not route:
        return {"error": f"Route '{route_id}' not found"}

    from core.state.ner_world_model import RouteOption, Bridge, Mission, Facility
    r_opt = RouteOption(
        id=route.id,
        name=route.name,
        label=route.label,
        corridor_desc=route.name,
        coordinates=route.coords,
        distance_km=28.0 if route.id == "route_r12" else 42.0,
        baseline_eta_min=15 if route.id == "route_r12" else 35,
        current_eta_min=route.eta_minutes,
        estimated_delay_min=0,
        traffic_congestion_pct=30.0,
        risk_level="LOW",
        risk_score=20.0,
        tti_minutes=999.0,
        operational=route.operational,
        feasibility_status="FEASIBLE" if route.operational else "PHYSICALLY_BLOCKED",
        depends_on=route.depends_on,
    )

    bridges = {
        "bridge_b07": Bridge(
            id="bridge_b07",
            name="Saraighat Bridge B-07",
            river_name="Brahmaputra",
            coordinates=[26.19, 91.74],
            water_clearance_m=2.0,
            critical_submergence_threshold_m=0.50,
            current_water_depth_m=state.current_water_depth,
            rate_of_rise_m_hr=state.water_rise_rate,
            operational=route.operational if route.id == "route_r12" else True,
        )
    }

    acc = AccessibilityEngine.calculate_corridor_accessibility(r_opt, bridges, traffic_congestion_pct=30.0, rainfall_mm_hr=10.0)
    
    m17 = Mission(
        id="M-17",
        name="Mission M-17 (Assam Emergency Medical Convoy)",
        commodity="Critical Vaccines & Blood Plasma",
        priority="URGENT_LIFE_SAFETY",
        origin_facility_id="depot_d03",
        destination_facility_id="hosp_h03",
        vehicle_id="vehicle_v02",
        current_route_id=route_id,
        quantity_units=100,
        deadline_minutes=45,
        baseline_eta_minutes=15 if route_id == "route_r12" else 35,
        current_eta_minutes=acc["current_eta_min"],
        estimated_delay_minutes=acc["estimated_delay_min"],
    )

    fac = Facility(
        id="hosp_h03",
        name="Dispur District Hospital H-03",
        facility_type="DISTRICT_HOSPITAL",
        district_id="dist_kamrup",
        coordinates=[26.14, 91.78],
        stock_hours_remaining=2.5,
    )

    return MissionRiskEngine.assess_mission_risk_and_impact(m17, r_opt, acc, fac)


def _propose_replan_tool(state: RealityState, params: Dict[str, Any]) -> Dict[str, Any]:
    proposed_route = params.get("proposed_route_id", "route_r14")
    action_type = params.get("action_type", "REROUTE")
    reason = params.get("reason", "Corridor reroute proposal")

    return {
        "status": "PROPOSAL_FORMULATED",
        "proposed_route_id": proposed_route,
        "action_type": action_type,
        "reason": reason,
        "next_step": "SUBMIT_TO_DETERMINISTIC_SAFETY_GATE",
        "timestamp": state.now().isoformat(),
    }


def _validate_plan_tool(state: RealityState, params: Dict[str, Any]) -> Dict[str, Any]:
    route_id = params.get("route_id", "route_r14")
    demand = int(params.get("demand", 20))
    
    is_valid, violations, metrics = DeterministicSafetyGate.validate_proposal(
        state, route_id, evacuee_or_supply_demand=demand, max_allowable_eta_min=45
    )

    return {
        "validation_status": "PASSED" if is_valid else "REJECTED",
        "is_valid": is_valid,
        "route_id": route_id,
        "violations": violations,
        "safety_metrics": metrics,
        "safety_gate": "INDEPENDENT_DETERMINISTIC_GATE",
    }


def _generate_decision_packet_tool(
    state: RealityState,
    store: EvidenceStore,
    graph: DependencyGraph,
    params: Dict[str, Any],
) -> Dict[str, Any]:
    from agents.decision_agent import DecisionAgent
    from core.risk.risk_engine import RiskEngine

    recommendation = params.get("recommendation", "ROUTE R-14 — SAFE BYPASS DETOUR (NH-6)")
    route_id = params.get("route_id", "route_r14")
    rationale = params.get("rationale", "Selected following multi-turn tool investigation.")
    critical_assumption = params.get("critical_assumption", "NH-6 bypass corridor remains clear of landslide debris.")
    consequence_if_wrong = params.get("consequence_if_wrong", "Convoy encounters secondary road blockage, incurring 45m delay.")

    # Validate route via independent deterministic gate
    is_valid, violations, metrics = DeterministicSafetyGate.validate_proposal(
        state, route_id, evacuee_or_supply_demand=20, max_allowable_eta_min=45
    )

    # Base decision packet synthesis
    packet = DecisionAgent.formulate_packet(
        state, store, graph, RiskEngine.assess(state), recommendation=recommendation
    )
    packet.world_state_version = state.world_state_version
    packet.route_id = route_id
    
    # Calculate real physics-based TTI
    from core.prediction.tti_engine import TTIEngine
    tti_eval = TTIEngine.evaluate_route_tti(state, route_id)
    packet.tti_minutes = tti_eval.get("tti_minutes", 60.0)
    packet.fragility = tti_eval.get("fragility", "STABLE")

    packet.critical_assumption = critical_assumption
    packet.consequence_if_wrong = consequence_if_wrong
    packet.why = [rationale] if isinstance(rationale, str) else rationale
    packet.reasoning_mode = "LLM_AGENTIC"
    packet.requires_human_authorization = True
    packet.authorization_status = "PENDING"
    packet.ai_computed_at = state.now()

    state.current_packet = packet
    state.last_state_change = f"Agent generated Decision Packet for {recommendation}"

    return {
        "decision_id": packet.decision_id,
        "world_state_version": packet.world_state_version,
        "recommendation": packet.recommendation,
        "route_id": packet.route_id,
        "validation_status": "PASSED" if is_valid else "REJECTED",
        "violations": violations,
        "tti_minutes": packet.tti_minutes,
        "requires_human_authorization": True,
        "authorization_status": "PENDING",
        "status": "DECISION_PACKET_STAGED_FOR_COMMANDER_SIGN_OFF",
    }


# Singleton ToolRegistry
GLOBAL_TOOL_REGISTRY = ToolRegistry()
