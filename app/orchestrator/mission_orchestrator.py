"""Mission Orchestrator — adaptive reasoning loop with Continuous Sentinel and Escalation Agent."""

from __future__ import annotations
import os
import json
import time
from enum import Enum

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
from core.state.entity_status import EntityStatus
from core.state.reality_state import EntityFact, MissionPolicy, RealityState, Weather


class OrchestratorAction(str, Enum):
    INGEST_EVIDENCE = "INGEST_EVIDENCE"
    VERIFY = "VERIFY"
    PROPAGATE = "PROPAGATE"
    ASSESS_RISK = "ASSESS_RISK"
    DECIDE = "DECIDE"
    SIMULATE = "SIMULATE"
    REPLAN = "REPLAN"
    EMIT_PACKET = "EMIT_PACKET"


class MissionOrchestrator:
    """
    STATE → ASSESS → DETERMINE REQUIRED REASONING → ACT → REASSESS
    Integrates Continuous Sentinel & Escalation Agent.
    """

    def __init__(self, state: RealityState, graph: DependencyGraph, store: EvidenceStore) -> None:
        self.state = state
        self.graph = graph
        self.store = store
        self.evidence_agent = EvidenceAgent(store)
        self._policy_change_reason = ""
        self._processed_event_ids: set[str] = set()
        self.sentinel_status = "MONITORING"  # MONITORING | PLAN_AT_RISK | REPLANNING

    def log(self, actor: str, message: str) -> None:
        self.state.log_activity(actor, message)

    def process_events(self, events: list[dict]) -> RealityState:
        if not events:
            return self.run_full_cycle()

        new_events = [e for e in events if e.get("id") not in self._processed_event_ids]
        if not new_events:
            return self.state

        # Continuous Sentinel check: Was an authorized plan invalidated?
        if self.state.current_packet and self.state.current_packet.authorization_status == "AUTHORIZED":
            self.sentinel_status = "PLAN_AT_RISK"
            self.log("CONTINUOUS SENTINEL", "⚠ AUTHORIZED PLAN AT RISK: Post-authorization event detected! Restarting autonomous replanning cycle...")
            self.state.log_audit("SENTINEL_TRIGGERED", "CONTINUOUS SENTINEL", "Post-authorization reality change invalidated current plan")

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
        elif etype == "entity_status":
            self._apply_entity_status(event["entity"], EntityStatus(event["status"]), event.get("reason", ""))

    def _apply_evidence_impact(self, item) -> None:
        """Map validated evidence to entity status."""
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
                self.state.last_state_change = f"{entity} → {status.value}: {reason}"
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
        """Execute the real autonomous agent loop using the AutonomousPlannerAgent."""
        from agents.autonomous_agent import AutonomousPlannerAgent
        self.planner_agent = AutonomousPlannerAgent(self.state, self.store, self.graph)
        for step in self.planner_agent.run_agent_loop_generator():
            yield step

    def authorize(self, action: str = "AUTHORIZE") -> RealityState:
        packet = self.state.current_packet
        if not packet:
            return self.state
        now = self.state.now()
        if action == "AUTHORIZE":
            packet.authorization_status = "AUTHORIZED"
            packet.human_authorized_at = now
            self.sentinel_status = "MONITORING"
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
        self.log("ORCHESTRATOR", "All evacuation vehicles unavailable — capacity gap")
        return self.run_full_cycle()

    def run_autonomous_loop_generator(self):
        """Execute the complete closed-loop autonomous demo across all scenario phases with real tool receipts."""
        from simulation.scenarios.when_reality_breaks import DEMO_EVENTS
        from core.tools.tool_registry import GLOBAL_TOOL_REGISTRY
        
        # Phase 1: Initial World Observation & Base Decision
        self.log("ORCHESTRATOR", "AUTONOMOUS MISSION STARTED — Phase 1: Initial World Observation")
        for step in self.run_agent_pipeline_generator():
            yield step
        
        # Real Simulated Action 1
        t_res = GLOBAL_TOOL_REGISTRY.execute("simulate_action", self.state, self.store, self.graph, {"action_type": "DISPATCH", "detail": "Rescue Truck V-02 dispatched on Route R-12"})
        self.state.last_state_change = "V-02 Dispatched on Route R-12 (Fast Corridor)"
        self.state.log_audit("SIMULATED_ACTION", "AUTONOMOUS_PLANNER", "Rescue Truck V-02 dispatched on Route R-12")
        yield {"step": "synthetic_execution", "phase": 1, "detail": "Rescue Truck V-02 dispatched on Route R-12"}
        time.sleep(1.0)

        # Phase 2: Event 1 - Bridge B-07 Fails
        self.log("ORCHESTRATOR", "AUTONOMOUS SCENARIO — Event 1: Bridge B-07 Failure Introduced")
        self.process_events([DEMO_EVENTS["bridge_fails"]])
        for step in self.run_agent_pipeline_generator():
            yield step
            
        # Real Simulated Action 2
        t_res = GLOBAL_TOOL_REGISTRY.execute("simulate_action", self.state, self.store, self.graph, {"action_type": "REROUTE", "detail": "Rescue Truck V-02 rerouted to R-14 via Depot D-04"})
        self.state.last_state_change = "V-02 Rerouted via Route R-14 (Safe Bypass Detour)"
        self.state.log_audit("SIMULATED_ACTION", "AUTONOMOUS_PLANNER", "Rescue Truck V-02 rerouted to R-14 via Depot D-04")
        yield {"step": "synthetic_execution", "phase": 2, "detail": "Rescue Truck V-02 rerouted to Route R-14"}
        time.sleep(1.0)

        # Phase 3: Event 2 - Satellite Contradiction
        self.log("ORCHESTRATOR", "AUTONOMOUS SCENARIO — Event 2: Satellite Contradiction Introduced")
        self.process_events([DEMO_EVENTS["bridge_conflict"]])
        for step in self.run_agent_pipeline_generator():
            yield step
            
        # Real Simulated Action 3
        t_res = GLOBAL_TOOL_REGISTRY.execute("simulate_action", self.state, self.store, self.graph, {"action_type": "RECON_DRONE", "detail": "Drone reconnaissance dispatched to verify Bridge B-07"})
        self.state.log_audit("SIMULATED_ACTION", "AUTONOMOUS_PLANNER", "Drone reconnaissance dispatched for Bridge B-07")
        yield {"step": "synthetic_execution", "phase": 3, "detail": "Drone Reconnaissance Dispatched"}
        time.sleep(1.0)

        # Phase 4: Event 3 - Vehicle Loss / Capacity Gap & Replan
        self.log("ORCHESTRATOR", "AUTONOMOUS SCENARIO — Event 3: Rescue Truck V-02 Flooded (Capacity Gap)")
        self.process_events([DEMO_EVENTS["vehicle_lost"]])
        for step in self.run_agent_pipeline_generator():
            yield step
            
        # Real Simulated Action 4
        t_res = GLOBAL_TOOL_REGISTRY.execute("simulate_action", self.state, self.store, self.graph, {"action_type": "AIRLIFT_REQUEST", "detail": "External State Airlift Escalation Request Issued"})
        self.state.log_audit("SIMULATED_ACTION", "AUTONOMOUS_PLANNER", "External Airlift Escalation Request Issued")
        yield {"step": "synthetic_execution", "phase": 4, "detail": "External Airlift Escalation Requested"}

