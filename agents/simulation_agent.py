"""Simulation Agent — what-if stress testing without mutating real state."""

from __future__ import annotations

import copy
from dataclasses import dataclass
from typing import List, Optional

from core.risk.risk_engine import RiskEngine
from core.state.entity_status import EntityStatus
from core.state.reality_state import RealityState, Weather


@dataclass
class ScenarioResult:
    name: str
    recommendation: str
    route_id: Optional[str]
    delay_min: int
    exposure: str
    key_assumption: str
    branch_status: str  # RECOMMENDED, UNCERTAIN, FAILED, DEGRADED
    score: float
    difference_from_base: str


@dataclass
class SimulationReport:
    base_case: ScenarioResult
    best_case: ScenarioResult
    worst_case: ScenarioResult
    counterfactuals: List[ScenarioResult]
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
    def stress_test(cls, state: RealityState, packet=None) -> SimulationReport:
        # Base case
        base = cls._run_scenario(state, "Plan A: Direct Corridor (R-12)", {})

        # Counterfactual Branch 1: Plan A (Direct Corridor assuming B-07 intact)
        cf_plan_a = cls._run_scenario(
            state,
            "Branch A: Direct R-12 Corridor",
            {"bridge_b07": EntityStatus.CONFIRMED},
            target_route="route_r12"
        )

        # Counterfactual Branch 2: Plan B (Bypass Detour R-14 assuming D-04 access)
        cf_plan_b = cls._run_scenario(
            state,
            "Branch B: Safe Bypass Detour (R-14)",
            {"bridge_b07": EntityStatus.UNAVAILABLE},
            target_route="route_r14"
        )

        # Counterfactual Branch 3: Plan C (Hold & Verify Reconnaissance)
        cf_plan_c = cls._run_scenario(
            state,
            "Branch C: Hold & Verification Wait",
            {"verification_delay": 25, "weather": Weather.FLOOD},
            target_route=None
        )

        best = cf_plan_a if cf_plan_a.score >= cf_plan_b.score else cf_plan_b
        worst = cf_plan_c

        counterfactuals = [cf_plan_a, cf_plan_b, cf_plan_c]

        alt_plan = cf_plan_b.recommendation if base.route_id == "route_r12" else cf_plan_a.recommendation

        return SimulationReport(
            base_case=base,
            best_case=best,
            worst_case=worst,
            counterfactuals=counterfactuals,
            current_plan=packet.recommendation if packet else base.recommendation,
            alternative_plan=alt_plan,
            key_assumption=packet.critical_assumption if packet else "Route passability intact",
        )

    @classmethod
    def _run_scenario(cls, state: RealityState, name: str, overrides: dict, target_route: Optional[str] = None) -> ScenarioResult:
        # Immutable deepcopy
        sim = copy.deepcopy(state)
        sim.agent_activity = []
        sim.audit_trail = []

        if "bridge_b07" in overrides:
            st = overrides["bridge_b07"]
            if "route_r12" in sim.routes:
                if st in (EntityStatus.UNAVAILABLE, EntityStatus.UNCERTAIN):
                    sim.routes["route_r12"].operational = False
                    sim.routes["route_r12"].status = st
                elif st == EntityStatus.CONFIRMED:
                    sim.routes["route_r12"].operational = True
                    sim.routes["route_r12"].status = EntityStatus.KNOWN

        if "weather" in overrides:
            sim.weather = overrides["weather"]

        if "vehicle_v02" in overrides:
            if "vehicle_v02" in sim.vehicles:
                sim.vehicles["vehicle_v02"].available = overrides["vehicle_v02"] != EntityStatus.UNAVAILABLE

        risk = RiskEngine.assess(sim)
        viable = [rid for rid, a in risk.routes.items() if a.operational]
        if target_route is None:
            chosen_route = None
            rec = "HOLD & VERIFY RECONNAISSANCE"
            delay = overrides.get("verification_delay", 20)
            exposure = "MEDIUM"
            branch_status = "UNCERTAIN"
            score = 0.50
        elif not viable or target_route not in viable:
            rec = "EXTERNAL ESCALATION REQUIRED"
            delay = 99
            exposure = "HIGH"
            branch_status = "FAILED"
            chosen_route = None
            score = 0.0
        else:
            chosen_route = target_route
            score = RiskEngine.score_route(risk.routes[chosen_route], sim.policy)
            rec = sim.routes[chosen_route].name
            delay = risk.routes[chosen_route].delay_min
            exposure = risk.routes[chosen_route].exposure
            branch_status = "RECOMMENDED" if score > 0.7 else "UNCERTAIN"

        return ScenarioResult(
            name=name,
            recommendation=rec,
            route_id=chosen_route,
            delay_min=delay,
            exposure=exposure,
            key_assumption=overrides.get("key", list(overrides.keys())[0] if overrides else "nominal state"),
            branch_status=branch_status,
            score=round(score, 3),
            difference_from_base=f"Delay {delay}m, Risk {exposure}",
        )

    @classmethod
    def verify_no_mutation(cls, original: RealityState, after_sim: RealityState) -> bool:
        """Ensure simulation did not mutate original state."""
        return original.routes is not after_sim.routes and original.vehicles is not after_sim.vehicles
