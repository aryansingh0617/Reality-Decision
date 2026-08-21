"""Value of Information (VoI) Active Sensing Engine — Computes mathematical VoI for active evidence verification."""

from __future__ import annotations
import logging
from dataclasses import dataclass
from typing import Any, Dict, List
from core.state.reality_state import RealityState, EntityStatus
from core.evidence.evidence_store import EvidenceStore
from core.evidence.conflict_engine import ConflictEngine
from core.dependencies.dependency_graph import DependencyGraph

logger = logging.getLogger("reality_decision.voi")


@dataclass
class VoIAction:
    action_type: str  # RECON_DRONE | FIELD_SCOUT | SATELLITE_REFRESH | SENSOR_QUERY
    entity_id: str
    target_name: str
    voi_score: float  # 0.0 to 10.0
    uncertainty_level: float  # 0.0 to 1.0
    decision_impact: float  # 0.0 to 10.0
    acquisition_latency_min: float
    cost_score: float
    recommendation_reason: str


class VoIEngine:
    """Calculates mathematical Value of Information (VoI) to drive active verification actions."""

    @classmethod
    def calculate_voi_rankings(
        cls,
        state: RealityState,
        store: EvidenceStore,
        graph: DependencyGraph,
        max_items: int = 3,
    ) -> List[VoIAction]:
        """
        Computes VoI score for operational unknowns & evidence conflicts.
        VoI = (Decision Impact * Uncertainty Level) / (1.0 + (Acquisition Latency / 10.0))
        """
        results: List[VoIAction] = []

        # Check Bridge B-07 conflict / uncertainty
        b07_status = state.get_entity_status("bridge_b07")
        has_b07_conflict = ConflictEngine.has_conflict(store, "bridge_b07")

        if has_b07_conflict or b07_status in (EntityStatus.UNCERTAIN, EntityStatus.CONFLICTING, EntityStatus.UNKNOWN):
            impact = 9.5  # Critical corridor bridge affects Route R-12
            uncertainty = 0.9 if has_b07_conflict else 0.7
            lat = 4.0  # 4-minute drone reconnaissance
            score = round((impact * uncertainty) / (1.0 + (lat / 10.0)), 2)

            results.append(
                VoIAction(
                    action_type="RECON_DRONE",
                    entity_id="bridge_b07",
                    target_name="Bridge B-07 Load Rating & Submergence",
                    voi_score=score,
                    uncertainty_level=uncertainty,
                    decision_impact=impact,
                    acquisition_latency_min=lat,
                    cost_score=1.5,
                    recommendation_reason=f"High VoI ({score}/10): Evidence conflict detected between satellite pass and scout. Dispatch Recon Drone to confirm reachability before committing trucks.",
                )
            )

        # Check Route R-14 detour state
        r14_status = state.routes.get("route_r14")
        if r14_status and (not r14_status.operational or r14_status.status == EntityStatus.UNCERTAIN):
            impact = 8.5
            uncertainty = 0.8
            lat = 8.0  # Field scout verification latency
            score = round((impact * uncertainty) / (1.0 + (lat / 10.0)), 2)

            results.append(
                VoIAction(
                    action_type="FIELD_SCOUT",
                    entity_id="route_r14",
                    target_name="Route R-14 Safe Bypass Detour",
                    voi_score=score,
                    uncertainty_level=uncertainty,
                    decision_impact=impact,
                    acquisition_latency_min=lat,
                    cost_score=2.0,
                    recommendation_reason=f"VoI ({score}/10): Request field scout verification for Route R-14 detour capacity.",
                )
            )

        # Check GPS Network reliability
        if not state.gps_available:
            impact = 7.0
            uncertainty = 0.6
            lat = 2.0
            score = round((impact * uncertainty) / (1.0 + (lat / 10.0)), 2)

            results.append(
                VoIAction(
                    action_type="SENSOR_QUERY",
                    entity_id="gps_network",
                    target_name="GPS Telemetry Repeater Network",
                    voi_score=score,
                    uncertainty_level=uncertainty,
                    decision_impact=impact,
                    acquisition_latency_min=lat,
                    cost_score=1.0,
                    recommendation_reason=f"VoI ({score}/10): Re-poll GPS mesh repeaters to restore telemetry confidence.",
                )
            )

        # Fallback baseline VoI action if no active conflicts exist
        if not results:
            results.append(
                VoIAction(
                    action_type="SATELLITE_REFRESH",
                    entity_id="shelter_s04",
                    target_name="Shelter S-04 Water Elevation Baseline",
                    voi_score=3.2,
                    uncertainty_level=0.2,
                    decision_impact=4.0,
                    acquisition_latency_min=15.0,
                    cost_score=0.5,
                    recommendation_reason="Low VoI (3.2/10): Operational state is stable. Routine satellite pass refresh scheduled.",
                )
            )

        results.sort(key=lambda x: x.voi_score, reverse=True)
        return results[:max_items]
