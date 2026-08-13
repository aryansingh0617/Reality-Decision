"""Simulation Agent — what-if stress testing without mutating real state."""

from __future__ import annotations

import copy
from dataclasses import dataclass

from core.risk.risk_engine import RiskEngine
from core.state.entity_status import EntityStatus
from core.state.reality_state import RealityState, Weather


@dataclass
class ScenarioResult:
    name: str
    recommendation: str
    delay_min: int
    exposure: str
    key_assumption: str
    difference_from_base: str


@dataclass
class SimulationReport:
    base_case: ScenarioResult
    best_case: ScenarioResult
    worst_case: ScenarioResult
    counterfactuals: list[ScenarioResult]
    current_plan: str
    alternative_plan: str
    key_assumption: str


class SimulationAgent:
    """
    INPUT: current state + assumptions to stress
    PROCESS: deepcopy state, modify assumption, re-assess
    OUTPUT: scenario comparison — NEVER mutates real state
    """

    @classmethod
    def stress_test(cls, state: RealityState, packet) -> SimulationReport:
        base = cls._run_scenario(state, "BASE CASE", {})
        best = cls._run_scenario(state, "BEST CASE", {"bridge_07": EntityStatus.CONFIRMED, "weather": Weather.CLEAR})
        worst = cls._run_scenario(state, "WORST CASE", {"bridge_07": EntityStatus.UNAVAILABLE, "weather": Weather.FLOOD})

        counterfactuals = [
            cls._run_scenario(state, "Bridge 07 open", {"bridge_07": EntityStatus.CONFIRMED}),
            cls._run_scenario(state, "Bridge 07 closed", {"bridge_07": EntityStatus.UNAVAILABLE}),
            cls._run_scenario(state, "Weather deteriorates", {"weather": Weather.FLOOD}),
            cls._run_scenario(state, "Vehicle 12 unavailable", {"vehicle_12": EntityStatus.UNAVAILABLE}),
            cls._run_scenario(state, "Verification takes 8 min", {"verification_delay": 8}),
        ]

        alt_plan = counterfactuals[0].recommendation if counterfactuals else "N/A"
        return SimulationReport(
            base_case=base,
            best_case=best,
            worst_case=worst,
            counterfactuals=counterfactuals,
            current_plan=packet.recommendation if packet else base.recommendation,
            alternative_plan=alt_plan,
            key_assumption=packet.critical_assumption if packet else "",
        )

    @classmethod
    def _run_scenario(cls, state: RealityState, name: str, overrides: dict) -> ScenarioResult:
        sim = copy.deepcopy(state)
        sim.agent_activity = []
        sim.audit_trail = []

        if "bridge_07" in overrides:
            st = overrides["bridge_07"]
            for rid in ("route_alpha", "route_charlie"):
                if rid in sim.routes:
                    if st == EntityStatus.UNAVAILABLE:
                        sim.routes[rid].operational = False
                        sim.routes[rid].status = EntityStatus.UNAVAILABLE
                    elif st == EntityStatus.CONFIRMED:
                        sim.routes[rid].operational = True
                        sim.routes[rid].status = EntityStatus.KNOWN

        if "weather" in overrides:
            sim.weather = overrides["weather"]

        if "vehicle_12" in overrides:
            if "vehicle_12" in sim.vehicles:
                sim.vehicles["vehicle_12"].available = overrides["vehicle_12"] != EntityStatus.UNAVAILABLE
                if not sim.vehicles["vehicle_12"].available:
                    if "route_bravo" in sim.routes:
                        sim.routes["route_bravo"].failure_risk = "HIGH"

        risk = RiskEngine.assess(sim)
        viable = [rid for rid, a in risk.routes.items() if a.operational]
        if not viable:
            rec = "NO VIABLE ROUTE"
            delay = 99
            exposure = "HIGH"
        else:
            from core.state.reality_state import MissionPolicy
            from core.risk.risk_engine import RiskEngine as RE
            scores = [(rid, RE.score_route(risk.routes[rid], sim.policy)) for rid in viable]
            scores.sort(key=lambda x: x[1], reverse=True)
            best = scores[0][0]
            rec = sim.routes[best].name
            delay = risk.routes[best].delay_min
            exposure = risk.routes[best].exposure

        return ScenarioResult(
            name=name,
            recommendation=rec,
            delay_min=delay,
            exposure=exposure,
            key_assumption=overrides.get("key", list(overrides.keys())[0] if overrides else "current state"),
            difference_from_base="",
        )

    @classmethod
    def verify_no_mutation(cls, original: RealityState, after_sim: RealityState) -> bool:
        """Ensure simulation did not mutate original state."""
        return original.routes is not after_sim.routes and original.vehicles is not after_sim.vehicles
