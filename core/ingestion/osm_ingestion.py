"""OpenStreetMap GIS Live Ingestion Engine — Ingests real-world GeoJSON road networks via Overpass API."""

from __future__ import annotations
import logging
import urllib.request
import urllib.parse
import json
from typing import Any, Dict, List, Tuple
from datetime import datetime

logger = logging.getLogger("reality_decision.osm_ingestion")


class OSMIngestionEngine:
    """Queries live OpenStreetMap Overpass API for disaster region road graphs, bridges, and shelters."""

    @staticmethod
    def fetch_osm_disaster_geojson(
        bbox: Tuple[float, float, float, float] = (26.10, 91.65, 26.25, 91.85),  # Emergency Disaster Zone default
    ) -> Dict[str, Any]:
        """
        Queries Overpass API for road networks, bridges, hospitals, and shelters within bounding box.
        bbox format: (min_lat, min_lon, max_lat, max_lon)
        """
        s, w, n, e = bbox
        overpass_query = f"""
        [out:json][timeout:2];
        (
          node["amenity"="hospital"]({s},{w},{n},{e});
          node["amenity"="shelter"]({s},{w},{n},{e});
          way["highway"]({s},{w},{n},{e});
          way["bridge"]({s},{w},{n},{e});
        );
        out body;
        >;
        out skel qt;
        """

        url = "https://overpass-api.de/api/interpreter"
        data_encoded = urllib.parse.urlencode({"data": overpass_query}).encode("utf-8")

        try:
            req = urllib.request.Request(url, data=data_encoded, headers={"User-Agent": "REALITY-DECISION-OSM/2.0"})
            with urllib.request.urlopen(req, timeout=1.5) as resp:
                if resp.status == 200:
                    raw_data = json.loads(resp.read().decode("utf-8"))
                    elements = raw_data.get("elements", [])
                    features = []

                    for el in elements:
                        if el.get("type") == "node" and "tags" in el:
                            tags = el.get("tags", {})
                            name = tags.get("name", f"OSM Node {el['id']}")
                            features.append({
                                "type": "Feature",
                                "geometry": {
                                    "type": "Point",
                                    "coordinates": [el["lon"], el["lat"]],
                                },
                                "properties": {
                                    "osm_id": el["id"],
                                    "name": name,
                                    "type": tags.get("amenity", "node"),
                                },
                            })

                    return {
                        "source": "OVERPASS_OSM_LIVE_API",
                        "bbox": list(bbox),
                        "status": "SUCCESS",
                        "feature_count": len(features),
                        "geojson": {
                            "type": "FeatureCollection",
                            "features": features,
                        },
                        "timestamp": datetime.now().isoformat(),
                    }
        except Exception as err:
            logger.warning(f"OSM Overpass API fetch failed ({err}). Using fallback OSM disaster region graph.")

        # Fallback GeoJSON for Emergency Disaster Zone
        return {
            "source": "OSM_GIS_FALLBACK_GRAPH",
            "bbox": list(bbox),
            "status": "FALLBACK_INGESTED",
            "feature_count": 4,
            "geojson": {
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "geometry": {"type": "Point", "coordinates": [91.7333, 26.1833]},
                        "properties": {"name": "Bridge B-07 (Brahmaputra Tributary)", "id": "bridge_b07", "type": "bridge"},
                    },
                    {
                        "type": "Feature",
                        "geometry": {"type": "Point", "coordinates": [91.7500, 26.1900]},
                        "properties": {"name": "Shelter S-04 (Silchar East)", "id": "shelter_s04", "type": "shelter"},
                    },
                    {
                        "type": "Feature",
                        "geometry": {"type": "LineString", "coordinates": [[91.7200, 26.1700], [91.7333, 26.1833], [91.7500, 26.1900]]},
                        "properties": {"name": "Route R-12 (Fast Corridor)", "id": "route_r12", "type": "highway"},
                    },
                    {
                        "type": "Feature",
                        "geometry": {"type": "LineString", "coordinates": [[91.7200, 26.1700], [91.7100, 26.2000], [91.7500, 26.1900]]},
                        "properties": {"name": "Route R-14 (Safe Bypass Detour)", "id": "route_r14", "type": "highway"},
                    },
                ],
            },
            "timestamp": datetime.now().isoformat(),
        }
