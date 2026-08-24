"""Canonical NER Operational World Model — Structured Entities & Relationships for PRAVAH."""

from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional


class ConnectivityStatus(str, Enum):
    FULLY_ACCESSIBLE = "FULLY_ACCESSIBLE"
    PARTIALLY_DEGRADED = "PARTIALLY_DEGRADED"
    SEVERELY_RESTRICTED = "SEVERELY_RESTRICTED"
    ISOLATED = "ISOLATED"


class DisruptionType(str, Enum):
    RAINFALL_SURGE = "RAINFALL_SURGE"
    LANDSLIDE = "LANDSLIDE"
    BRIDGE_SCOUR = "BRIDGE_SCOUR"
    TRAFFIC_CONGESTION = "TRAFFIC_CONGESTION"
    ROAD_DAMAGE = "ROAD_DAMAGE"


class MissionStatus(str, Enum):
    ON_SCHEDULE = "ON_SCHEDULE"
    AT_RISK = "AT_RISK"
    CRITICALLY_DELAYED = "CRITICALLY_DELAYED"
    REROUTED = "REROUTED"
    DELIVERED = "DELIVERED"


@dataclass
class District:
    id: str
    name: str
    state: str  # e.g., "Assam", "Meghalaya"
    status: ConnectivityStatus = ConnectivityStatus.FULLY_ACCESSIBLE
    accessibility_score: float = 100.0  # 0 to 100
    active_bottlenecks_count: int = 0
    critical_missions_count: int = 1
    coordinates: List[float] = field(default_factory=lambda: [26.1445, 91.7362])
    data_classification: str = "REAL"  # REAL for Kamrup/Guwahati, SIMULATED for demo districts


@dataclass
class RoadSegment:
    id: str
    name: str
    highway_code: str  # e.g., "NH-27", "NH-6", "MDR-04"
    length_km: float
    slope_gradient_pct: float  # Slope gradient contributing to landslide risk
    baseline_speed_kmh: float
    current_speed_kmh: float
    traffic_congestion_pct: float  # 0.0 to 100.0%
    operational: bool = True
    flood_depth_m: float = 0.0
    landslide_risk_factor: float = 0.1  # 0.0 to 1.0


@dataclass
class Bridge:
    id: str
    name: str
    river_name: str
    coordinates: List[float]
    water_clearance_m: float  # Current clearance above river level
    critical_submergence_threshold_m: float = 0.50  # Vehicle wading limit
    current_water_depth_m: float = 0.35
    rate_of_rise_m_hr: float = 0.15
    operational: bool = True
    status_label: str = "OPERATIONAL"


@dataclass
class RouteOption:
    id: str
    name: str
    label: str  # e.g., "PRIMARY CORRIDOR (NH-27)", "SAFE BYPASS DETOUR (NH-6)"
    corridor_desc: str
    coordinates: List[List[float]]
    distance_km: float
    baseline_eta_min: int
    current_eta_min: int
    estimated_delay_min: int
    traffic_congestion_pct: float
    risk_level: str  # LOW, MODERATE, HIGH, CRITICAL
    risk_score: float  # 0 to 100
    tti_minutes: float
    operational: bool
    feasibility_status: str  # FEASIBLE, DEADLINE_VIOLATION, PHYSICALLY_BLOCKED
    depends_on: List[str] = field(default_factory=list)  # Bridge/road IDs


@dataclass
class Vehicle:
    id: str
    name: str
    vehicle_type: str  # "HEAVY_RESCUE_TRUCK", "VACCINE_REEFER_VAN", "4x4_AMBULANCE"
    capacity_kg: int
    assigned_route_id: Optional[str] = None
    current_coords: List[float] = field(default_factory=lambda: [26.1445, 91.7362])
    speed_factor: float = 1.0
    available: bool = True


@dataclass
class Facility:
    id: str
    name: str
    facility_type: str  # "REGIONAL_DEPOT", "DISTRICT_HOSPITAL", "PRIMARY_HEALTH_CENTER"
    district_id: str
    coordinates: List[float]
    stock_hours_remaining: float
    critical_shortage: bool = False


@dataclass
class Mission:
    id: str
    name: str
    commodity: str  # "Critical Vaccines & Emergency Blood Plasma"
    priority: str  # "URGENT_LIFE_SAFETY"
    origin_facility_id: str
    destination_facility_id: str
    vehicle_id: str
    current_route_id: str
    quantity_units: int
    deadline_minutes: int  # Absolute delivery window from start
    baseline_eta_minutes: int
    current_eta_minutes: int
    estimated_delay_minutes: int
    status: MissionStatus = MissionStatus.ON_SCHEDULE
    impact_narrative: str = ""
    assigned_driver_contact: str = "+91 94350-XXXXX (NER Emergency Logistics Wing)"


@dataclass
class FieldReport:
    id: str
    incident_type: str  # "ROAD_BLOCKED", "BRIDGE_DAMAGE", "LANDSLIDE", "FLOODING", "TRAFFIC_GRIDLOCK"
    location_name: str
    coordinates: List[float]
    severity: str  # "LOW", "MEDIUM", "HIGH", "CRITICAL"
    confidence: str  # "VERIFIED", "SUPPORTING", "UNCERTAIN", "CONFLICTING"
    description: str
    reported_by: str
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    photo_url: Optional[str] = None
    synced_to_server: bool = True


@dataclass
class AlertItem:
    id: str
    level: str  # "INFO", "WARNING", "CRITICAL"
    title: str
    message: str
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    affected_route_id: Optional[str] = None
    affected_mission_id: Optional[str] = None
    acknowledged: bool = False
