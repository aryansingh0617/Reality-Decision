"""Predictive Plan Invalidation (TTI) Engine — Deterministic physics calculation for hydro-infrastructure risk."""

from __future__ import annotations
import logging
from typing import Any, Dict, List, Optional
from core.state.reality_state import RealityState, Route, EntityStatus

logger = logging.getLogger("reality_decision.tti")

# Physical thresholds for Brahmaputra Guwahati Flood Corridor
BRIDGE_B07_CRITICAL_SUBMERGENCE_DEPTH_M = 0.50  # Saraighat Bridge B-07 hydraulic threshold
ROUTE_R14_BYPASS_ELEVATION_DEPTH_M = 1.20       # NH-6 South Bypass elevated highway threshold
DEFAULT_CRITICAL_WADING_DEPTH_METERS = 0.50     # Standard rescue convoy wading limit


class TTIEngine:
    """Calculates Time-To-Invalidation (TTI) and route fragility based on water rise dynamics."""

    @staticmethod
    def calculate_link_tti(
        current_depth_meters: float,
        water_rise_rate_m_per_hr: float,
        critical_threshold_meters: float = DEFAULT_CRITICAL_WADING_DEPTH_METERS,
    ) -> float:
        """
        Calculates Time-To-Invalidation in minutes.
        TTI = ((Critical Depth - Current Depth) / Rise Rate) * 60 minutes
        """
        if current_depth_meters >= critical_threshold_meters:
            return 0.0  # Already submerged beyond threshold

        if water_rise_rate_m_per_hr <= 0.0:
            return 360.0  # Stable water (6 hours safe)

        remaining_margin = critical_threshold_meters - current_depth_meters
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
        cur_depth = getattr(state, "current_water_depth", 0.35)
        rise_rate = getattr(state, "water_rise_rate", 0.15)
        b07_status = state.get_entity_status("bridge_b07")

        # Route R-12 depends directly on Saraighat Bridge B-07
        if route_id == "route_r12" or "bridge_b07" in route.depends_on:
            if not route.operational or route.status == EntityStatus.UNAVAILABLE or b07_status == EntityStatus.UNAVAILABLE or cur_depth >= BRIDGE_B07_CRITICAL_SUBMERGENCE_DEPTH_M:
                return {
                    "route_id": route_id,
                    "route_name": route.name,
                    "valid": False,
                    "reason": f"Route '{route.name}' depends on bridge_b07 which is SUBMERGED / IMPASSABLE (Depth: {cur_depth}m >= 0.50m)",
                    "tti_minutes": 0.0,
                    "eta_minutes": route.eta_minutes,
                    "current_depth_m": cur_depth,
                    "rise_rate_m_hr": rise_rate,
                    "fragility": "PHYSICALLY_BLOCKED",
                    "is_predictively_invalidated": True,
                }

            # Calculate actual TTI to bridge submergence threshold (0.50m)
            tti_min = cls.calculate_link_tti(cur_depth, rise_rate, BRIDGE_B07_CRITICAL_SUBMERGENCE_DEPTH_M)
            eta_min = route.eta_minutes

            is_predictively_invalidated = tti_min <= eta_min
            is_fragile = (tti_min < (eta_min * 1.5)) or (b07_status in (EntityStatus.UNCERTAIN, EntityStatus.CONFLICTING))

            fragility_status = (
                "PREDICTIVELY_INVALIDATED"
                if is_predictively_invalidated
                else ("FRAGILE" if is_fragile else "STABLE")
            )

            reason = (
                f"PREDICTIVE INVALIDATION: TTI ({tti_min} min) <= Transit ETA ({eta_min} min). Bridge B-07 submerges in {tti_min} min."
                if is_predictively_invalidated
                else f"Corridor operational. Bridge B-07 TTI: {tti_min} min vs Transit ETA: {eta_min} min."
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

        # Route R-14 is the elevated NH-6 South Bypass corridor
        if route_id == "route_r14":
            tti_min = cls.calculate_link_tti(cur_depth, rise_rate, ROUTE_R14_BYPASS_ELEVATION_DEPTH_M)
            eta_min = route.eta_minutes
            return {
                "route_id": route_id,
                "route_name": route.name,
                "valid": True,
                "tti_minutes": tti_min,
                "eta_minutes": eta_min,
                "current_depth_m": cur_depth,
                "rise_rate_m_hr": rise_rate,
                "fragility": "STABLE",
                "is_predictively_invalidated": False,
                "reason": f"Elevated bypass corridor clear. Submergence margin: {tti_min} min (Safe).",
            }

        # Generic route fallback
        tti_min = cls.calculate_link_tti(cur_depth, rise_rate, DEFAULT_CRITICAL_WADING_DEPTH_METERS)
        return {
            "route_id": route_id,
            "route_name": route.name,
            "valid": route.operational,
            "tti_minutes": tti_min,
            "eta_minutes": route.eta_minutes,
            "current_depth_m": cur_depth,
            "rise_rate_m_hr": rise_rate,
            "fragility": "STABLE" if route.operational else "PHYSICALLY_BLOCKED",
            "is_predictively_invalidated": False,
            "reason": f"Corridor TTI: {tti_min} min.",
        }
