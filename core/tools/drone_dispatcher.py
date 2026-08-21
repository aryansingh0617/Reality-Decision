"""Active VoI Drone Dispatch Tool — Automated MAVLink & GeoJSON Waypoint Flight Plan Exporter."""

from __future__ import annotations
import math
import uuid
from datetime import datetime
from typing import Any, Dict, List, Tuple


class DroneDispatcher:
    """Generates automated flight plans and MAVLink/GeoJSON waypoints for high VoI recon targets."""

    @staticmethod
    def generate_drone_flight_plan(
        entity_id: str = "bridge_b07",
        target_coords: Tuple[float, float] = (26.1833, 91.7333),  # Emergency default
        target_name: str = "Bridge B-07 Load Rating & Submergence",
        voi_score: float = 8.4,
        orbit_radius_m: float = 150.0,
        altitude_m: float = 60.0,
    ) -> Dict[str, Any]:
        """
        Generates GeoJSON FeatureCollection and MAVLink waypoint mission for recon drone.
        """
        lat, lon = target_coords

        # Compute orbit waypoints (4 cardinal points around target)
        r_earth = 6371000.0  # meters
        d_lat = (orbit_radius_m / r_earth) * (180.0 / math.pi)
        d_lon = (orbit_radius_m / (r_earth * math.cos(math.pi * lat / 180.0))) * (180.0 / math.pi)

        waypoints = [
            {"seq": 0, "command": "NAV_TAKEOFF", "lat": lat, "lon": lon, "alt": altitude_m, "action": "Takeoff to recon altitude"},
            {"seq": 1, "command": "NAV_WAYPOINT", "lat": lat + d_lat, "lon": lon, "alt": altitude_m, "action": "North Orbit Node"},
            {"seq": 2, "command": "NAV_WAYPOINT", "lat": lat, "lon": lon + d_lon, "alt": altitude_m, "action": "East Orbit Node"},
            {"seq": 3, "command": "NAV_WAYPOINT", "lat": lat - d_lat, "lon": lon, "alt": altitude_m, "action": "South Orbit Node"},
            {"seq": 4, "command": "NAV_WAYPOINT", "lat": lat, "lon": lon - d_lon, "alt": altitude_m, "action": "West Orbit Node"},
            {"seq": 5, "command": "NAV_RETURN_TO_LAUNCH", "lat": lat, "lon": lon, "alt": 0.0, "action": "RTL Base Depot"},
        ]

        geojson = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [lon, lat],
                    },
                    "properties": {
                        "name": target_name,
                        "entity_id": entity_id,
                        "voi_score": voi_score,
                        "type": "RECON_TARGET",
                    },
                },
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "LineString",
                        "coordinates": [[w["lon"], w["lat"]] for w in waypoints[1:5]] + [[waypoints[1]["lon"], waypoints[1]["lat"]]],
                    },
                    "properties": {
                        "name": f"Orbit Recon Flight Path ({entity_id})",
                        "altitude_m": altitude_m,
                        "radius_m": orbit_radius_m,
                    },
                },
            ],
        }

        mission_id = f"drone_plan_{uuid.uuid4().hex[:8]}"

        return {
            "mission_id": mission_id,
            "drone_id": "RECON_DRONE_01",
            "entity_id": entity_id,
            "target_name": target_name,
            "voi_score": voi_score,
            "status": "WAYPOINTS_GENERATED",
            "altitude_m": altitude_m,
            "estimated_flight_duration_min": 4.5,
            "waypoints": waypoints,
            "geojson": geojson,
            "created_at": datetime.now().isoformat(),
        }
