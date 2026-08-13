"""Default world state and demo scenario — 'When Reality Breaks'."""

from __future__ import annotations

from datetime import datetime

from core.dependencies.dependency_graph import build_default_graph
from core.evidence.evidence_store import EvidenceStore
from core.state.entity_status import ConfidenceClass, EntityStatus
from core.state.reality_state import Hospital, MissionPolicy, RealityState, Route, Shelter, Vehicle, Weather

HQ = {"lat": 45.5152, "lon": -122.6784}
BRIDGE = {"lat": 45.5178, "lon": -122.6715}
HOSPITAL = {"lat": 45.5285, "lon": -122.6550}
SHELTER_A = {"lat": 45.5080, "lon": -122.6620}
SHELTER_B = {"lat": 45.5220, "lon": -122.6480}

ROUTE_A_COORDS = [
    [HQ["lat"], HQ["lon"]], [45.5165, -122.6750], [BRIDGE["lat"], BRIDGE["lon"]],
    [45.5240, -122.6600], [HOSPITAL["lat"], HOSPITAL["lon"]],
]
ROUTE_B_COORDS = [
    [HQ["lat"], HQ["lon"]], [45.5120, -122.6850], [45.5100, -122.6700],
    [SHELTER_A["lat"], SHELTER_A["lon"]], [45.5150, -122.6550],
    [SHELTER_B["lat"], SHELTER_B["lon"]], [HOSPITAL["lat"], HOSPITAL["lon"]],
]
ROUTE_C_COORDS = [
    [HQ["lat"], HQ["lon"]], [45.5180, -122.6800], [BRIDGE["lat"], BRIDGE["lon"]],
    [45.5260, -122.6580], [HOSPITAL["lat"], HOSPITAL["lon"]],
]


def create_initial_world() -> tuple[RealityState, EvidenceStore]:
    state = RealityState(
        mission="Medical evacuation",
        policy=MissionPolicy.BALANCED,
        decision_horizon_min=5,
        decision_window_min=5,
        verification_latency_min=3.0,
        weather=Weather.CLEAR,
        gps_available=True,
        mission_start=datetime(2026, 8, 12, 9, 40, 0),
        unknowns=[
            "Bridge 07 structural integrity under sustained load",
            "Secondary aftershock probability in next 20 min",
        ],
        assumptions=[
            "Forward scout reports accurate within 5-minute window",
            "Light vehicles can traverse Route Bravo detour",
        ],
    )

    state.routes = {
        "route_alpha": Route(
            id="route_alpha", name="ROUTE ALPHA", label="FAST & DIRECT",
            coords=ROUTE_A_COORDS, status=EntityStatus.KNOWN, confidence=ConfidenceClass.MEDIUM,
            people_capacity=20, eta_minutes=18, failure_risk="MEDIUM", depends_on=["bridge_07"],
        ),
        "route_bravo": Route(
            id="route_bravo", name="ROUTE BRAVO", label="SAFE DETOUR",
            coords=ROUTE_B_COORDS, status=EntityStatus.KNOWN, confidence=ConfidenceClass.HIGH,
            people_capacity=14, eta_minutes=32, failure_risk="LOW", depends_on=["shelter_a", "shelter_b"],
        ),
        "route_charlie": Route(
            id="route_charlie", name="ROUTE CHARLIE", label="ALTERNATE",
            coords=ROUTE_C_COORDS, status=EntityStatus.KNOWN, confidence=ConfidenceClass.MEDIUM,
            people_capacity=12, eta_minutes=28, failure_risk="MEDIUM", depends_on=["bridge_07"],
        ),
    }

    state.vehicles = {
        "vehicle_12": Vehicle(id="vehicle_12", name="Ambulance 12", capacity=4, available=True),
        "vehicle_08": Vehicle(id="vehicle_08", name="Ambulance 08", capacity=4, available=True),
        "vehicle_15": Vehicle(id="vehicle_15", name="Transport 15", capacity=6, available=True),
    }

    state.shelters = {
        "shelter_a": Shelter(id="shelter_a", name="Riverside Shelter", capacity=50, occupied=30),
        "shelter_b": Shelter(id="shelter_b", name="Eastside Triage", capacity=40, occupied=20),
    }

    state.hospitals = {
        "hospital_north": Hospital(
            id="hospital_north", name="St. Vincent Field Hospital",
            surge_capacity=60, current_load=35, access_routes=["route_alpha", "route_bravo"],
        ),
    }

    return state, EvidenceStore()


DEMO_EVENTS = {
    "bridge_fails": {
        "id": "evt_bridge_fail",
        "type": "raw_report",
        "label": "BRIDGE 07 ACCESS FAILURE",
        "text": "Bridge 7 appears completely submerged. Truck drivers report heavy vehicles cannot cross.",
        "source": "field_report_17",
    },
    "bridge_conflict": {
        "id": "evt_bridge_conflict",
        "type": "structured_evidence",
        "label": "BRIDGE STATUS CONFLICT",
        "data": {
            "entity": "bridge_07", "event": "operational", "status": "operational",
            "source": "satellite_imagery", "confidence_class": "MEDIUM",
        },
        "text": "Satellite evidence says bridge appears intact.",
    },
    "vehicle_lost": {
        "id": "evt_vehicle_lost",
        "type": "entity_status",
        "label": "VEHICLE 12 UNAVAILABLE",
        "entity": "vehicle_12",
        "status": "UNAVAILABLE",
        "reason": "Mechanical failure reported",
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
        "label": "SHELTER CAPACITY COLLAPSE",
        "entity": "shelter_a",
        "status": "UNAVAILABLE",
        "reason": "Capacity reduction",
    },
    "gps_fails": {
        "id": "evt_gps",
        "type": "entity_status",
        "label": "GPS OUTAGE",
        "entity": "gps_network",
        "status": "UNAVAILABLE",
        "reason": "GPS telemetry offline",
    },
    "verification_slow": {
        "id": "evt_verify_slow",
        "type": "verification_config",
        "label": "VERIFICATION TOO SLOW",
        "latency_min": 6.0,
        "window_min": 4.0,
    },
    "policy_urgent": {
        "id": "evt_policy",
        "type": "policy_change",
        "label": "POLICY → URGENT",
        "policy": "URGENT",
    },
    "traffic_sensor": {
        "id": "evt_traffic",
        "type": "raw_report",
        "label": "TRAFFIC SENSOR",
        "text": "Traffic sensor: no vehicles detected on Bridge 07.",
        "source": "traffic_sensor",
    },
}


def get_graph():
    return build_default_graph()
