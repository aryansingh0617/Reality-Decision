/**
 * REALITY//DECISION 2.0 — India Disaster Geography Type Definitions
 * -------------------------------------------------------------------
 * Shared types for the Brahmaputra River Basin / Guwahati Urban Flood
 * Corridor operational picture. Consumed by IndiaSpatialMapCanvas.tsx
 * and any component that ingests CWC / IMD / OSM / Bhuvan telemetry.
 */

/** [latitude, longitude] in decimal degrees, WGS84. */
export type GeoCoordinate = [number, number];

/** Data-source provenance tag surfaced in every HUD readout. */
export type TelemetrySource =
  | 'CWC_INDIA_LIVE_GAUGE_API'
  | 'CWC_FALLBACK'
  | 'IMD_DOPPLER_RADAR'
  | 'IMD_FALLBACK'
  | 'OSM_OVERPASS_LIVE'
  | 'OSM_FALLBACK_BUNDLE'
  | 'ISRO_BHUVAN_FLOOD_LAYER'
  | 'ISRO_BHUVAN_FALLBACK';

export type IngestionStatus = 'LIVE_INGESTED' | 'FALLBACK_INGESTED' | 'ERROR';

/** Physical / operational status of a corridor (road) segment. */
export type CorridorStatus =
  | 'ACTIVE'          // fully passable, authorized
  | 'DEGRADED'         // passable but under active risk
  | 'DETOUR_EVALUATION' // amber — being evaluated as an alternative
  | 'AUTHORIZED_DETOUR' // green — human-authorized bypass
  | 'FAILED';           // dashed red — impassable / invalidated

/** Physical / structural status of a critical bridge asset. */
export type BridgeStatus = 'PASSABLE' | 'AT_RISK' | 'SUBMERGED_IMPASSABLE';

export interface CWCTelemetry {
  source: TelemetrySource;
  status: IngestionStatus;
  station_code: string;
  river_basin: string;
  water_depth_m: number;
  previous_depth_m: number;
  rise_rate_m_hr: number;
  danger_level_msl_m: number;
  warning_level_msl_m: number;
  current_level_msl_m: number;
  trend: 'RISING_RAPIDLY' | 'RISING' | 'STABLE' | 'RECEDING';
  wading_limit_m: number;
  tti_minutes: number;
  timestamp: string;
}

export interface IMDRainfallTelemetry {
  source: TelemetrySource;
  status: IngestionStatus;
  radar_station: string;
  rainfall_intensity_mm_hr: number;
  cumulative_24h_mm: number;
  monsoon_alert_level: 'WATCH' | 'WARNING' | 'SEVERE_WARNING' | 'RED_ALERT';
  timestamp: string;
}

export interface FloodInundationPolygon {
  id: string;
  source: TelemetrySource;
  status: IngestionStatus;
  ring: GeoCoordinate[];
  rise_velocity_m_hr: number;
  severity: 'ADVISORY' | 'MODERATE' | 'SEVERE';
}

export interface DroneWaypoint {
  seq: number;
  command: 'NAV_TAKEOFF' | 'NAV_WAYPOINT' | 'NAV_RETURN_TO_LAUNCH';
  coord: GeoCoordinate;
  alt_m: number;
  action: string;
}

export interface DroneFlightPlan {
  mission_id: string;
  drone_id: string;
  entity_id: string;
  target_name: string;
  voi_score: number;
  voi_threshold: number;
  active: boolean;
  waypoints: DroneWaypoint[];
}

export interface CriticalBridge {
  id: string;
  name: string;
  coord: GeoCoordinate;
  status: BridgeStatus;
  wading_limit_m: number;
  tti_minutes: number;
}

export interface EvacuationCorridor {
  id: string;
  name: string;
  designation: string; // e.g. "NH-27 / Route R-12"
  kind: 'PRIMARY' | 'SECONDARY';
  path: GeoCoordinate[];
  status: CorridorStatus;
  depends_on: string[];
  eta_minutes: number;
  tti_minutes: number;
}

export type FacilityKind = 'NDRF_STAGING_DEPOT' | 'DISTRICT_SHELTER' | 'EMERGENCY_HOSPITAL';

export interface CriticalFacility {
  id: string;
  name: string;
  kind: FacilityKind;
  coord: GeoCoordinate;
  capacity?: number;
  occupied?: number;
}

export interface IndianDisasterRegion {
  region_id: string;
  name: string;
  basin: string;
  bbox: [number, number, number, number]; // [minLat, minLon, maxLat, maxLon]
  bridges: CriticalBridge[];
  corridors: EvacuationCorridor[];
  facilities: CriticalFacility[];
  flood_polygons: FloodInundationPolygon[];
  cwc_telemetry: CWCTelemetry;
  imd_telemetry: IMDRainfallTelemetry;
  drone_flight: DroneFlightPlan | null;
  osm_source: TelemetrySource;
  osm_status: IngestionStatus;
  generated_at: string;
}
