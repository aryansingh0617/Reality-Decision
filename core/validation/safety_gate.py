"""Independent Deterministic Safety Gate — Validates Agent Proposals against Hard Physical & Operational Invariants."""

from __future__ import annotations
import logging
from typing import Any, Dict, List, Optional, Tuple

from core.state.reality_state import RealityState, EntityStatus
from core.prediction.tti_engine import TTIEngine

logger = logging.getLogger("pravah.safety_gate")


class DeterministicSafetyGate:
    """
    CRITICAL SAFETY BOUNDARY:
    The Agent may PROPOSE a plan, but the Agent CANNOT VALIDATE its own proposal.
    This gate applies strict, un-bypassable deterministic constraints.
    """

    @staticmethod
    def validate_proposal(
        state: RealityState,
        proposed_route_id: Optional[str],
        evacuee_or_supply_demand: int = 20,
        max_allowable_eta_min: int = 45,
    ) -> Tuple[bool, List[str], Dict[str, Any]]:
        """
        Validates a proposed route against 5 hard physical & operational invariants:
        1. Existence Invariant: Route must exist in network.
        2. Reachability & Physical Blockage Invariant: Bridges/corridors must not be submerged.
        3. TTI Transit Invariant: Time-to-Invalidation must exceed travel time.
        4. Capacity Invariant: Available vehicle fleet must accommodate payload/evacuees.
        5. Deadline Invariant: Calculated current ETA must meet emergency delivery deadline.

        Returns: (is_valid: bool, violation_reasons: List[str], safety_metrics: Dict[str, Any])
        """
        violations: List[str] = []
        metrics: Dict[str, Any] = {
            "route_id": proposed_route_id,
            "tti_minutes": 999.0,
            "current_eta_min": 0,
            "deadline_margin_min": 0,
            "capacity_margin_units": 0,
        }

        # 1. Existence Invariant
        if not proposed_route_id or proposed_route_id not in state.routes:
            violations.append(f"INVALID_ROUTE: Proposed route '{proposed_route_id}' does not exist in network topology.")
            return False, violations, metrics

        route = state.routes[proposed_route_id]
        metrics["current_eta_min"] = route.eta_minutes

        # 2. Physical Blockage Invariant
        if not route.operational or route.status == EntityStatus.UNAVAILABLE:
            violations.append(f"PHYSICAL_BLOCKAGE: Route '{route.name}' is marked non-operational or blocked.")

        # Check dependencies (bridges, river crossings)
        for dep in route.depends_on:
            if dep in state.entities:
                fact = state.entities[dep]
                if fact.status == EntityStatus.UNAVAILABLE or fact.value in ("failed", "submerged", "broken"):
                    violations.append(f"DEPENDENCY_FAILURE: Required bridge/link '{dep}' is submerged or impassable.")

        # 3. TTI Transit Invariant
        tti_eval = TTIEngine.evaluate_route_tti(state, proposed_route_id)
        metrics["tti_minutes"] = tti_eval.get("tti_minutes", 999.0)
        if not tti_eval.get("valid", True):
            violations.append(f"TTI_VIOLATION: {tti_eval.get('reason', 'Time-to-Invalidation less than transit time')}")

        # 4. Capacity Invariant
        available_cap = sum(v.capacity for v in state.vehicles.values() if v.available)
        metrics["capacity_margin_units"] = available_cap - evacuee_or_supply_demand
        if available_cap < evacuee_or_supply_demand:
            violations.append(
                f"CAPACITY_DEFICIT: Available fleet capacity ({available_cap} units) cannot meet required demand ({evacuee_or_supply_demand} units)."
            )

        # 5. Deadline Invariant
        deadline_margin = max_allowable_eta_min - route.eta_minutes
        metrics["deadline_margin_min"] = deadline_margin
        if route.eta_minutes > max_allowable_eta_min and route.operational:
            violations.append(
                f"DEADLINE_BREACH: Route ETA ({route.eta_minutes} min) exceeds maximum critical deadline ({max_allowable_eta_min} min) by {abs(deadline_margin)} min."
            )

        is_valid = len(violations) == 0
        if not is_valid:
            logger.warning(f"Deterministic Safety Gate REJECTED proposal for route '{proposed_route_id}': {violations}")
        else:
            logger.info(f"Deterministic Safety Gate PASSED proposal for route '{proposed_route_id}'.")

        return is_valid, violations, metrics
