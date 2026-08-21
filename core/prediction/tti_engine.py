"""Predictive Plan Invalidation (TTI) Engine — Deterministic physics calculation for hydro-infrastructure risk."""

from __future__ import annotations
import logging
from typing import Any, Dict, List, Optional
from core.state.reality_state import RealityState, Route, EntityStatus

logger = logging.getLogger("reality_decision.tti")

# Default physical thresholds if unspecified
DEFAULT_CRITICAL_WADING_DEPTH_METERS = 0.60  # Rescue Truck V-02 wading depth limit


class TTIEngine:
    """Calculates Time-To-Invalidation (TTI) and route fragility based on water rise dynamics."""

    @staticmethod
    def calculate_link_tti(
        current_depth_meters: float,
        water_rise_rate_m_per_hr: float,
        critical_wading_depth_meters: float = DEFAULT_CRITICAL_WADING_DEPTH_METERS,
    ) -> float:
        """
        Calculates Time-To-Invalidation in minutes.
        TTI = ((Critical Depth - Current Depth) / Rise Rate) * 60 minutes
        """
        if current_depth_meters >= critical_wading_depth_meters:
            return 0.0  # Already submerged beyond vehicle limit

        if water_rise_rate_m_per_hr <= 0.0:
            return 999.0  # Stable or receding water

        remaining_margin = critical_wading_depth_meters - current_depth_meters
        tti_hours = remaining_margin / water_rise_rate_m_per_hr
        return round(tti_hours * 60.0, 1)

    @classmethod
    def evaluate_route_tti(cls, state: RealityState, route_id: str) -> Dict[str, Any]:
        """Evaluates TTI and fragility for a specific corridor route."""
        if route_id not in state.routes:
            return {
                "route_id": route_id,
                "valid": False,
                "reason": f"Route '{route_id}' non-existent in state",
                "tti_minutes": 0.0,
                "fragility": "INVALID",
            }

        route = state.routes[route_id]
        if not route.operational or route.status == EntityStatus.UNAVAILABLE:
            return {
                "route_id": route_id,
                "route_name": route.name,
                "valid": False,
                "reason": f"Route '{route.name}' is already IMPASSABLE / UNAVAILABLE",
                "tti_minutes": 0.0,
                "fragility": "PHYSICALLY_BLOCKED",
            }

        # Check vehicle wading depth constraint
        min_wading_depth = min(
            (v.capacity * 0.08 for v in state.vehicles.values() if v.available),
            default=DEFAULT_CRITICAL_WADING_DEPTH_METERS,
        )
        min_wading_depth = max(0.5, min(0.8, min_wading_depth))

        cur_depth = getattr(state, "current_water_depth", 0.35)
        rise_rate = getattr(state, "water_rise_rate", 0.15)

        # Bridge B-07 specific link check if route depends on bridge_b07
        b07_status = state.get_entity_status("bridge_b07")
        if "bridge_b07" in route.depends_on and b07_status == EntityStatus.UNAVAILABLE:
            return {
                "route_id": route_id,
                "route_name": route.name,
                "valid": False,
                "reason": f"Route '{route.name}' depends on bridge_b07 which is UNAVAILABLE",
                "tti_minutes": 0.0,
                "fragility": "DEPENDENCY_COLLAPSED",
            }

        tti_min = cls.calculate_link_tti(cur_depth, rise_rate, min_wading_depth)
        eta_min = route.eta_minutes

        is_predictively_invalidated = tti_min < eta_min
        is_fragile = (tti_min < (eta_min * 1.5)) or (b07_status in (EntityStatus.UNCERTAIN, EntityStatus.CONFLICTING))

        fragility_status = (
            "PREDICTIVELY_INVALIDATED"
            if is_predictively_invalidated
            else ("FRAGILE" if is_fragile else "STABLE")
        )

        reason = (
            f"PREDICTIVE INVALIDATION: TTI ({tti_min}m) < Transit ETA ({eta_min}m). Water rise rate {rise_rate}m/hr will submerge bridge mid-transit."
            if is_predictively_invalidated
            else f"Corridor operational. TTI: {tti_min}m vs Transit ETA: {eta_min}m."
        )

        return {
            "route_id": route_id,
            "route_name": route.name,
            "valid": not is_predictively_invalidated,
            "tti_minutes": tti_min,
            "eta_minutes": eta_min,
            "current_depth_m": cur_depth,
            "rise_rate_m_hr": rise_rate,
            "fragility": fragility_status,
            "is_predictively_invalidated": is_predictively_invalidated,
            "reason": reason,
        }
