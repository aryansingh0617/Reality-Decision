import logging
from core.state.reality_state import RealityState, DecisionPacket, EntityStatus
from agents.llm_client import is_llm_mode_active, call_openai_json

logger = logging.getLogger("reality_decision.critic")

class CriticAgent:
    """
    INPUT: proposed DecisionPacket + RealityState + RiskEngine assessment
    PROCESS: check for constraint violations, contradiction oversights, resource fabrications
    OUTPUT: approved (True/False) + critique text + violations list
    """

    @classmethod
    def review_decision(
        cls,
        state: RealityState,
        packet: DecisionPacket,
        risk
    ) -> tuple[bool, str, list[str]]:
        
        # If LLM mode is active, execute LLM-based critique
        if is_llm_mode_active():
            approved, critique, violations = cls._run_llm(state, packet, risk)
            return approved, critique, violations
            
        # Fallback to deterministic critique
        return cls._run_deterministic(state, packet, risk)

    @classmethod
    def _run_llm(cls, state: RealityState, packet: DecisionPacket, risk) -> tuple[bool, str, list[str]]:
        # Format routes for LLM
        routes_info = []
        for rid, r in state.routes.items():
            r_risk = risk.routes.get(rid)
            blocked = r_risk.blocked_by if r_risk else []
            routes_info.append(
                f"- Route: {r.name} ({rid}), Operational: {r.operational}, Blocked By: {', '.join(blocked) or 'none'}"
            )
            
        system_prompt = (
            "You are a Safety and Constraint Critique Agent in an emergency command center.\n"
            "Your role is to strictly verify the proposed decision against constraints and facts.\n"
            "You must flag: \n"
            "1. Resource fabrication (recommending vehicles/routes that do not exist in the state).\n"
            "2. Constraint violations (recommending a route that is blocked or unoperational).\n"
            "3. Unresolved contradictions (recommending a route that depends on a conflicting bridge status without addressal).\n\n"
            "Return a JSON object conforming exactly to this structure:\n"
            "{\n"
            "  \"approved\": bool,\n"
            "  \"critique\": \"string\" (summary of checks, or reasons for rejection),\n"
            "  \"violations\": [\"string\"] (list of specific constraint violations, empty if approved)\n"
            "}"
        )
        
        user_prompt = (
            f"Current Routes Statuses:\n" + "\n".join(routes_info) + "\n\n"
            f"Active Conflicts:\n" + "\n".join(f"- {c['entity']}: claims {c['claims']}" for c in state.conflicts) + "\n\n"
            f"Proposed Decision Packet:\n"
            f"- Recommendation: {packet.recommendation}\n"
            f"- Route ID: {packet.route_id}\n"
            f"- Assumptions: {packet.assumptions}\n"
            f"- Critical Assumption: {packet.critical_assumption}\n"
            f"- Capacity Gap Flag: {packet.capacity_gap}\n"
        )
        
        data = call_openai_json(system_prompt, user_prompt)
        if data:
            return (
                data.get("approved", True),
                data.get("critique", "No critique details returned."),
                data.get("violations", [])
            )
        
        return cls._run_deterministic(state, packet, risk)

    @classmethod
    def _run_deterministic(cls, state: RealityState, packet: DecisionPacket, risk) -> tuple[bool, str, list[str]]:
        violations = []
        
        # 1. Capacity Checks
        confirmed_cap, _, _ = state.available_vehicle_capacity()
        if confirmed_cap == 0 and not packet.capacity_gap:
            violations.append("Vehicle capacity is zero, but Decision Packet did not flag capacity gap.")
            
        # 2. Route viability check
        if packet.route_id:
            route = state.routes.get(packet.route_id)
            if not route:
                violations.append(f"Recommended route '{packet.route_id}' does not exist (fabrication).")
            else:
                r_risk = risk.routes.get(packet.route_id)
                if not r_risk or not r_risk.operational:
                    violations.append(f"Recommended route '{packet.route_id}' is not operational or is blocked by dependencies: {r_risk.blocked_by if r_risk else 'unknown'}")
                
                # Check for unresolved conflicts on dependencies
                for dep in route.depends_on:
                    if state.get_entity_status(dep) == EntityStatus.CONFLICTING:
                        violations.append(f"Recommended route '{packet.route_id}' depends on '{dep}' which is in a CONFLICTING state. Contradiction must be resolved/verified first.")

        # Determine approval
        approved = len(violations) == 0
        if approved:
            critique = "Proposed decision satisfies all operational constraints, capacity limits, and dependency requirements."
        else:
            critique = f"REJECTED: Decision violates {len(violations)} constraint(s). Replanning cycle requested."

        return approved, critique, violations
