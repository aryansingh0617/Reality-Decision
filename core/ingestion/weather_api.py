"""Live Weather & Rainfall Ingestion Adapter for North Eastern Region (NER) Pilot — Open-Meteo API."""

from __future__ import annotations
import json
import logging
import urllib.request
import urllib.parse
from datetime import datetime
from typing import Any, Dict, Optional

logger = logging.getLogger("pravah.weather_api")

# NER Pilot Coordinates: Guwahati (Kamrup Metro) / NH-27 Corridor (26.1445 N, 91.7362 E)
DEFAULT_PILOT_LAT = 26.1445
DEFAULT_PILOT_LON = 91.7362


class WeatherAPIClient:
    """Ingests live meteorological data (rainfall, precipitation probability, humidity, wind) for NER."""

    @staticmethod
    def fetch_live_ner_weather(
        lat: float = DEFAULT_PILOT_LAT,
        lon: float = DEFAULT_PILOT_LON,
    ) -> Dict[str, Any]:
        """
        Fetches live weather and precipitation data from Open-Meteo Free Weather API (No API key needed).
        """
        url = (
            f"https://api.open-meteo.com/v1/forecast?"
            f"latitude={lat}&longitude={lon}&"
            f"current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m&"
            f"hourly=precipitation_probability,rain&timezone=Asia%2FKolkata&forecast_days=1"
        )
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "PRAVAH-NER-Logistics-Platform/2.0"},
            )
            with urllib.request.urlopen(req, timeout=2.5) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode("utf-8"))
                    current = data.get("current", {})
                    rain_mm = float(current.get("rain", current.get("precipitation", 0.0)))
                    temp_c = float(current.get("temperature_2m", 28.0))
                    humidity = float(current.get("relative_humidity_2m", 75.0))
                    wind_kmh = float(current.get("wind_speed_10m", 12.0))
                    
                    # Compute rainfall intensity classification
                    if rain_mm > 15.0:
                        condition = "HEAVY_RAIN"
                        rain_risk_factor = 0.85
                    elif rain_mm > 5.0:
                        condition = "MODERATE_RAIN"
                        rain_risk_factor = 0.55
                    elif rain_mm > 0.1:
                        condition = "LIGHT_RAIN"
                        rain_risk_factor = 0.25
                    else:
                        condition = "CLEAR"
                        rain_risk_factor = 0.05

                    return {
                        "source": "OPEN_METEO_LIVE_API",
                        "status": "CONNECTED",
                        "classification": "REAL",
                        "latitude": lat,
                        "longitude": lon,
                        "location_name": "Guwahati (Kamrup Metro) / NH-27 Corridor",
                        "condition": condition,
                        "rainfall_mm_hr": rain_mm,
                        "temperature_c": temp_c,
                        "humidity_pct": humidity,
                        "wind_speed_kmh": wind_kmh,
                        "rain_risk_factor": rain_risk_factor,
                        "timestamp": datetime.now().isoformat(),
                    }
        except Exception as e:
            logger.warning(f"Open-Meteo live API call failed ({e}). Using deterministic backup weather profile.")

        # Fallback calibrated for NER Monsoon characteristics
        return {
            "source": "NER_WEATHER_ADAPTER_FALLBACK",
            "status": "DEGRADED",
            "classification": "DERIVED",
            "latitude": lat,
            "longitude": lon,
            "location_name": "Guwahati (Kamrup Metro) / NH-27 Corridor",
            "condition": "MODERATE_RAIN",
            "rainfall_mm_hr": 8.5,
            "temperature_c": 27.2,
            "humidity_pct": 82.0,
            "wind_speed_kmh": 14.5,
            "rain_risk_factor": 0.60,
            "timestamp": datetime.now().isoformat(),
        }
