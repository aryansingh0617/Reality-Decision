"""Verification Agent — information value and verification feasibility."""

from __future__ import annotations

from dataclasses import dataclass

from core.dependencies.dependency_graph import DependencyGraph
from core.evidence.evidence_store import EvidenceStore
from core.state.entity_status import EntityStatus
from core.state.reality_state import RealityState


@dataclass
class UnknownPriority:
    entity: str
    description: str
    decision_impact: float  # 0-1
    uncertainty: float  # 0-1
    time_criticality: float  # 0-1
    downstream_count: int
    verification_time_min: float
    priority_score: float
    recommendation: str  # VERIFY or PROCEED_UNDER_UNCERTAINTY


class VerificationAgent:
    """
    INPUT: unknowns, conflicts, decision window, verification latency
    PROCESS: priority = impact × uncertainty × time_criticality / verification_cost
    OUTPUT: ranked unknowns + verify/proceed recommendation
    """

    IMPACT_MAP = {
        "bridge_07": 0.95,
        "route_alpha": 0.85,
        "vehicle_12": 0.7,
        "gps_network": 0.6,
        "shelter_a": 0.5,
    }

    @classmethod
    def rank_unknowns(
        cls,
        state: RealityState,
        store: EvidenceStore,
        graph: DependencyGraph,
        verification_latency_min: float | None = None,
    ) -> list[UnknownPriority]:
        verification_latency_min = verification_latency_min or state.verification_latency_min
        decision_window = state.decision_window_min
        results: list[UnknownPriority] = []

        candidates = set(state.unknowns)
        for entity in state.entities:
            if state.get_entity_status(entity) in (EntityStatus.UNKNOWN, EntityStatus.CONFLICTING, EntityStatus.UNCERTAIN):
                candidates.add(entity)
        for item in store.items:
            if item.status in ("unknown", "conflicting", "uncertain"):
                candidates.add(item.entity)

        for entity in candidates:
            impact = cls.IMPACT_MAP.get(entity, 0.5)
            downstream = len(graph.get_downstream(entity))
            uncertainty = 1.0 if state.get_entity_status(entity) == EntityStatus.CONFLICTING else 0.7
            time_crit = min(1.0, 1.0 - (decision_window / 30.0))
            base_score = impact * uncertainty * time_crit
            if verification_latency_min > 0:
                priority_score = base_score * (1 + downstream * 0.1) / (verification_latency_min / 5.0)
            else:
                priority_score = base_score * (1 + downstream * 0.1)

            if verification_latency_min > decision_window:
                recommendation = "PROCEED_UNDER_UNCERTAINTY"
            elif priority_score > 0.4:
                recommendation = "VERIFY"
            else:
                recommendation = "PROCEED_UNDER_UNCERTAINTY"

            results.append(
                UnknownPriority(
                    entity=entity,
                    description=f"{entity} status unresolved",
                    decision_impact=impact,
                    uncertainty=uncertainty,
                    time_criticality=time_crit,
                    downstream_count=downstream,
                    verification_time_min=verification_latency_min,
                    priority_score=round(priority_score, 3),
                    recommendation=recommendation,
                )
            )

        results.sort(key=lambda x: x.priority_score, reverse=True)
        return results

    @classmethod
    def top_unknown(cls, ranked: list[UnknownPriority]) -> UnknownPriority | None:
        return ranked[0] if ranked else None

    @classmethod
    def verification_feasible(cls, state: RealityState) -> tuple[bool, str]:
        if state.verification_latency_min > state.decision_window_min:
            return False, (
                f"Verification ({state.verification_latency_min:.0f} min) exceeds "
                f"decision window ({state.decision_window_min} min) — proceed under uncertainty"
            )
        return True, "Verification feasible within decision window"
