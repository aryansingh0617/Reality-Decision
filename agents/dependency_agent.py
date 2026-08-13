"""Dependency Agent — cascade propagation through explicit graph."""

from __future__ import annotations

from core.dependencies.dependency_graph import DependencyGraph
from core.state.entity_status import EntityStatus, ConfidenceClass
from core.state.reality_state import RealityState, Route


class DependencyAgent:
    """
    INPUT: state + failed/changed entity
    PROCESS: graph traversal, downstream impact
    OUTPUT: cascade report + state updates (via orchestrator)
    """

    @classmethod
    def propagate(
        cls,
        state: RealityState,
        graph: DependencyGraph,
        changed_entity: str,
        new_status: EntityStatus,
    ) -> dict:
        cascade = graph.cascade_summary(changed_entity)
        affected_routes: list[str] = []
        affected_hospitals: list[str] = []
        updates: list[dict] = []

        for node_id in cascade["downstream_impacts"] + cascade["direct_impacts"]:
            node = graph.nodes.get(node_id)
            if not node:
                continue
            if node.node_type == "route":
                affected_routes.append(node_id)
                updates.append({"entity": node_id, "type": "route", "impact": new_status.value})
            elif node.node_type == "hospital":
                affected_hospitals.append(node_id)
                updates.append({"entity": node_id, "type": "hospital", "impact": "access_reduced"})

        return {
            "source": changed_entity,
            "new_status": new_status.value,
            "direct_impacts": cascade["direct_impacts"],
            "downstream_impacts": cascade["downstream_impacts"],
            "affected_routes": affected_routes,
            "affected_hospitals": affected_hospitals,
            "total_affected": cascade["total_affected"],
            "updates": updates,
        }

    @classmethod
    def apply_cascade(cls, state: RealityState, cascade: dict) -> RealityState:
        source_status = cascade.get("new_status", "UNAVAILABLE")
        for route_id in cascade.get("affected_routes", []):
            if route_id in state.routes:
                route = state.routes[route_id]
                if source_status in ("unavailable", "UNAVAILABLE", "conflicting", "CONFLICTING"):
                    route.operational = False
                    route.status = EntityStatus.UNAVAILABLE if source_status.lower() == "unavailable" else EntityStatus.CONFLICTING
                elif source_status in ("unknown", "UNKNOWN", "uncertain", "UNCERTAIN"):
                    route.status = EntityStatus.UNCERTAIN
                    route.failure_risk = "HIGH"
                route.confidence = ConfidenceClass.LOW

        for hid in cascade.get("affected_hospitals", []):
            if hid in state.hospitals:
                state.hospitals[hid].status = EntityStatus.UNCERTAIN

        return state
