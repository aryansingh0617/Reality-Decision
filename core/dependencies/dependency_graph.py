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
    g.add_node(DependencyNode("bridge_b07", "bridge", "Bridge B-07", impacts=["route_r12"]))
    g.add_node(DependencyNode("route_r12", "route", "Route R-12", depends_on=["bridge_b07"], impacts=["depot_d03"]))
    g.add_node(DependencyNode("route_r14", "route", "Route R-14", depends_on=[], impacts=["depot_d04"]))
    g.add_node(DependencyNode("depot_d03", "depot", "Depot D-03", depends_on=["route_r12"], impacts=["shelter_s04"]))
    g.add_node(DependencyNode("depot_d04", "depot", "Depot D-04", depends_on=["route_r14"], impacts=["shelter_s04"]))
    g.add_node(DependencyNode("shelter_s04", "shelter", "Shelter S-04", depends_on=["depot_d03", "depot_d04"]))
    g.add_node(DependencyNode("vehicle_v01", "vehicle", "Vehicle V-01", impacts=["route_r12", "route_r14"]))
    g.add_node(DependencyNode("gps_network", "telemetry", "GPS Network", impacts=["route_r12", "route_r14"]))
    return g
