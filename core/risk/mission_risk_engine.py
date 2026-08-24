"""Explainable Multi-Factor Risk & Mission Impact Propagation Engine for PRAVAH."""

from __future__ import annotations
import logging
from typing import Any, Dict, List, Optional, Tuple

from core.state.ner_world_model import RouteOption, Bridge, Mission, Facility

logger = logging.getLogger("pravah.risk_engine")


class MissionRiskEngine:
    """Calculates explainable corridor risk scores and propagates operational impacts to logistics missions."""

    # Explicit Normalized Weights (Sum = 1.00)
    W_RAINFALL = 0.25
    W_LANDSLIDE = 0.25
    W_CONGESTION = 0.15
    W_INFRASTRUCTURE = 0.20
    W_INCIDENT = 0.15

    @staticmethod
    def calculate_corridor_risk_score(
        rainfall_mm_hr: float,
        slope_landslide_factor: float,  # 0.0 to 1.0
        traffic_congestion_pct: float,  # 0.0 to 100.0%
        bridge_water_depth_m: float,
        bridge_critical_threshold_m: float = 0.50,
        active_field_incident_severity: float = 0.0,  # 0.0 to 1.0
    ) -> Dict[str, Any]:
        """
        Calculates explainable risk score (0 to 100) with full breakdown of contributing factors.
        """
        # 1. Normalized factor calculations (0.0 to 1.0)
        f_rain = min(1.0, rainfall_mm_hr / 30.0)
        f_landslide = min(1.0, max(0.0, slope_landslide_factor))
        f_congestion = min(1.0, traffic_congestion_pct / 100.0)
        f_infra = min(1.0, bridge_water_depth_m / bridge_critical_threshold_m) if bridge_critical_threshold_m > 0 else 0.0
        f_incident = min(1.0, max(0.0, active_field_incident_severity))

        # 2. Weighted formula calculation
        weighted_sum = (
            MissionRiskEngine.W_RAINFALL * f_rain
            + MissionRiskEngine.W_LANDSLIDE * f_landslide
            + MissionRiskEngine.W_CONGESTION * f_congestion
            + MissionRiskEngine.W_INFRASTRUCTURE * f_infra
            + MissionRiskEngine.W_INCIDENT * f_incident
        )

        numeric_score = round(weighted_sum * 100.0, 1)

        # 3. Categorical Risk Classification
        if numeric_score >= 75.0 or bridge_water_depth_m >= bridge_critical_threshold_m:
            risk_level = "CRITICAL"
        elif numeric_score >= 50.0:
            risk_level = "HIGH"
        elif numeric_score >= 25.0:
            risk_level = "MODERATE"
        else:
            risk_level = "LOW"

        # 4. Explanatory contribution breakdown (Percentages of total risk)
        contributing_factors = [
            {"factor": "Precipitation & Flash-Flood Runoff", "raw_value": f"{rainfall_mm_hr} mm/hr", "score_contrib": round(MissionRiskEngine.W_RAINFALL * f_rain * 100, 1), "pct_of_total": round((MissionRiskEngine.W_RAINFALL * f_rain / (weighted_sum or 1e-6)) * 100, 1)},
            {"factor": "Terrain Slope & Hillside Debris Susceptibility", "raw_value": f"{round(slope_landslide_factor * 100)}%", "score_contrib": round(MissionRiskEngine.W_LANDSLIDE * f_landslide * 100, 1), "pct_of_total": round((MissionRiskEngine.W_LANDSLIDE * f_landslide / (weighted_sum or 1e-6)) * 100, 1)},
            {"factor": "Traffic Gridlock & Arterial Congestion", "raw_value": f"{traffic_congestion_pct}%", "score_contrib": round(MissionRiskEngine.W_CONGESTION * f_congestion * 100, 1), "pct_of_total": round((MissionRiskEngine.W_CONGESTION * f_congestion / (weighted_sum or 1e-6)) * 100, 1)},
            {"factor": "Bridge Submergence & Hydraulic Scour", "raw_value": f"{bridge_water_depth_m}m / {bridge_critical_threshold_m}m", "score_contrib": round(MissionRiskEngine.W_INFRASTRUCTURE * f_infra * 100, 1), "pct_of_total": round((MissionRiskEngine.W_INFRASTRUCTURE * f_infra / (weighted_sum or 1e-6)) * 100, 1)},
            {"factor": "Field Scout Incident Severity", "raw_value": f"{round(active_field_incident_severity * 100)}%", "score_contrib": round(MissionRiskEngine.W_INCIDENT * f_incident * 100, 1), "pct_of_total": round((MissionRiskEngine.W_INCIDENT * f_incident / (weighted_sum or 1e-6)) * 100, 1)},
        ]

        return {
            "risk_score": numeric_score,
            "risk_level": risk_level,
            "formula": "0.25*Rain + 0.25*Landslide + 0.15*Congestion + 0.20*Infra + 0.15*Incident",
            "contributing_factors": contributing_factors,
            "primary_driver": max(contributing_factors, key=lambda x: x["score_contrib"])["factor"],
        }

    @staticmethod
    def assess_mission_risk_and_impact(
        mission: Mission,
        active_route: RouteOption,
        accessibility: Dict[str, Any],
        facility: Facility,
    ) -> Dict[str, Any]:
        """
        Assesses mission vulnerability and builds the operational causal impact chain.
        """
        current_eta = accessibility.get("current_eta_min", 999)
        deadline = mission.deadline_minutes
        delay = accessibility.get("estimated_delay_min", 0)
        is_operational = accessibility.get("operational", False)

        if not is_operational or current_eta > deadline:
            mission_risk_level = "CRITICAL"
            mission_status = "AT_RISK"
            impact_severity = "HIGH_PATIENT_RISK"
            narrative = (
                f"Mission {mission.id} ({mission.commodity}) is threatened. "
                f"Current route {active_route.name} ETA ({current_eta} min) breaches emergency deadline ({deadline} min). "
                f"Downstream hospital {facility.name} faces stock depletion within {facility.stock_hours_remaining} hours."
            )
        elif current_eta >= (deadline - 10):
            mission_risk_level = "HIGH"
            mission_status = "AT_RISK"
            impact_severity = "MODERATE_WARNING"
            narrative = (
                f"Mission {mission.id} is operating on slim safety margin ({deadline - current_eta} min remaining). "
                f"Any additional delay on {active_route.name} will trigger critical failure."
            )
        else:
            mission_risk_level = "LOW"
            mission_status = "ON_SCHEDULE"
            impact_severity = "NOMINAL"
            narrative = f"Mission {mission.id} is proceeding on schedule via {active_route.name} (ETA: {current_eta} min)."

        # Causal Impact Chain
        causal_chain = [
            {"step": 1, "entity_type": "INFRASTRUCTURE", "name": active_route.name, "status": "COMPROMISED" if not is_operational else "DEGRADED", "detail": accessibility.get("blocking_reasons", ["Congestion & Weather Friction"])[0] if not is_operational else "Congestion & Weather Delay"},
            {"step": 2, "entity_type": "ROUTE_ACCESSIBILITY", "name": f"{active_route.label}", "status": f"ETA: {current_eta}m (+{delay}m delay)", "detail": f"Baseline {mission.baseline_eta_minutes}m -> Current {current_eta}m"},
            {"step": 3, "entity_type": "LOGISTICS_MISSION", "name": f"Mission {mission.id}", "status": mission_status, "detail": f"Deadline: {deadline}m (Deficit: {current_eta - deadline}m)" if current_eta > deadline else f"Deadline: {deadline}m"},
            {"step": 4, "entity_type": "FACILITY_IMPACT", "name": facility.name, "status": "SUPPLY_THREATENED" if mission_status == "AT_RISK" else "STABLE", "detail": f"Critical Commodity: {mission.commodity} (Stock: {facility.stock_hours_remaining}h)"},
        ]

        return {
            "mission_id": mission.id,
            "mission_name": mission.name,
            "commodity": mission.commodity,
            "mission_status": mission_status,
            "mission_risk_level": mission_risk_level,
            "deadline_minutes": deadline,
            "current_eta_minutes": current_eta,
            "estimated_delay_minutes": delay,
            "impact_severity": impact_severity,
            "impact_narrative": narrative,
            "causal_chain": causal_chain,
        }
