"""W3C PROV Provenance Graph Exporter — Exports decision evidence traces as standard W3C PROV JSON-LD graph."""

from __future__ import annotations
import json
from datetime import datetime
from typing import Any, Dict, List, Optional
from core.state.reality_state import DecisionPacket, RealityState


class W3CProvExporter:
    """Serializes DecisionPackets and ReAct execution records to W3C PROV-O JSON-LD format."""

    @staticmethod
    def export_w3c_prov_jsonld(
        packet: Optional[DecisionPacket],
        state: RealityState,
        execution_records: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Builds standard W3C PROV JSON-LD graph containing entities, activities, agents, and relations.
        """
        exec_records = execution_records or []
        doc_id = packet.decision_id if packet else "prov_doc_001"

        graph_nodes: List[Dict[str, Any]] = []

        # 1. Agents
        graph_nodes.append({
            "@id": "agent:AutonomousPlannerAgent",
            "@type": ["prov:Agent", "prov:SoftwareAgent"],
            "rdfs:label": "REALITY//DECISION Autonomous ReAct Orchestrator",
            "prov:type": "AgenticReasoningEngine",
        })
        graph_nodes.append({
            "@id": "agent:IncidentCommander",
            "@type": ["prov:Agent", "prov:Person"],
            "rdfs:label": "Human Incident Commander",
            "prov:type": "AuthorizationAuthority",
        })

        # 2. Reality State Entity
        state_entity_id = f"entity:WorldState_v{state.world_state_version}"
        graph_nodes.append({
            "@id": state_entity_id,
            "@type": "prov:Entity",
            "rdfs:label": f"Reality Operational State v{state.world_state_version}",
            "reality:water_depth_m": state.current_water_depth,
            "reality:water_rise_rate_m_hr": state.water_rise_rate,
            "reality:last_change": state.last_state_change or "Baseline operational state",
        })

        # 3. Decision Packet Entity
        if packet:
            packet_entity_id = f"entity:DecisionPacket_{packet.decision_id}"
            graph_nodes.append({
                "@id": packet_entity_id,
                "@type": "prov:Entity",
                "rdfs:label": f"DecisionPacket: {packet.recommendation}",
                "prov:wasGeneratedBy": f"activity:ReActReasoningLoop_{doc_id}",
                "prov:wasDerivedFrom": state_entity_id,
                "decision:recommendation": packet.recommendation,
                "decision:route_id": packet.route_id,
                "decision:tti_minutes": packet.tti_minutes,
                "decision:fragility": packet.fragility,
                "decision:authorization_status": packet.authorization_status,
                "decision:reasoning_mode": packet.reasoning_mode,
            })

        # 4. Activities (ReAct Execution Records)
        for idx, rec in enumerate(exec_records):
            act_id = f"activity:{rec.get('execution_id', f'exec_{idx}')}"
            graph_nodes.append({
                "@id": act_id,
                "@type": "prov:Activity",
                "rdfs:label": f"Tool Execution: {rec.get('tool', 'unknown')}",
                "prov:wasAssociatedWith": "agent:AutonomousPlannerAgent",
                "prov:used": state_entity_id,
                "tool:name": rec.get("tool"),
                "tool:status": rec.get("status"),
                "tool:latency_ms": rec.get("latency_ms"),
                "tool:turn_index": rec.get("turn_index"),
                "prov:startedAtTime": rec.get("timestamp"),
            })

        return {
            "@context": {
                "prov": "http://www.w3.org/ns/prov#",
                "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
                "reality": "https://reality-decision.ai/schema/reality#",
                "decision": "https://reality-decision.ai/schema/decision#",
                "tool": "https://reality-decision.ai/schema/tool#",
            },
            "@graph": graph_nodes,
            "provenance_metadata": {
                "generated_at": datetime.now().isoformat(),
                "world_state_version": state.world_state_version,
                "total_prov_nodes": len(graph_nodes),
                "compliance": "W3C PROV-O JSON-LD 1.1",
            },
        }
