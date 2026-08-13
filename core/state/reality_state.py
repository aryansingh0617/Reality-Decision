"""Central operational reality state — single source of deterministic truth."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any

from core.state.entity_status import ConfidenceClass, EntityStatus, ReliabilityClass


class MissionPolicy(str, Enum):
    SAFE = "SAFE"
    BALANCED = "BALANCED"
    URGENT = "URGENT"


class Weather(str, Enum):
    CLEAR = "Clear"
    RAIN = "Rain"
    FLOOD = "Flood"


@dataclass
class EntityFact:
    entity_id: str
    attribute: str
    value: Any
    status: EntityStatus
    source: str
    timestamp: datetime
    freshness_minutes: float = 0.0
    reliability: ReliabilityClass = ReliabilityClass.MEDIUM
    confidence: ConfidenceClass = ConfidenceClass.MEDIUM
    provenance: str = ""
    assumptions: list[str] = field(default_factory=list)


@dataclass
class Route:
    id: str
    name: str
    label: str
    coords: list
    status: EntityStatus = EntityStatus.KNOWN
    confidence: ConfidenceClass = ConfidenceClass.MEDIUM
    people_capacity: int = 0
    eta_minutes: int = 0
    failure_risk: str = "LOW"  # HIGH / MEDIUM / LOW — not fabricated probability
    depends_on: list[str] = field(default_factory=list)
    operational: bool = True


@dataclass
class Vehicle:
    id: str
    name: str
    capacity: int
    status: EntityStatus = EntityStatus.KNOWN
    available: bool = True
    assigned_route: str | None = None


@dataclass
class Shelter:
    id: str
    name: str
    capacity: int
    occupied: int = 0
    status: EntityStatus = EntityStatus.KNOWN


@dataclass
class Hospital:
    id: str
    name: str
    surge_capacity: int
    current_load: int = 0
    status: EntityStatus = EntityStatus.KNOWN
    access_routes: list[str] = field(default_factory=list)


@dataclass
class AuditRecord:
    timestamp: datetime
    event_type: str
    actor: str  # ORCHESTRATOR, EVIDENCE_AGENT, HUMAN_COMMANDER, etc.
    detail: str
    metadata: dict = field(default_factory=dict)


@dataclass
class DecisionPacket:
    mission: str = "Medical evacuation"
    policy: MissionPolicy = MissionPolicy.BALANCED
    recommendation: str = ""
    route_id: str | None = None
    why: list[str] = field(default_factory=list)
    known: list[str] = field(default_factory=list)
    unknown: list[str] = field(default_factory=list)
    critical_assumption: str = ""
    consequence_if_wrong: str = ""
    alternative: str = ""
    verification: str = ""
    confidence: ConfidenceClass = ConfidenceClass.MEDIUM
    decision_horizon_min: int = 5
    authority: str = "Incident Commander"
    capacity_gap: bool = False
    escalation_required: bool = False
    timestamp: datetime = field(default_factory=datetime.now)
    ai_computed_at: datetime | None = None
    human_authorized_at: datetime | None = None
    authorization_status: str = "PENDING"  # PENDING, AUTHORIZED, REJECTED, VERIFY_REQUESTED
    provenance: list[str] = field(default_factory=list)
    assumptions: list[str] = field(default_factory=list)
    simulation_summary: dict = field(default_factory=dict)


@dataclass
class RealityState:
    """Central state object — deterministic source of operational truth."""

    mission: str = "Medical evacuation"
    policy: MissionPolicy = MissionPolicy.BALANCED
    decision_horizon_min: int = 5
    decision_window_min: int = 4
    verification_latency_min: float = 3.0
    weather: Weather = Weather.CLEAR
    gps_available: bool = True

    entities: dict[str, EntityFact] = field(default_factory=dict)
    routes: dict[str, Route] = field(default_factory=dict)
    vehicles: dict[str, Vehicle] = field(default_factory=dict)
    shelters: dict[str, Shelter] = field(default_factory=dict)
    hospitals: dict[str, Hospital] = field(default_factory=dict)

    unknowns: list[str] = field(default_factory=list)
    conflicts: list[dict] = field(default_factory=list)
    assumptions: list[str] = field(default_factory=list)

    current_packet: DecisionPacket | None = None
    agent_activity: list[dict] = field(default_factory=list)
    audit_trail: list[AuditRecord] = field(default_factory=list)

    replan_count: int = 0
    pending_events: list[dict] = field(default_factory=list)
    last_state_change: str = ""
    multi_event_transition: str | None = None

    mission_start: datetime = field(default_factory=datetime.now)
    sim_time_offset_min: float = 0.0  # for deterministic demo replay

    def now(self) -> datetime:
        return self.mission_start + timedelta(minutes=self.sim_time_offset_min)

    def log_activity(self, actor: str, message: str) -> None:
        ts = self.now().strftime("%H:%M:%S")
        self.agent_activity.append({"time": ts, "actor": actor, "message": message})

    def log_audit(self, event_type: str, actor: str, detail: str, **metadata: Any) -> None:
        self.audit_trail.append(
            AuditRecord(
                timestamp=self.now(),
                event_type=event_type,
                actor=actor,
                detail=detail,
                metadata=metadata,
            )
        )

    def get_entity_status(self, entity_id: str) -> EntityStatus:
        facts = [f for f in self.entities.values() if f.entity_id == entity_id]
        if not facts:
            return EntityStatus.UNKNOWN
        statuses = {f.status for f in facts}
        if EntityStatus.CONFLICTING in statuses:
            return EntityStatus.CONFLICTING
        if EntityStatus.UNAVAILABLE in statuses:
            return EntityStatus.UNAVAILABLE
        if EntityStatus.STALE in statuses:
            return EntityStatus.STALE
        if EntityStatus.UNCERTAIN in statuses:
            return EntityStatus.UNCERTAIN
        if EntityStatus.UNKNOWN in statuses:
            return EntityStatus.UNKNOWN
        if EntityStatus.CONFIRMED in statuses:
            return EntityStatus.CONFIRMED
        return EntityStatus.KNOWN

    def available_vehicle_capacity(self) -> tuple[int, int, int]:
        """Returns (confirmed, unknown, total_demand_slots)."""
        confirmed = sum(v.capacity for v in self.vehicles.values() if v.available and v.status != EntityStatus.UNAVAILABLE)
        unknown = sum(v.capacity for v in self.vehicles.values() if v.status in (EntityStatus.UNKNOWN, EntityStatus.UNCERTAIN))
        return confirmed, unknown, confirmed + unknown

    def capacity_gap(self) -> bool:
        confirmed, _, _ = self.available_vehicle_capacity()
        demand = sum(s.occupied for s in self.shelters.values()) + sum(
            max(0, h.current_load) for h in self.hospitals.values()
        )
        return confirmed == 0 and demand > 0
