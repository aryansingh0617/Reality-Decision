"""Value of Information (VoI) Active Sensing Engine — Interpretable Expected Value of Information for PRAVAH."""

from __future__ import annotations
import logging
from dataclasses import dataclass
from typing import Any, Dict, List
from core.state.reality_state import RealityState, EntityStatus
from core.evidence.evidence_store import EvidenceStore
from core.evidence.conflict_engine import ConflictEngine
from core.dependencies.dependency_graph import DependencyGraph

logger = logging.getLogger("pravah.voi")


@dataclass
class VoIAction:
    action_type: str  # RECON_DRONE | FIELD_SCOUT | SATELLITE_REFRESH | SENSOR_QUERY
    entity_id: str
    target_name: str
    voi_score: float  # Normalized 0.0 to 10.0
    net_voi: float  # Expected Loss Reduction - Verification Cost
    expected_loss_reduction: float
    verification_cost: float
    uncertainty_level: float  # 0.0 to 1.0
    decision_impact: float  # 0.0 to 10.0
    acquisition_latency_min: float
    recommendation_reason: str
    investigate_recommended: bool  # True if Net VoI > 0


class VoIEngine:
    """Calculates interpretable Value of Information (VoI) to decide whether to investigate or proceed."""

    @classmethod
    def calculate_voi_rankings(
        cls,
        state: RealityState,
        store: EvidenceStore,
        graph: DependencyGraph,
        max_items: int = 3,
    ) -> List[VoIAction]:
        """
        Computes interpretable VoI based on Expected Loss Reduction vs Verification Cost.
        Expected Loss = P(Failure | Uncertainty) * Mission Impact (Scale: 0-100)
        Verification Cost = (Delay Min * 1.5) + Asset Cost (Scale: 0-100)
        Net VoI = Expected Loss Reduction - Verification Cost
        """
        results: List[VoIAction] = []

        # 1. Check Bridge B-07 conflict / uncertainty
        b07_status = state.get_entity_status("bridge_b07")
        has_b07_conflict = ConflictEngine.has_conflict(store, "bridge_b07")

        if has_b07_conflict or b07_status in (EntityStatus.UNCERTAIN, EntityStatus.CONFLICTING, EntityStatus.UNKNOWN):
            p_failure = 0.85 if has_b07_conflict else 0.65
            mission_impact = 90.0  # Stranding a convoy in flood kill zone is catastrophic
            expected_loss_reduction = round(p_failure * mission_impact, 1)  # ~76.5
            
            drone_delay_min = 4.0  # 4 minutes drone sortie
            asset_cost = 10.0
            verification_cost = round((drone_delay_min * 2.0) + asset_cost, 1)  # 18.0
            net_voi = round(expected_loss_reduction - verification_cost, 1)  # +58.5
            normalized_score = round(min(10.0, max(0.0, net_voi / 10.0)), 2)

            results.append(
                VoIAction(
                    action_type="RECON_DRONE",
                    entity_id="bridge_b07",
                    target_name="Saraighat Bridge B-07 Clearance & Inundation",
                    voi_score=normalized_score,
                    net_voi=net_voi,
                    expected_loss_reduction=expected_loss_reduction,
                    verification_cost=verification_cost,
                    uncertainty_level=p_failure,
                    decision_impact=9.0,
                    acquisition_latency_min=drone_delay_min,
                    recommendation_reason=(
                        f"INVESTIGATE (Net VoI +{net_voi}): Expected loss reduction ({expected_loss_reduction}) "
                        f"outweighs verification cost ({verification_cost}). Deploy Recon Drone to verify Bridge B-07 before committing convoy."
                    ),
                    investigate_recommended=net_voi > 0,
                )
            )

        # 2. Check Route R-14 detour state
        r14_status = state.routes.get("route_r14")
        if r14_status and (not r14_status.operational or r14_status.status == EntityStatus.UNCERTAIN):
            p_failure = 0.60
            mission_impact = 60.0
            expected_loss_reduction = round(p_failure * mission_impact, 1)  # 36.0
            scout_delay_min = 8.0
            verification_cost = round((scout_delay_min * 2.5) + 5.0, 1)  # 25.0
            net_voi = round(expected_loss_reduction - verification_cost, 1)  # +11.0
            normalized_score = round(min(10.0, max(0.0, net_voi / 10.0)), 2)

            results.append(
                VoIAction(
                    action_type="FIELD_SCOUT",
                    entity_id="route_r14",
                    target_name="NH-6 South Bypass Hillside Stability",
                    voi_score=normalized_score,
                    net_voi=net_voi,
                    expected_loss_reduction=expected_loss_reduction,
                    verification_cost=verification_cost,
                    uncertainty_level=p_failure,
                    decision_impact=6.0,
                    acquisition_latency_min=scout_delay_min,
                    recommendation_reason=(
                        f"INVESTIGATE (Net VoI +{net_voi}): Scout verification delay ({scout_delay_min}m) is justified to confirm NH-6 bypass clearance."
                    ),
                    investigate_recommended=net_voi > 0,
                )
            )

        results.sort(key=lambda x: x.net_voi, reverse=True)
        return results[:max_items]
