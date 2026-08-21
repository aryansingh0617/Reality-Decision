"""Mission Orchestrator — adaptive ReAct loop with Continuous Sentinel and Versioned Race-Condition Gate."""

from __future__ import annotations
import os
import json
import time
from enum import Enum
from typing import Optional

from agents.decision_agent import DecisionAgent
from agents.dependency_agent import DependencyAgent
from agents.evidence_agent import EvidenceAgent
from agents.simulation_agent import SimulationAgent
from agents.verification_agent import VerificationAgent
from agents.critic_agent import CriticAgent
from agents.escalation_agent import EscalationAgent
from agents.information_agent import InformationValueAgent
from core.dependencies.dependency_graph import DependencyGraph
from core.evidence.conflict_engine import ConflictEngine
from core.evidence.evidence_store import EvidenceStore
from core.risk.risk_engine import RiskEngine
from core.prediction.tti_engine import TTIEngine
from core.state.entity_status import EntityStatus
from core.state.reality_state import EntityFact, MissionPolicy, RealityState, Weather


class MissionOrchestrator:
    """
    Continuous Sentinel & ReAct Control Orchestrator.
    STATE → ASSESS ASSUMPTIONS → REASON → ACT → SENTINEL MONITORING
    """

    def __init__(self, state: RealityState, graph: DependencyGraph, store: EvidenceStore) -> None:
        self.state = state
        self.graph = graph
        self.store = store
        self.evidence_agent = EvidenceAgent(store)
        self._policy_change_reason = ""
        self._processed_event_ids: set[str] = set()
        self.sentinel_status = "MONITORING"

    def log(self, actor: str, message: str) -> None:
        self.state.log_activity(actor, message)

    def process_events(self, events: list[dict]) -> RealityState:
        if not events:
            return self.run_full_cycle()

        new_events = [e for e in events if e.get("id") not in self._processed_event_ids]
        if not new_events:
            return self.state

        # Mutate state version on new event arrival
        event_label = new_events[0].get("label", new_events[0].get("type", "event"))
        self.state.mutate_world_state(f"Reality Event Ingested: {event_label}")

        packet = self.state.current_packet
        if packet:
            auth_status = packet.authorization_status
            if auth_status in ("AUTHORIZED", "PENDING"):
                self.sentinel_status = "PLAN_AT_RISK"
                self.state.life_cycle_state = "PLAN_AT_RISK"
                broken_reason = f"Reality shift detected during '{auth_status}' state: {event_label}"
                self.log("CONTINUOUS SENTINEL", f"⚠ SENTINEL ALERT: {broken_reason}! Assumption '{packet.critical_assumption}' challenged.")
                self.state.log_audit("SENTINEL_TRIGGERED", "CONTINUOUS SENTINEL", broken_reason)

        if len(new_events) > 1:
            labels = [e.get("label", e.get("type", "event")) for e in new_events]
            self.state.multi_event_transition = " + ".join(labels)
            self.log("ORCHESTRATOR", f"Multi-event state transition: {self.state.multi_event_transition}")

        for event in new_events:
            self._processed_event_ids.add(event.get("id", str(id(event))))
            self._handle_single_event(event)

        self.state.multi_event_transition = None
        return self.run_full_cycle()

    def _handle_single_event(self, event: dict) -> None:
        etype = event.get("type", "")
        self.log("ORCHESTRATOR", f"New {event.get('label', etype)} detected")

        if etype == "raw_report":
            items = self.evidence_agent.extract(event["text"], event.get("source", "field_report"), self.state.now())
            for item in items:
                self.store.add(item)
                self._apply_evidence_impact(item)
            self.log("EVIDENCE AGENT", f"Extracted {len(items)} evidence item(s) from report")
        elif etype == "structured_evidence":
            item = self.evidence_agent.ingest_structured(event["data"], event.get("text", ""), self.state.now())
            self._apply_evidence_impact(item)
            self.log("EVIDENCE AGENT", f"Structured evidence: {item.entity} → {item.event}")
        elif etype == "policy_change":
            old = self.state.policy
            self.state.policy = MissionPolicy(event["policy"])
            self._policy_change_reason = (
                f"Recommendation changed because mission policy changed ({old.value} → {self.state.policy.value})"
            )
            self.log("ORCHESTRATOR", self._policy_change_reason)
        elif etype == "verification_config":
            self.state.verification_latency_min = event.get("latency_min", self.state.verification_latency_min)
            self.state.decision_window_min = event.get("window_min", self.state.decision_window_min)
        elif etype == "water_surge":
            self.state.current_water_depth = event.get("water_depth", self.state.current_water_depth + 0.15)
            self.state.water_rise_rate = event.get("rise_rate", self.state.water_rise_rate)
            self.log("HYDROLOGICAL SENSOR", f"Water depth surged to {self.state.current_water_depth}m (Rise rate: {self.state.water_rise_rate}m/hr)")
        elif etype == "entity_status":
            self._apply_entity_status(event["entity"], EntityStatus(event["status"]), event.get("reason", ""))

    def _apply_evidence_impact(self, item) -> None:
        if item.entity == "bridge_b07":
            if item.event in ("access_restriction", "collapse", "blocked") or item.status in ("unknown", "restricted"):
                self._apply_entity_status("bridge_b07", EntityStatus.UNCERTAIN, item.raw_text or item.event)
            elif item.event == "operational" and item.status == "operational":
                self.state.entities["bridge_b07"] = EntityFact(
                    entity_id="bridge_b07", attribute="access", value="operational",
                    status=EntityStatus.CONFLICTING if ConflictEngine.has_conflict(self.store, "bridge_b07") else EntityStatus.KNOWN,
                    source=item.source, timestamp=self.state.now(),
                )

    def _apply_entity_status(self, entity: str, status: EntityStatus, reason: str) -> None:
        if entity == "bridge_b07":
            if status in (EntityStatus.UNAVAILABLE, EntityStatus.CONFLICTING, EntityStatus.UNCERTAIN, EntityStatus.UNKNOWN):
                cascade = DependencyAgent.propagate(self.state, self.graph, entity, status)
                DependencyAgent.apply_cascade(self.state, cascade)
                self.log("DEPENDENCY AGENT", f"{cascade['total_affected']} downstream assets affected")
        elif entity in self.state.vehicles:
            self.state.vehicles[entity].available = status != EntityStatus.UNAVAILABLE
            self.state.vehicles[entity].status = status
            if not self.state.vehicles[entity].available:
                DependencyAgent.propagate(self.state, self.graph, entity, status)
                self.log("DEPENDENCY AGENT", f"Vehicle {entity} unavailable — route assignment affected")
        elif entity == "gps_network":
            self.state.gps_available = status != EntityStatus.UNAVAILABLE
            self.log("DEPENDENCY AGENT", "GPS outage affects route telemetry confidence")
        elif entity.startswith("shelter") and entity in self.state.shelters:
            self.state.shelters[entity].status = status
            cascade = DependencyAgent.propagate(self.state, self.graph, entity, status)
            DependencyAgent.apply_cascade(self.state, cascade)
        elif entity == "weather":
            self.state.weather = Weather(reason) if reason else Weather.FLOOD
            self.log("EVIDENCE AGENT", f"Weather updated to {self.state.weather.value}")

    def run_full_cycle(self) -> RealityState:
        for _ in self.run_agent_pipeline_generator():
            pass
        return self.state

    def run_agent_pipeline_generator(self):
        from agents.autonomous_agent import AutonomousPlannerAgent
        self.planner_agent = AutonomousPlannerAgent(self.state, self.store, self.graph)
        for step in self.planner_agent.run_agent_loop_generator():
            yield step

    def authorize(self, action: str = "AUTHORIZE", target_version: Optional[int] = None) -> RealityState:
        packet = self.state.current_packet
        if not packet:
            return self.state

        # Race Condition Gate: Stale packet rejection
        if target_version is not None and target_version != packet.world_state_version:
            packet.authorization_status = "STALE_REJECTED"
            self.log("SAFETY GATE", f"STALE AUTHORIZATION BLOCKED: Packet version v{packet.world_state_version} != current state v{target_version}")
            self.state.log_audit("STALE_AUTHORIZATION_BLOCKED", "SAFETY_GATE", f"Rejected stale authorization for version v{packet.world_state_version}")
            return self.state

        now = self.state.now()
        if action == "AUTHORIZE":
            packet.authorization_status = "AUTHORIZED"
            packet.human_authorized_at = now
            self.sentinel_status = "MONITORING"
            self.state.life_cycle_state = "AUTHORIZED"
            self.log("HUMAN COMMANDER", f"AUTHORIZED: {packet.recommendation}")
            self.log("CONTINUOUS SENTINEL", "Continuous Sentinel actively monitoring authorized plan for post-authorization reality shifts...")
            self.state.log_audit("HUMAN_AUTHORIZED", "HUMAN_COMMANDER", packet.recommendation)
        elif action == "REJECT":
            packet.authorization_status = "REJECTED"
            self.log("HUMAN COMMANDER", f"REJECTED: {packet.recommendation}")
            self.state.log_audit("HUMAN_REJECTED", "HUMAN_COMMANDER", packet.recommendation)
        elif action == "REQUEST_VERIFY":
            packet.authorization_status = "VERIFY_REQUESTED"
            self.log("HUMAN COMMANDER", "Verification requested before authorization")
            self.state.log_audit("VERIFY_REQUESTED", "HUMAN_COMMANDER", packet.recommendation)
        return self.state

    def set_all_capacity_lost(self) -> RealityState:
        for v in self.state.vehicles.values():
            v.available = False
            v.status = EntityStatus.UNAVAILABLE
        self.state.mutate_world_state("All evacuation vehicles unavailable (Capacity Gap)")
        self.log("ORCHESTRATOR", "All evacuation vehicles unavailable — capacity gap")
        return self.run_full_cycle()
