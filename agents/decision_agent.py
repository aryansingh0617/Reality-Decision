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
