"""Explicit dependency graph for cascade propagation."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class DependencyNode:
    id: str
    node_type: str  # bridge, route, hospital, vehicle, shelter
    label: str
    depends_on: list[str] = field(default_factory=list)
    impacts: list[str] = field(default_factory=list)  # downstream nodes


class DependencyGraph:
    """Directed graph — changes propagate downstream deterministically."""

    def __init__(self) -> None:
        self.nodes: dict[str, DependencyNode] = {}

    def add_node(self, node: DependencyNode) -> None:
        self.nodes[node.id] = node

    def get_downstream(self, node_id: str) -> list[str]:
        """BFS downstream impact."""
        visited: set[str] = set()
        queue = list(self.nodes.get(node_id, DependencyNode(node_id, "", "")).impacts)
        result: list[str] = []
        while queue:
            nid = queue.pop(0)
            if nid in visited:
                continue
            visited.add(nid)
            result.append(nid)
            node = self.nodes.get(nid)
            if node:
                queue.extend(node.impacts)
        return result

    def get_direct_impacts(self, node_id: str) -> list[str]:
        node = self.nodes.get(node_id)
        return list(node.impacts) if node else []

    def affected_routes_for(self, entity_id: str) -> list[str]:
        downstream = self.get_downstream(entity_id)
        return [n for n in downstream if self.nodes.get(n) and self.nodes[n].node_type == "route"]

    def cascade_summary(self, failed_node: str) -> dict:
        direct = self.get_direct_impacts(failed_node)
        downstream = self.get_downstream(failed_node)
        return {
            "source": failed_node,
            "direct_impacts": direct,
            "downstream_impacts": [n for n in downstream if n not in direct],
            "total_affected": len(downstream),
        }


def build_default_graph() -> DependencyGraph:
    g = DependencyGraph()
    g.add_node(DependencyNode("bridge_07", "bridge", "Bridge 07", impacts=["route_alpha", "hospital_north_access"]))
    g.add_node(DependencyNode("route_alpha", "route", "Route Alpha", depends_on=["bridge_07"], impacts=["hospital_north"]))
    g.add_node(DependencyNode("route_bravo", "route", "Route Bravo", depends_on=["shelter_a", "shelter_b"], impacts=["hospital_north"]))
    g.add_node(DependencyNode("route_charlie", "route", "Route Charlie", depends_on=["bridge_07"], impacts=["hospital_north"]))
    g.add_node(DependencyNode("vehicle_12", "vehicle", "Vehicle 12", impacts=["route_bravo"]))
    g.add_node(DependencyNode("hospital_north", "hospital", "Hospital North", depends_on=["route_alpha", "route_bravo"]))
    g.add_node(DependencyNode("hospital_north_access", "access", "Hospital Access", depends_on=["bridge_07"], impacts=["hospital_north"]))
    g.add_node(DependencyNode("shelter_a", "shelter", "Riverside Shelter", impacts=["route_bravo"]))
    g.add_node(DependencyNode("shelter_b", "shelter", "Eastside Triage", impacts=["route_bravo"]))
    g.add_node(DependencyNode("gps_network", "telemetry", "GPS Network", impacts=["route_alpha", "route_bravo", "route_charlie"]))
    return g
