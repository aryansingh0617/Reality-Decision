"""Default world state and demo scenario — 'When Reality Breaks'."""

from __future__ import annotations

from datetime import datetime

from core.dependencies.dependency_graph import build_default_graph
from core.evidence.evidence_store import EvidenceStore
from core.state.entity_status import ConfidenceClass, EntityStatus
from core.state.reality_state import Hospital, MissionPolicy, RealityState, Route, Shelter, Vehicle, Weather, EntityFact

HQ = {"lat": 26.1445, "lon": 91.7362}
BRIDGE_B07 = {"lat": 26.1900, "lon": 91.7450}
DEPOT_D03 = {"lat": 26.2200, "lon": 91.7600}
DEPOT_D04 = {"lat": 26.1700, "lon": 91.6800}
SHELTER_S04 = {"lat": 26.2500, "lon": 91.7200}

ROUTE_R12_COORDS = [
    [HQ["lat"], HQ["lon"]], [BRIDGE_B07["lat"], BRIDGE_B07["lon"]], [DEPOT_D03["lat"], DEPOT_D03["lon"]],
]
ROUTE_R14_COORDS = [
    [HQ["lat"], HQ["lon"]], [DEPOT_D04["lat"], DEPOT_D04["lon"]], [SHELTER_S04["lat"], SHELTER_S04["lon"]],
]


def create_initial_world() -> tuple[RealityState, EvidenceStore]:
    state = RealityState(
        mission="Emergency Flood Evacuation",
        policy=MissionPolicy.BALANCED,
        decision_horizon_min=10,
        decision_window_min=15,
        verification_latency_min=5.0,
        weather=Weather.RAIN,
        gps_available=True,
        mission_start=datetime(2026, 8, 13, 9, 0, 0),
        unknowns=[
            "Bridge B-07 structural load rating under high water flow",
            "Alternative bypass corridor accessibility for light trucks",
        ],
        assumptions=[
            "Field scouts have operational radio contact",
            "B-07 remains crossable by heavy trucks under normal rainfall",
        ],
    )

    state.routes = {
        "route_r12": Route(
            id="route_r12", name="ROUTE R-12", label="FAST CORRIDOR",
            coords=ROUTE_R12_COORDS, status=EntityStatus.KNOWN, confidence=ConfidenceClass.MEDIUM,
            people_capacity=20, eta_minutes=15, failure_risk="LOW", depends_on=["bridge_b07"],
        ),
        "route_r14": Route(
            id="route_r14", name="ROUTE R-14", label="SAFE BYPASS DETOUR",
            coords=ROUTE_R14_COORDS, status=EntityStatus.KNOWN, confidence=ConfidenceClass.HIGH,
            people_capacity=15, eta_minutes=35, failure_risk="LOW", depends_on=[],
        ),
    }

    state.vehicles = {
        "vehicle_v02": Vehicle(id="vehicle_v02", name="Rescue Truck V-02", capacity=10, available=True),
    }

    state.shelters = {
        "shelter_s04": Shelter(id="shelter_s04", name="Shelter S-04", capacity=50, occupied=25),
    }

    state.hospitals = {
        "depot_d03": Hospital(
            id="depot_d03", name="Depot D-03 Logistics Hub",
            surge_capacity=40, current_load=15, access_routes=["route_r12"],
        ),
        "depot_d04": Hospital(
            id="depot_d04", name="Depot D-04 Alternate Hub",
            surge_capacity=30, current_load=5, access_routes=["route_r14"],
        ),
    }
    state.entities = {
        "bridge_b07": EntityFact(
            entity_id="bridge_b07", attribute="access", value="operational",
            status=EntityStatus.KNOWN, source="initial_scout", timestamp=state.now(),
        ),
        "depot_d03": EntityFact(
            entity_id="depot_d03", attribute="access", value="operational",
            status=EntityStatus.KNOWN, source="initial_scout", timestamp=state.now(),
        ),
        "depot_d04": EntityFact(
            entity_id="depot_d04", attribute="access", value="operational",
            status=EntityStatus.KNOWN, source="initial_scout", timestamp=state.now(),
        ),
        "shelter_s04": EntityFact(
            entity_id="shelter_s04", attribute="access", value="operational",
            status=EntityStatus.KNOWN, source="initial_scout", timestamp=state.now(),
        ),
        "vehicle_v02": EntityFact(
            entity_id="vehicle_v02", attribute="availability", value="available",
            status=EntityStatus.KNOWN, source="dispatch_center", timestamp=state.now(),
        ),
    }

    return state, EvidenceStore()


DEMO_EVENTS = {
    "bridge_fails": {
        "id": "evt_bridge_fail",
        "type": "raw_report",
        "label": "BRIDGE B-07 FAILURE",
        "text": "Bridge B-07 appears completely submerged. Local flood team reports heavy vehicles cannot cross and route is blocked.",
        "source": "field_scout_02",
    },
    "bridge_conflict": {
        "id": "evt_bridge_conflict",
        "type": "structured_evidence",
        "label": "SATELLITE CONTRADICTION",
        "data": {
            "entity": "bridge_b07", "event": "operational", "status": "operational",
            "source": "satellite_imagery", "confidence_class": "MEDIUM",
        },
        "text": "High-res satellite pass shows Bridge B-07 structurally intact with light vehicles crossing.",
    },
    "vehicle_lost": {
        "id": "evt_vehicle_lost",
        "type": "entity_status",
        "label": "VEHICLE LOST",
        "entity": "vehicle_v02",
        "status": "UNAVAILABLE",
        "reason": "Rescue Truck V-02 engine flooded during transit",
    },
    "weather_worsens": {
        "id": "evt_weather",
        "type": "entity_status",
        "label": "WEATHER DETERIORATES",
        "entity": "weather",
        "status": "UNCERTAIN",
        "reason": "Flood",
    },
    "shelter_collapse": {
        "id": "evt_shelter",
        "type": "entity_status",
        "label": "SHELTER EVACUATED",
        "entity": "shelter_s04",
        "status": "UNAVAILABLE",
        "reason": "Severe flooding at Shelter S-04, immediate evacuation required",
    },
    "gps_fails": {
        "id": "evt_gps",
        "type": "entity_status",
        "label": "GPS OUTAGE",
        "entity": "gps_network",
        "status": "UNAVAILABLE",
        "reason": "GPS telemetry offline due to atmospheric noise",
    },
    "verification_slow": {
        "id": "evt_verify_slow",
        "type": "verification_config",
        "label": "VERIFICATION SLOWS",
        "latency_min": 25.0,
        "window_min": 15.0,
    },
    "policy_urgent": {
        "id": "evt_policy",
        "type": "policy_change",
        "label": "POLICY → URGENT",
        "policy": "URGENT",
    },
}


def get_graph():
    return build_default_graph()
