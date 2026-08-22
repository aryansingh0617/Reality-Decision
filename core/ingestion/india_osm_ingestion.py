"""
india_osm_ingestion.py
-----------------------------------------------------------------------------
India-Specific Real-Data Disaster Ingestion Engine — Brahmaputra River Basin /
Guwahati Urban Flood Corridor (Assam).

Integrates with (best-effort live fetch, always with a structured, realistic
fallback so the operational map never blocks on a network call):

  * Central Water Commission (CWC) India — river gauge telemetry
  * India Meteorological Department (IMD) — monsoon Doppler rainfall
  * OpenStreetMap (OSM) Overpass API — live road-network GeoJSON geometry
  * ISRO Bhuvan — Disaster Management flood inundation layers

Honesty note: CWC's public "India-WRIS" gauge feed, IMD's Doppler radar
mosaics, and ISRO Bhuvan's flood layers do not expose a simple,
unauthenticated JSON REST endpoint suitable for a demo backend to call
directly (they are portal/WMS/shapefile based and typically require
registration). This module therefore:

  1. Attempts a live OSM Overpass fetch (which *is* a genuinely open,
     unauthenticated API) for the real road/bridge/facility graph.
  2. Ships high-fidelity, physically-consistent FALLBACK telemetry for
     CWC / IMD / Bhuvan, clearly tagged `status: "FALLBACK_INGESTED"` so
     downstream consumers (and the HUD) never present simulated data as
     if it were live. This mirrors the existing project convention in
     core/ingestion/osm_ingestion.py and core/ingestion/water_gauge_api.py.

Exposes a FastAPI APIRouter (`router`) that app/main.py can `include_router`
so all endpoints are reachable under /api/india/*.
"""

from __future__ import annotations

import logging
import math
import urllib.parse
import urllib.request
import json
from datetime import datetime, timedelta
from typing import Any, Dict, List, Tuple

logger = logging.getLogger("reality_decision.india_ingestion")

try:
    from fastapi import APIRouter
except Exception:  # pragma: no cover - allows module import without FastAPI installed
    APIRouter = None  # type: ignore


# ============================================================================
# MISSION CONTEXT — Guwahati Urban Flood Corridor, Assam, India
# ============================================================================

REGION_ID = "assam_brahmaputra_guwahati"
REGION_NAME = "Brahmaputra River Basin / Guwahati Urban Flood Corridor"
RIVER_BASIN = "Brahmaputra Basin"

# bbox = (min_lat, min_lon, max_lat, max_lon) — covers north bank, Saraighat
# Bridge, GS Road / Khanapara detour corridor, and the Guwahati urban core.
REGION_BBOX: Tuple[float, float, float, float] = (26.05, 91.60, 26.25, 91.85)

SARAIGHAT_BRIDGE_COORD: Tuple[float, float] = (26.128, 91.691)  # Bridge B-07
NDRF_1BN_DEPOT_COORD: Tuple[float, float] = (26.098, 91.798)     # Staging Depot D-03 (Khanapara)
DISTRICT_SHELTER_COORD: Tuple[float, float] = (26.181, 91.749)   # Shelter S-04 (Fancy Bazaar / north bank)
GMCH_HOSPITAL_COORD: Tuple[float, float] = (26.146, 91.769)      # Gauhati Medical College & Hospital

# NH-27 / Route R-12: primary evacuation corridor via the north bank
ROUTE_R12_PATH: List[Tuple[float, float]] = [
    (26.135, 91.660),
    (26.130, 91.680),
    SARAIGHAT_BRIDGE_COORD,
    (26.150, 91.720),
    (26.181, 91.749),
]

# South Highway Detour / Route R-14: secondary corridor via Khanapara
ROUTE_R14_PATH: List[Tuple[float, float]] = [
    (26.135, 91.660),
    (26.098, 91.700),
    NDRF_1BN_DEPOT_COORD,
    (26.140, 91.760),
    (26.181, 91.749),
]

DEFAULT_WADING_LIMIT_M = 0.50
DEFAULT_RISE_RATE_M_HR = 0.18
VOI_DRONE_THRESHOLD = 7.5


# ============================================================================
# CWC — Central Water Commission river gauge telemetry
# ============================================================================

class CWCIndiaGaugeClient:
    """Adapter for CWC India live river gauge telemetry (Brahmaputra @ Guwahati)."""

    @staticmethod
    def fetch_live_or_fallback(
        station_code: str = "BRAHMAPUTRA_GUWAHATI_SARAIGHAT",
        current_depth_m: float = 0.35,
        rise_rate_m_hr: float = DEFAULT_RISE_RATE_M_HR,
        wading_limit_m: float = DEFAULT_WADING_LIMIT_M,
    ) -> Dict[str, Any]:
        """
        CWC does not expose an open unauthenticated REST endpoint for live
        gauge reads, so this adapter returns a structured, physically
        consistent telemetry reading derived from the current simulated
        water state, explicitly tagged as FALLBACK_INGESTED. Swap this
        implementation for an authenticated India-WRIS / CWC API client
        when credentials are available.
        """
        prev_depth = max(0.0, round(current_depth_m - (rise_rate_m_hr / 12.0), 3))
        danger_level_msl = 49.68
        warning_level_msl = 48.90
        current_level_msl = round(danger_level_msl - (wading_limit_m - current_depth_m), 2)

        tti_minutes = 0.0
        if current_depth_m < wading_limit_m and rise_rate_m_hr > 0:
            tti_minutes = round(((wading_limit_m - current_depth_m) / rise_rate_m_hr) * 60.0, 1)

        trend = "RISING_RAPIDLY" if rise_rate_m_hr >= 0.15 else ("RISING" if rise_rate_m_hr > 0 else "STABLE")

        return {
            "source": "CWC_FALLBACK",
            "status": "FALLBACK_INGESTED",
            "station_code": station_code,
            "river_basin": RIVER_BASIN,
            "water_depth_m": round(current_depth_m, 3),
            "previous_depth_m": prev_depth,
            "rise_rate_m_hr": round(rise_rate_m_hr, 3),
            "danger_level_msl_m": danger_level_msl,
            "warning_level_msl_m": warning_level_msl,
            "current_level_msl_m": current_level_msl,
            "trend": trend,
            "wading_limit_m": wading_limit_m,
            "tti_minutes": max(0.0, tti_minutes),
            "timestamp": datetime.now().isoformat(),
        }

    @staticmethod
    def compute_tti_curve(
        current_depth_m: float,
        rise_rate_m_hr: float,
        wading_limit_m: float = DEFAULT_WADING_LIMIT_M,
        projection_minutes: int = 120,
        step_minutes: int = 10,
    ) -> List[Dict[str, Any]]:
        curve = []
        rate_per_min = rise_rate_m_hr / 60.0
        for t in range(0, projection_minutes + 1, step_minutes):
            depth = round(current_depth_m + rate_per_min * t, 3)
            submerged = depth >= wading_limit_m
            curve.append({
                "minute": t,
                "projected_depth_m": depth,
                "wading_limit_m": wading_limit_m,
                "submerged": submerged,
                "status": "SUBMERGED_IMPASSABLE" if submerged else "PASSABLE",
            })
        return curve


# ============================================================================
# IMD — India Meteorological Department Doppler monsoon rainfall
# ============================================================================

class IMDRainfallClient:
    """Adapter for IMD heavy-monsoon Doppler radar rainfall intensity."""

    @staticmethod
    def fetch_live_or_fallback(
        radar_station: str = "IMD_GUWAHATI_DWR",
        rise_rate_m_hr: float = DEFAULT_RISE_RATE_M_HR,
    ) -> Dict[str, Any]:
        """
        IMD's Doppler Weather Radar mosaics are distributed as imagery/WMS
        tiles rather than a simple JSON API, so this returns a structured
        fallback rainfall reading correlated with the current river rise
        rate (heavier rainfall upstream drives faster gauge rise).
        """
        rainfall_intensity = round(max(4.0, rise_rate_m_hr * 55.0), 1)  # mm/hr, rough correlation
        cumulative_24h = round(rainfall_intensity * 6.4, 1)

        if rainfall_intensity >= 35:
            alert = "RED_ALERT"
        elif rainfall_intensity >= 20:
            alert = "SEVERE_WARNING"
        elif rainfall_intensity >= 10:
            alert = "WARNING"
        else:
            alert = "WATCH"

        return {
            "source": "IMD_FALLBACK",
            "status": "FALLBACK_INGESTED",
            "radar_station": radar_station,
            "rainfall_intensity_mm_hr": rainfall_intensity,
            "cumulative_24h_mm": cumulative_24h,
            "monsoon_alert_level": alert,
            "timestamp": datetime.now().isoformat(),
        }


# ============================================================================
# OSM — OpenStreetMap Overpass live road-network ingestion
# ============================================================================

class IndiaOSMIngestionEngine:
    """Queries live OSM Overpass for the Guwahati flood corridor road graph."""

    @staticmethod
    def fetch_road_network(
        bbox: Tuple[float, float, float, float] = REGION_BBOX,
        timeout_s: float = 1.8,
    ) -> Dict[str, Any]:
        s, w, n, e = bbox
        overpass_query = f"""
        [out:json][timeout:2];
        (
          node["amenity"="hospital"]({s},{w},{n},{e});
          node["amenity"~"shelter|social_facility"]({s},{w},{n},{e});
          way["bridge"]({s},{w},{n},{e});
          way["highway"~"trunk|primary|secondary"]({s},{w},{n},{e});
        );
        out body;
        >;
        out skel qt;
        """
        url = "https://overpass-api.de/api/interpreter"
        data_encoded = urllib.parse.urlencode({"data": overpass_query}).encode("utf-8")

        try:
            req = urllib.request.Request(
                url, data=data_encoded, headers={"User-Agent": "REALITY-DECISION-2.0-India-GIS/1.0"}
            )
            with urllib.request.urlopen(req, timeout=timeout_s) as resp:
                if resp.status == 200:
                    raw = json.loads(resp.read().decode("utf-8"))
                    elements = raw.get("elements", [])
                    features = []
                    for el in elements:
                        if el.get("type") == "node" and "tags" in el:
                            tags = el.get("tags", {})
                            features.append({
                                "type": "Feature",
                                "geometry": {"type": "Point", "coordinates": [el["lon"], el["lat"]]},
                                "properties": {
                                    "osm_id": el["id"],
                                    "name": tags.get("name", f"OSM Node {el['id']}"),
                                    "type": tags.get("amenity", "node"),
                                },
                            })
                    return {
                        "source": "OSM_OVERPASS_LIVE",
                        "status": "LIVE_INGESTED",
                        "bbox": list(bbox),
                        "feature_count": len(features),
                        "geojson": {"type": "FeatureCollection", "features": features},
                        "timestamp": datetime.now().isoformat(),
                    }
        except Exception as err:
            logger.warning(f"[india_osm] Overpass fetch failed ({err}); using bundled fallback road graph.")

        return IndiaOSMIngestionEngine._fallback_geojson(bbox)

    @staticmethod
    def _fallback_geojson(bbox: Tuple[float, float, float, float]) -> Dict[str, Any]:
        """Bundled high-fidelity fallback so the map renders with 0ms delay offline."""
        features = [
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [SARAIGHAT_BRIDGE_COORD[1], SARAIGHAT_BRIDGE_COORD[0]]},
                "properties": {"id": "bridge_b07", "name": "Saraighat Bridge (Bridge B-07)", "type": "bridge"},
            },
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [NDRF_1BN_DEPOT_COORD[1], NDRF_1BN_DEPOT_COORD[0]]},
                "properties": {"id": "depot_d03", "name": "NDRF 1st Battalion Staging Depot D-03", "type": "depot"},
            },
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [DISTRICT_SHELTER_COORD[1], DISTRICT_SHELTER_COORD[0]]},
                "properties": {"id": "shelter_s04", "name": "District Shelter S-04", "type": "shelter"},
            },
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [GMCH_HOSPITAL_COORD[1], GMCH_HOSPITAL_COORD[0]]},
                "properties": {"id": "gmch_hospital", "name": "GMCH Emergency Hospital", "type": "hospital"},
            },
            {
                "type": "Feature",
                "geometry": {"type": "LineString", "coordinates": [[lon, lat] for lat, lon in ROUTE_R12_PATH]},
                "properties": {"id": "route_r12", "name": "NH-27 / Route R-12 (North Bank)", "type": "highway"},
            },
            {
                "type": "Feature",
                "geometry": {"type": "LineString", "coordinates": [[lon, lat] for lat, lon in ROUTE_R14_PATH]},
                "properties": {"id": "route_r14", "name": "South Highway Detour / Route R-14 (Khanapara)", "type": "highway"},
            },
        ]
        return {
            "source": "OSM_FALLBACK_BUNDLE",
            "status": "FALLBACK_INGESTED",
            "bbox": list(bbox),
            "feature_count": len(features),
            "geojson": {"type": "FeatureCollection", "features": features},
            "timestamp": datetime.now().isoformat(),
        }


# ============================================================================
# ISRO Bhuvan — Disaster Management flood inundation layers
# ============================================================================

class BhuvanFloodLayerClient:
    """Adapter for ISRO Bhuvan flood inundation polygons."""

    @staticmethod
    def fetch_live_or_fallback(
        current_depth_m: float = 0.35,
        rise_rate_m_hr: float = DEFAULT_RISE_RATE_M_HR,
    ) -> Dict[str, Any]:
        """
        Bhuvan's DMS flood layers are served as WMS/shapefile products, not
        a simple JSON API. This returns a translucent polygon envelope
        around Bridge B-07 whose extent grows with the rise rate, tagged
        as FALLBACK_INGESTED for transparency.
        """
        severity = "SEVERE" if current_depth_m >= 0.5 else ("MODERATE" if current_depth_m >= 0.35 else "ADVISORY")
        # Extent scales with depth: ~0.01 deg (~1.1km) base, growing with severity.
        extent = 0.008 + (current_depth_m * 0.01)
        lat0, lon0 = SARAIGHAT_BRIDGE_COORD

        ring = [
            (lat0 + extent, lon0 - extent * 1.3),
            (lat0 + extent * 0.6, lon0 + extent * 1.5),
            (lat0 - extent * 0.5, lon0 + extent * 1.1),
            (lat0 - extent * 0.9, lon0 - extent * 0.4),
            (lat0 + extent, lon0 - extent * 1.3),
        ]

        return {
            "id": "flood_poly_b07_corridor",
            "source": "ISRO_BHUVAN_FALLBACK",
            "status": "FALLBACK_INGESTED",
            "ring": [[round(lat, 5), round(lon, 5)] for lat, lon in ring],
            "rise_velocity_m_hr": rise_rate_m_hr,
            "severity": severity,
            "timestamp": datetime.now().isoformat(),
        }


# ============================================================================
# Autonomous Recon Drone — 6-waypoint MAVLink orbit generator
# ============================================================================

class DroneOrbitPlanner:
    """Generates a 6-waypoint MAVLink orbit path around a target when Shannon VoI exceeds threshold."""

    @staticmethod
    def generate_orbit(
        target_coord: Tuple[float, float] = SARAIGHAT_BRIDGE_COORD,
        target_name: str = "Saraighat Bridge (Bridge B-07) — Load Rating & Submergence Recon",
        voi_score: float = 8.4,
        voi_threshold: float = VOI_DRONE_THRESHOLD,
        orbit_radius_m: float = 180.0,
        altitude_m: float = 60.0,
    ) -> Dict[str, Any]:
        lat, lon = target_coord
        r_earth = 6371000.0
        d_lat = (orbit_radius_m / r_earth) * (180.0 / math.pi)
        d_lon = (orbit_radius_m / (r_earth * math.cos(math.pi * lat / 180.0))) * (180.0 / math.pi)

        pts = [
            (0, "NAV_TAKEOFF", (lat, lon), altitude_m, "Takeoff from staging depot"),
            (1, "NAV_WAYPOINT", (lat + d_lat, lon), altitude_m, "North orbit node"),
            (2, "NAV_WAYPOINT", (lat + d_lat * 0.5, lon + d_lon * 0.87), altitude_m, "Northeast orbit node"),
            (3, "NAV_WAYPOINT", (lat - d_lat * 0.5, lon + d_lon * 0.87), altitude_m, "Southeast orbit node"),
            (4, "NAV_WAYPOINT", (lat - d_lat, lon), altitude_m, "South orbit node"),
            (5, "NAV_RETURN_TO_LAUNCH", (lat, lon), 0.0, "RTL to NDRF Staging Depot D-03"),
        ]
        waypoints = [
            {"seq": s, "command": c, "coord": [round(la, 6), round(lo, 6)], "alt_m": a, "action": act}
            for s, c, (la, lo), a, act in pts
        ]

        return {
            "mission_id": f"india_drone_orbit_{int(datetime.now().timestamp())}",
            "drone_id": "RECON_DRONE_01",
            "entity_id": "bridge_b07",
            "target_name": target_name,
            "voi_score": voi_score,
            "voi_threshold": voi_threshold,
            "active": voi_score >= voi_threshold,
            "waypoints": waypoints,
        }


# ============================================================================
# Aggregate region snapshot
# ============================================================================

def build_india_disaster_region_snapshot(
    current_depth_m: float = 0.35,
    rise_rate_m_hr: float = DEFAULT_RISE_RATE_M_HR,
    voi_score: float = 8.4,
) -> Dict[str, Any]:
    """Assembles the full IndianDisasterRegion payload consumed by IndiaSpatialMapCanvas.tsx."""
    wading_limit = DEFAULT_WADING_LIMIT_M
    cwc = CWCIndiaGaugeClient.fetch_live_or_fallback(
        current_depth_m=current_depth_m, rise_rate_m_hr=rise_rate_m_hr, wading_limit_m=wading_limit
    )
    imd = IMDRainfallClient.fetch_live_or_fallback(rise_rate_m_hr=rise_rate_m_hr)
    osm = IndiaOSMIngestionEngine.fetch_road_network()
    flood_poly = BhuvanFloodLayerClient.fetch_live_or_fallback(current_depth_m, rise_rate_m_hr)
    drone = DroneOrbitPlanner.generate_orbit(voi_score=voi_score)

    submerged = current_depth_m >= wading_limit
    bridge_status = "SUBMERGED_IMPASSABLE" if submerged else ("AT_RISK" if cwc["tti_minutes"] < 30 else "PASSABLE")
    r12_status = "FAILED" if submerged else ("DEGRADED" if cwc["tti_minutes"] < 45 else "ACTIVE")
    r14_status = "AUTHORIZED_DETOUR" if submerged else "DETOUR_EVALUATION" if r12_status != "ACTIVE" else "ACTIVE"

    return {
        "region_id": REGION_ID,
        "name": REGION_NAME,
        "basin": RIVER_BASIN,
        "bbox": list(REGION_BBOX),
        "bridges": [
            {
                "id": "bridge_b07",
                "name": "Saraighat Bridge (Bridge B-07)",
                "coord": [SARAIGHAT_BRIDGE_COORD[0], SARAIGHAT_BRIDGE_COORD[1]],
                "status": bridge_status,
                "wading_limit_m": wading_limit,
                "tti_minutes": cwc["tti_minutes"],
            }
        ],
        "corridors": [
            {
                "id": "route_r12",
                "name": "Primary Evacuation Corridor",
                "designation": "NH-27 / Route R-12",
                "kind": "PRIMARY",
                "path": [[la, lo] for la, lo in ROUTE_R12_PATH],
                "status": r12_status,
                "depends_on": ["bridge_b07"],
                "eta_minutes": 15,
                "tti_minutes": cwc["tti_minutes"],
            },
            {
                "id": "route_r14",
                "name": "Secondary Detour Corridor",
                "designation": "South Highway Detour / Route R-14",
                "kind": "SECONDARY",
                "path": [[la, lo] for la, lo in ROUTE_R14_PATH],
                "status": r14_status,
                "depends_on": [],
                "eta_minutes": 35,
                "tti_minutes": 999.0,
            },
        ],
        "facilities": [
            {"id": "depot_d03", "name": "NDRF 1st Battalion Staging Depot D-03", "kind": "NDRF_STAGING_DEPOT",
             "coord": [NDRF_1BN_DEPOT_COORD[0], NDRF_1BN_DEPOT_COORD[1]]},
            {"id": "shelter_s04", "name": "District Shelter S-04", "kind": "DISTRICT_SHELTER",
             "coord": [DISTRICT_SHELTER_COORD[0], DISTRICT_SHELTER_COORD[1]], "capacity": 400, "occupied": 96},
            {"id": "gmch_hospital", "name": "GMCH Emergency Hospital", "kind": "EMERGENCY_HOSPITAL",
             "coord": [GMCH_HOSPITAL_COORD[0], GMCH_HOSPITAL_COORD[1]]},
        ],
        "flood_polygons": [flood_poly],
        "cwc_telemetry": cwc,
        "imd_telemetry": imd,
        "drone_flight": drone,
        "osm_source": osm["source"],
        "osm_status": osm["status"],
        "generated_at": datetime.now().isoformat(),
    }


# ============================================================================
# FastAPI Router — mount under /api/india via app.include_router(router)
# ============================================================================

if APIRouter is not None:
    router = APIRouter(prefix="/india", tags=["india-disaster-map"])

    @router.get("/state")
    def get_india_region_snapshot(depth_m: float = 0.35, rise_rate_m_hr: float = DEFAULT_RISE_RATE_M_HR, voi_score: float = 8.4):
        """Full IndianDisasterRegion snapshot for IndiaSpatialMapCanvas.tsx."""
        return build_india_disaster_region_snapshot(depth_m, rise_rate_m_hr, voi_score)

    @router.get("/osm")
    def get_india_osm_road_network():
        return IndiaOSMIngestionEngine.fetch_road_network()

    @router.get("/cwc")
    def get_cwc_gauge(depth_m: float = 0.35, rise_rate_m_hr: float = DEFAULT_RISE_RATE_M_HR):
        gauge = CWCIndiaGaugeClient.fetch_live_or_fallback(current_depth_m=depth_m, rise_rate_m_hr=rise_rate_m_hr)
        curve = CWCIndiaGaugeClient.compute_tti_curve(depth_m, rise_rate_m_hr)
        return {"gauge": gauge, "tti_curve": curve}

    @router.get("/imd")
    def get_imd_rainfall(rise_rate_m_hr: float = DEFAULT_RISE_RATE_M_HR):
        return IMDRainfallClient.fetch_live_or_fallback(rise_rate_m_hr=rise_rate_m_hr)

    @router.get("/bhuvan/flood")
    def get_bhuvan_flood_layer(depth_m: float = 0.35, rise_rate_m_hr: float = DEFAULT_RISE_RATE_M_HR):
        return BhuvanFloodLayerClient.fetch_live_or_fallback(depth_m, rise_rate_m_hr)

    @router.get("/drone/orbit")
    def get_drone_orbit(voi_score: float = 8.4):
        return DroneOrbitPlanner.generate_orbit(voi_score=voi_score)
else:  # pragma: no cover
    router = None
