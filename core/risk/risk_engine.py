"""Risk engine — consequence assessment without fabricated probabilities."""

from __future__ import annotations

from dataclasses import dataclass

from core.state.entity_status import EntityStatus
from core.state.reality_state import MissionPolicy, RealityState, Route, Weather


@dataclass
class RouteAssessment:
    route_id: str
    operational: bool
    delay_min: int
    exposure: str  # HIGH / MEDIUM / LOW
    failure_risk: str
    confidence: str
    assumptions: list[str]
    blocked_by: list[str]


@dataclass
class RiskAssessment:
    routes: dict[str, RouteAssessment]
    capacity_confirmed: int
    capacity_unknown: int
    capacity_gap: bool
    escalation_required: bool
    weather_impact: str
    decision_window_remaining_min: int


class RiskEngine:
    """Deterministic numerical and categorical risk logic."""

    WEATHER_DELAY = {Weather.CLEAR: 0, Weather.RAIN: 5, Weather.FLOOD: 12}

    @classmethod
    def assess(cls, state: RealityState) -> RiskAssessment:
        weather_delay = cls.WEATHER_DELAY.get(state.weather, 0)
        confirmed, unknown, _ = state.available_vehicle_capacity()
        gap = state.capacity_gap()

        route_assessments: dict[str, RouteAssessment] = {}
        for rid, route in state.routes.items():
            blocked = cls._blockers(state, route)
            operational = route.operational and route.status not in (
                EntityStatus.UNAVAILABLE,
                EntityStatus.CONFLICTING,
            ) and not blocked
            delay = route.eta_minutes + weather_delay
            if route.status == EntityStatus.CONFLICTING:
                delay += 8  # uncertainty penalty — labeled synthetic
            route_assessments[rid] = RouteAssessment(
                route_id=rid,
                operational=operational,
                delay_min=delay,
                exposure=cls._exposure(route, state),
                failure_risk=route.failure_risk,
                confidence=route.confidence.value if hasattr(route.confidence, "value") else str(route.confidence),
                assumptions=cls._assumptions(route, state),
                blocked_by=blocked,
            )

        return RiskAssessment(
            routes=route_assessments,
            capacity_confirmed=confirmed,
            capacity_unknown=unknown,
            capacity_gap=gap,
            escalation_required=gap,
            weather_impact=state.weather.value,
            decision_window_remaining_min=state.decision_window_min,
        )

    @classmethod
    def _blockers(cls, state: RealityState, route: Route) -> list[str]:
        blocked = []
        for dep in route.depends_on:
            st = state.get_entity_status(dep)
            if st in (EntityStatus.UNAVAILABLE, EntityStatus.CONFLICTING, EntityStatus.UNKNOWN):
                blocked.append(dep)
            elif dep == "bridge_b07" and st == EntityStatus.UNCERTAIN:
                blocked.append(f"{dep} (uncertain)")
        if not state.gps_available and route.id == "route_r12":
            blocked.append("gps_network")
        return blocked

    @classmethod
    def _exposure(cls, route: Route, state: RealityState) -> str:
        if route.failure_risk == "HIGH" or state.weather == Weather.FLOOD:
            return "HIGH"
        if route.failure_risk == "MEDIUM" or state.weather == Weather.RAIN:
            return "MEDIUM"
        return "LOW"

    @classmethod
    def _assumptions(cls, route: Route, state: RealityState) -> list[str]:
        assumptions = [f"{route.name} remains accessible for current vehicle class"]
        if state.weather != Weather.CLEAR:
            assumptions.append(f"Weather stays {state.weather.value} — no further deterioration")
        return assumptions

    @classmethod
    def policy_weight(cls, policy: MissionPolicy) -> dict[str, float]:
        """Policy weights for route scoring — not moral judgments."""
        if policy == MissionPolicy.SAFE:
            return {"risk": 0.6, "delay": 0.2, "coverage": 0.2}
        if policy == MissionPolicy.URGENT:
            return {"risk": 0.15, "delay": 0.55, "coverage": 0.3}
        return {"risk": 0.35, "delay": 0.35, "coverage": 0.3}

    @classmethod
    def score_route(cls, assessment: RouteAssessment, policy: MissionPolicy) -> float:
        if not assessment.operational:
            return -999.0
        weights = cls.policy_weight(policy)
        risk_score = {"HIGH": 0.0, "MEDIUM": 0.5, "LOW": 1.0}.get(assessment.failure_risk, 0.3)
        delay_score = max(0, 1.0 - assessment.delay_min / 60.0)
        coverage_score = 0.7  # simplified — capacity factored separately
        return (
            weights["risk"] * risk_score
            + weights["delay"] * delay_score
            + weights["coverage"] * coverage_score
        )
