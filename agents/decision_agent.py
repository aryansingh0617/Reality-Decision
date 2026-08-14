"""Decision Agent — policy-sensitive action evaluation."""

from __future__ import annotations

from core.risk.risk_engine import RiskEngine
from core.state.entity_status import ConfidenceClass, EntityStatus
from core.state.reality_state import DecisionPacket, MissionPolicy, RealityState


class DecisionAgent:
    """
    INPUT: risk assessment, policy, verification recommendation
    PROCESS: score routes under policy weights
    OUTPUT: DecisionPacket (recommendation only — no dispatch)
    """

    @classmethod
    def generate_packet(
        cls,
        state: RealityState,
        risk,
        verification_note: str = "",
        policy_change_reason: str = "",
    ) -> DecisionPacket:
        now = state.now()
        packet = DecisionPacket(
            mission=state.mission,
            policy=state.policy,
            decision_horizon_min=state.decision_horizon_min,
            ai_computed_at=now,
            timestamp=now,
        )

        confirmed, unknown, _ = state.available_vehicle_capacity()
        
        from agents.llm_client import is_llm_mode_active, call_openai_json
        
        if is_llm_mode_active():
            routes_desc = []
            for rid, r in state.routes.items():
                r_risk = risk.routes.get(rid)
                blocked_str = ", ".join(r_risk.blocked_by) if r_risk else ""
                routes_desc.append(
                    f"- Route: {r.name} ({rid})\n"
                    f"  Status: {r.status.value}\n"
                    f"  ETA: {r.eta_minutes} min (with delay: {r_risk.delay_min if r_risk else r.eta_minutes} min)\n"
                    f"  Failure Risk: {r.failure_risk}\n"
                    f"  Operational: {r.operational}\n"
                    f"  Depends on: {', '.join(r.depends_on)}\n"
                    f"  Blocked by: {blocked_str or 'none'}"
                )
            routes_context = "\n".join(routes_desc)
            
            system_prompt = (
                "You are a Decision Agent for an emergency command center.\n"
                "Evaluate the situation, compare route risks under the current policy, and generate a structured decision.\n"
                "Return a JSON object conforming exactly to this schema:\n"
                "{\n"
                "  \"recommendation\": \"string\" (e.g. 'ROUTE R-12 — FAST CORRIDOR' or 'HALT — NO VIABLE ROUTES' or 'CAPACITY GAP — EXTERNAL ESCALATION REQUIRED'),\n"
                "  \"route_id\": \"route_r12\" | \"route_r14\" | null,\n"
                "  \"why\": [\"string\"] (bullet points explaining the choice),\n"
                "  \"known\": [\"string\"] (key facts known to the system),\n"
                "  \"unknown\": [\"string\"] (critical unknowns),\n"
                "  \"critical_assumption\": \"string\" (the single most critical assumption),\n"
                "  \"consequence_if_wrong\": \"string\" (impact if this assumption is false),\n"
                "  \"alternative\": \"string\" (backup action),\n"
                "  \"verification\": \"string\" (verification recommended),\n"
                "  \"confidence\": \"HIGH\" | \"MEDIUM\" | \"LOW\",\n"
                "  \"capacity_gap\": bool,\n"
                "  \"escalation_required\": bool,\n"
                "  \"assumptions\": [\"string\"]\n"
                "}\n"
                "CRITICAL:\n"
                "- Ground logic strictly in provided routes and vehicles. NEVER invent routes, depots, or resources.\n"
                "- If confirmed capacity is 0, you MUST select CAPACITY GAP recommendation and set capacity_gap=true, escalation_required=true."
            )
            
            user_prompt = (
                f"Mission: {state.mission}\n"
                f"Policy Mode: {state.policy.value}\n"
                f"Decision Horizon: {state.decision_horizon_min} min\n"
                f"Confirmed Vehicle Capacity: {confirmed} slots\n"
                f"Verification Note: {verification_note}\n"
                f"Policy Change Reason: {policy_change_reason}\n\n"
                f"Routes:\n{routes_context}\n\n"
                f"Current Unknowns:\n" + "\n".join(f"- {u}" for u in state.unknowns)
            )
            
            data = call_openai_json(system_prompt, user_prompt)
            if data:
                packet.recommendation = data.get("recommendation", "")
                packet.route_id = data.get("route_id")
                packet.why = data.get("why", [])
                packet.known = data.get("known", [])
                packet.unknown = data.get("unknown", [])
                packet.critical_assumption = data.get("critical_assumption", "")
                packet.consequence_if_wrong = data.get("consequence_if_wrong", "")
                packet.alternative = data.get("alternative", "")
                packet.verification = data.get("verification", "")
                packet.confidence = ConfidenceClass(data.get("confidence", "MEDIUM"))
                packet.capacity_gap = data.get("capacity_gap", False)
                packet.escalation_required = data.get("escalation_required", False)
                packet.assumptions = data.get("assumptions", [])
                packet.provenance = ["DecisionAgent (LLM Mode)", f"Policy:{state.policy.value}"]
                return packet

        if risk.capacity_gap or confirmed == 0:
            return cls._capacity_gap_packet(state, packet, confirmed, unknown)

        scores: list[tuple[str, float]] = []
        for rid, assessment in risk.routes.items():
            score = RiskEngine.score_route(assessment, state.policy)
            if assessment.operational:
                scores.append((rid, score))

        if not scores:
            packet.recommendation = "HALT — NO VIABLE ROUTES"
            packet.why = ["All corridors blocked or invalidated"]
            packet.confidence = ConfidenceClass.LOW
            packet.verification = verification_note or "Reconnaissance required"
            packet.provenance = ["RiskEngine", "DependencyAgent"]
            return packet

        scores.sort(key=lambda x: x[1], reverse=True)
        best_id, _ = scores[0]
        alt_id = scores[1][0] if len(scores) > 1 else None
        best_route = state.routes[best_id]
        best_assessment = risk.routes[best_id]

        packet.route_id = best_id
        packet.recommendation = f"{best_route.name} — {best_route.label}"
        packet.why = cls._build_why(state, best_id, best_assessment, policy_change_reason)
        packet.known = cls._build_known(state)
        packet.unknown = list(state.unknowns)
        packet.critical_assumption = best_assessment.assumptions[0] if best_assessment.assumptions else "Route remains accessible"
        packet.consequence_if_wrong = cls._consequence(best_assessment)
        packet.alternative = cls._alternative(state, alt_id, risk)
        packet.verification = verification_note or "No verification recommended at this time"
        packet.confidence = best_route.confidence if isinstance(best_route.confidence, ConfidenceClass) else ConfidenceClass.MEDIUM
        packet.provenance = ["DecisionAgent", "RiskEngine", f"Policy:{state.policy.value}"]
        packet.assumptions = best_assessment.assumptions + list(state.assumptions)
        return packet

    @classmethod
    def _capacity_gap_packet(cls, state, packet, confirmed, unknown) -> DecisionPacket:
        packet.recommendation = "CAPACITY GAP — EXTERNAL ESCALATION REQUIRED"
        packet.capacity_gap = True
        packet.escalation_required = True
        packet.why = [
            f"Confirmed vehicle capacity: {confirmed}",
            f"Unknown capacity: {unknown}",
            "System cannot fabricate resources — escalation to external assets required",
        ]
        packet.known = [f"Demand exceeds confirmed capacity ({confirmed} slots)"]
        packet.unknown = list(state.unknowns)
        packet.critical_assumption = "No additional vehicles will materialize without external coordination"
        packet.consequence_if_wrong = "Evacuation delay until external capacity arrives"
        packet.alternative = "Request mutual aid from adjacent jurisdictions"
        packet.verification = "Confirm external asset ETA before committing plan"
        packet.confidence = ConfidenceClass.HIGH
        packet.provenance = ["DecisionAgent", "RiskEngine", "CapacityCheck"]
        return packet

    @classmethod
    def _build_why(cls, state, route_id, assessment, policy_change_reason) -> list[str]:
        why = []
        if policy_change_reason:
            why.append(policy_change_reason)
        route = state.routes[route_id]
        for other_id, other in state.routes.items():
            if other_id == route_id:
                continue
            if not state.routes[other_id].operational or other.status in (EntityStatus.UNAVAILABLE, EntityStatus.CONFLICTING):
                why.append(f"{other.name} depends on unresolved {', '.join(other.depends_on) or 'dependencies'}")
            elif risk_delay := assessment.delay_min:
                if other.eta_minutes > state.decision_window_min and route.eta_minutes <= state.decision_window_min:
                    why.append(f"{other.name} exceeds decision window ({state.decision_window_min} min)")
        if not why:
            why.append(f"{route.name} remains feasible under current evidence and {state.policy.value} policy")
        return why

    @classmethod
    def _build_known(cls, state) -> list[str]:
        known = []
        for rid, route in state.routes.items():
            if route.operational and route.status == EntityStatus.KNOWN:
                known.append(f"{route.name} operational")
        for vid, v in state.vehicles.items():
            if v.available:
                known.append(f"{v.name} available ({v.capacity} capacity)")
        return known

    @classmethod
    def _consequence(cls, assessment) -> str:
        delay = assessment.delay_min
        exposure = assessment.exposure
        return f"Estimated delay: {delay}–{delay + 6} min · Exposure: {exposure} (synthetic estimate)"

    @classmethod
    def _alternative(cls, state, alt_id, risk) -> str:
        if not alt_id or alt_id not in state.routes:
            return "No viable alternative under current constraints"
        alt = state.routes[alt_id]
        if not risk.routes[alt_id].operational:
            return f"{alt.name} if dependencies verified"
        return f"{alt.name} — higher delay, lower risk profile"
