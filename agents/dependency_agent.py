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
        from agents.llm_client import is_llm_mode_active, call_openai_json
        
        if is_llm_mode_active():
            # Build text representation of graph nodes & connections for LLM context
            nodes_desc = []
            for nid, node in graph.nodes.items():
                nodes_desc.append(f"- {nid} ({node.node_type}) impacts: {', '.join(node.impacts) or 'none'}")
            graph_context = "\n".join(nodes_desc)
            
            system_prompt = (
                "You are a Dependency Propagation Agent for emergency response.\n"
                "Your role is to trace how a status change propagates through a dependency graph.\n"
                "You MUST return a JSON object with this exact structure:\n"
                "{\n"
                "  \"source\": \"string\" (the changed entity ID),\n"
                "  \"new_status\": \"string\" (the new status, e.g. 'UNAVAILABLE'),\n"
                "  \"direct_impacts\": [\"string\"] (directly connected downstream nodes),\n"
                "  \"downstream_impacts\": [\"string\"] (indirectly connected downstream nodes),\n"
                "  \"affected_routes\": [\"string\"] (downstream route entity IDs affected),\n"
                "  \"affected_hospitals\": [\"string\"] (downstream depot/hospital entity IDs affected),\n"
                "  \"total_affected\": int,\n"
                "  \"updates\": [\n"
                "    {\"entity\": \"string\", \"type\": \"route\"|\"hospital\"|\"shelter\", \"impact\": \"string\"}\n"
                "  ]\n"
                "}\n"
                "CRITICAL: Do NOT invent entities. Only propagate to downstream nodes in the graph."
            )
            
            user_prompt = (
                f"Dependency Graph Definitions:\n{graph_context}\n\n"
                f"Trigger Event: Entity '{changed_entity}' changed status to '{new_status.value}'.\n"
                f"Reason about the cascade and output the downstream impacts."
            )
            
            data = call_openai_json(system_prompt, user_prompt)
            if data and "updates" in data:
                return data

        # Fallback deterministic propagation
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
            elif node.node_type in ("hospital", "depot"):
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
