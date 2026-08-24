"""Deterministic Accessibility & Traffic Congestion Engine for NER Logistics Corridors."""

from __future__ import annotations
import logging
from typing import Any, Dict, List, Optional, Tuple

from core.state.ner_world_model import RouteOption, RoadSegment, Bridge, Vehicle, Mission

logger = logging.getLogger("pravah.accessibility_engine")


class AccessibilityEngine:
    """Calculates deterministic reachability, ETA, delays, traffic friction, and deadline feasibility."""

    @staticmethod
    def calculate_corridor_accessibility(
        route: RouteOption,
        bridges: Dict[str, Bridge],
        traffic_congestion_pct: float = 25.0,
        rainfall_mm_hr: float = 5.0,
        landslide_active: bool = False,
    ) -> Dict[str, Any]:
        """
        Deterministically evaluates route operational status, effective speed, current ETA, and delay.
        """
        # 1. Check physical bridge/road bottlenecks
        is_physically_blocked = False
        blocking_reasons: List[str] = []
        min_tti_minutes = 999.0

        for b_id in route.depends_on:
            if b_id in bridges:
                br = bridges[b_id]
                # Water rise TTI physics
                if br.rate_of_rise_m_hr > 0 and br.current_water_depth_m < br.critical_submergence_threshold_m:
                    tti = (br.critical_submergence_threshold_m - br.current_water_depth_m) / br.rate_of_rise_m_hr * 60.0
                    min_tti_minutes = min(min_tti_minutes, round(tti, 1))
                elif br.current_water_depth_m >= br.critical_submergence_threshold_m or not br.operational:
                    is_physically_blocked = True
                    min_tti_minutes = 0.0
                    blocking_reasons.append(f"{br.name} Submerged ({br.current_water_depth_m}m >= {br.critical_submergence_threshold_m}m limit)")

        if landslide_active and "landslide" in route.id:
            is_physically_blocked = True
            blocking_reasons.append("Active hillside debris flow on corridor")

        # 2. Compute Traffic Congestion & Weather Speed Retardation
        # Congestion factor: 0% -> 1.0, 50% -> 0.65, 90% -> 0.30
        congestion_penalty = max(0.25, 1.0 - (traffic_congestion_pct / 100.0) * 0.70)
        
        # Rainfall penalty: 0mm -> 1.0, 10mm -> 0.85, 30mm -> 0.60
        rain_penalty = max(0.50, 1.0 - (rainfall_mm_hr / 50.0) * 0.50)

        speed_multiplier = congestion_penalty * rain_penalty
        
        # Calculate dynamic ETA
        if is_physically_blocked:
            current_eta = 999
            estimated_delay = 999
            feasibility = "PHYSICALLY_BLOCKED"
        else:
            current_eta = max(route.baseline_eta_min, int(round(route.baseline_eta_min / speed_multiplier)))
            estimated_delay = max(0, current_eta - route.baseline_eta_min)
            feasibility = "FEASIBLE"

        return {
            "route_id": route.id,
            "route_name": route.name,
            "operational": not is_physically_blocked,
            "feasibility_status": feasibility,
            "baseline_eta_min": route.baseline_eta_min,
            "current_eta_min": current_eta,
            "estimated_delay_min": estimated_delay,
            "traffic_congestion_pct": traffic_congestion_pct,
            "speed_multiplier": round(speed_multiplier, 2),
            "min_tti_minutes": min_tti_minutes,
            "blocking_reasons": blocking_reasons,
        }

    @staticmethod
    def evaluate_mission_deadline_feasibility(
        mission: Mission,
        route_accessibility: Dict[str, Any],
    ) -> Tuple[bool, int, str]:
        """
        Validates if current route ETA meets the mission delivery deadline.
        Returns: (meets_deadline: bool, margin_minutes: int, status_label: str)
        """
        current_eta = route_accessibility.get("current_eta_min", 999)
        margin = mission.deadline_minutes - current_eta

        if not route_accessibility.get("operational", False):
            return False, -999, "BLOCKED_ROUTE"
        elif margin < 0:
            return False, margin, "DEADLINE_BREACHED"
        elif margin <= 10:
            return True, margin, "HIGH_RISK_MARGIN"
        else:
            return True, margin, "SAFE_MARGIN"

    @staticmethod
    def rank_route_alternatives(
        routes: List[RouteOption],
        bridges: Dict[str, Bridge],
        traffic_congestion_pct: float,
        rainfall_mm_hr: float,
        mission_deadline_min: int = 45,
    ) -> List[Dict[str, Any]]:
        """
        Ranks candidate routes deterministically based on ETA, feasibility, and safety margins.
        """
        evaluated = []
        for r in routes:
            acc = AccessibilityEngine.calculate_corridor_accessibility(
                r, bridges, traffic_congestion_pct, rainfall_mm_hr
            )
            meets_deadline = acc["current_eta_min"] <= mission_deadline_min and acc["operational"]
            
            # Composite score: lower is better (ETA + risk penalty)
            penalty = 0 if acc["operational"] else 5000
            composite_score = acc["current_eta_min"] + penalty
            
            evaluated.append({
                **acc,
                "distance_km": r.distance_km,
                "label": r.label,
                "corridor_desc": r.corridor_desc,
                "meets_deadline": meets_deadline,
                "composite_rank_score": composite_score,
            })

        evaluated.sort(key=lambda x: x["composite_rank_score"])
        return evaluated
