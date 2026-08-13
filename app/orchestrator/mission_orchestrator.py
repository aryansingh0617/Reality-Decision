"""Mission Orchestrator — adaptive reasoning loop."""

from __future__ import annotations

from enum import Enum

from agents.decision_agent import DecisionAgent
from agents.dependency_agent import DependencyAgent
from agents.evidence_agent import EvidenceAgent
from agents.simulation_agent import SimulationAgent
from agents.verification_agent import VerificationAgent
from core.dependencies.dependency_graph import DependencyGraph
from core.evidence.conflict_engine import ConflictEngine
from core.evidence.evidence_store import EvidenceStore
from core.risk.risk_engine import RiskEngine
from core.state.entity_status import EntityStatus
from core.state.reality_state import EntityFact, MissionPolicy, RealityState, Weather


class OrchestratorAction(str, Enum):
    INGEST_EVIDENCE = "INGEST_EEvidence"
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
    """

    def __init__(self, state: RealityState, graph: DependencyGraph, store: EvidenceStore) -> None:
        self.state = state
        self.graph = graph
        self.store = store
        self.evidence_agent = EvidenceAgent(store)
        self._policy_change_reason = ""
        self._processed_event_ids: set[str] = set()

    def log(self, actor: str, message: str) -> None:
        self.state.log_activity(actor, message)

    def process_events(self, events: list[dict]) -> RealityState:
        if not events:
            return self.run_full_cycle()

        new_events = [e for e in events if e.get("id") not in self._processed_event_ids]
        if not new_events:
            return self.state

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
        """Map validated evidence to entity status — orchestrator applies, not LLM."""
        if item.entity == "bridge_07":
            if item.event in ("access_restriction", "collapse", "blocked") or item.status in ("unknown", "restricted"):
                self._apply_entity_status("bridge_07", EntityStatus.UNCERTAIN, item.raw_text or item.event)
            elif item.event == "operational" and item.status == "operational":
                self.state.entities["bridge_07"] = EntityFact(
                    entity_id="bridge_07", attribute="access", value="operational",
                    status=EntityStatus.CONFLICTING if ConflictEngine.has_conflict(self.store, "bridge_07") else EntityStatus.KNOWN,
                    source=item.source, timestamp=self.state.now(),
                )

    def _apply_entity_status(self, entity: str, status: EntityStatus, reason: str) -> None:
        if entity == "bridge_07":
            if status in (EntityStatus.UNAVAILABLE, EntityStatus.CONFLICTING, EntityStatus.UNCERTAIN, EntityStatus.UNKNOWN):
                cascade = DependencyAgent.propagate(self.state, self.graph, entity, status)
                DependencyAgent.apply_cascade(self.state, cascade)
                self.log("DEPENDENCY AGENT", f"{cascade['total_affected']} downstream assets affected")
                self.state.last_state_change = f"{entity} → {status.value}: {reason}"
        elif entity == "vehicle_12" and entity in self.state.vehicles:
            self.state.vehicles[entity].available = status != EntityStatus.UNAVAILABLE
            self.state.vehicles[entity].status = status
            if not self.state.vehicles[entity].available:
                DependencyAgent.propagate(self.state, self.graph, entity, status)
                self.log("DEPENDENCY AGENT", "Vehicle 12 unavailable — route assignment affected")
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
        conflicts = ConflictEngine.detect_conflicts(self.store)
        self.state.conflicts = [
            {
                "entity": c.entity,
                "sources": c.sources,
                "claims": c.claims,
                "impact": c.decision_impact,
                "action": c.recommended_action,
            }
            for c in conflicts
        ]

        if conflicts:
            self.log("ORCHESTRATOR", "Conflicting evidence detected")
            for c in conflicts:
                if c.entity not in self.state.unknowns:
                    self.state.unknowns.append(c.entity)
                self.state.entities[c.entity] = EntityFact(
                    entity_id=c.entity,
                    attribute="access",
                    value="conflicting",
                    status=EntityStatus.CONFLICTING,
                    source="conflict_engine",
                    timestamp=self.state.now(),
                )

        ranked = VerificationAgent.rank_unknowns(self.state, self.store, self.graph)
        if ranked:
            top = ranked[0]
            self.log("VERIFICATION AGENT", f"{top.entity} = highest-value unknown (score {top.priority_score})")

        feasible, verify_msg = VerificationAgent.verification_feasible(self.state)
        if not feasible:
            self.log("RISK ENGINE", "Decision window < verification latency")
            verification_note = verify_msg
        elif ranked and ranked[0].recommendation == "VERIFY":
            verification_note = f"Recommend verify {ranked[0].entity} (~{ranked[0].verification_time_min:.0f} min)"
        else:
            verification_note = "Not recommended — verification exceeds decision window" if not feasible else "Verification optional"

        risk = RiskEngine.assess(self.state)
        packet = DecisionAgent.generate_packet(self.state, risk, verification_note, self._policy_change_reason)
        self._policy_change_reason = ""

        sim_report = SimulationAgent.stress_test(self.state, packet)
        packet.simulation_summary = {
            "best_case": sim_report.best_case.recommendation,
            "worst_case": sim_report.worst_case.recommendation,
            "worst_delay": sim_report.worst_case.delay_min,
        }

        self.log("DECISION AGENT", f"Recommending {packet.recommendation}")
        self.log("SIMULATION AGENT", f"Worst-case delay: {sim_report.worst_case.delay_min} min")
        self.log("DECISION PACKET", "Ready for human authorization")

        self.state.current_packet = packet
        self.state.replan_count += 1
        self.state.log_audit("DECISION_COMPUTED", "ORCHESTRATOR", packet.recommendation, policy=packet.policy.value)
        return self.state

    def authorize(self, action: str = "AUTHORIZE") -> RealityState:
        packet = self.state.current_packet
        if not packet:
            return self.state
        now = self.state.now()
        if action == "AUTHORIZE":
            packet.authorization_status = "AUTHORIZED"
            packet.human_authorized_at = now
            self.log("HUMAN COMMANDER", f"AUTHORIZED: {packet.recommendation}")
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
