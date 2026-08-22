/**
 * IndiaSpatialMapCanvas.tsx
 * -----------------------------------------------------------------------------
 * REALITY//DECISION 2.0 — India-Specific Interactive Disaster Operational Map
 * Region: Brahmaputra River Basin / Guwahati Urban Flood Corridor (Assam)
 *
 * Renders on a REAL Leaflet map (dark cartographic basemap, real streets/river
 * geometry — not abstract SVG lines) with the Saraighat Bridge (B-07) physical
 * state, the NH-27 primary corridor and the Khanapara secondary detour, a
 * dynamic flood inundation contour, a CWC stream-gauge HUD, TTI countdown
 * badges, and the autonomous recon drone's MAVLink orbit path.
 *
 * The disruption simulator computes the entire operational picture LOCALLY
 * and synchronously (mirroring core/ingestion/india_osm_ingestion.py's
 * physics) so every button click updates the map immediately — it does not
 * depend on the backend being reachable. A best-effort background fetch to
 * /api/india/state then reconciles with live CWC/OSM data when available,
 * without ever reverting a manual simulation to stale data (this was the
 * root cause of "simulate bridge fails does nothing": the old polling timer
 * captured a stale closure and periodically overwrote the simulated depth
 * with the original default).
 */

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Waves,
  ShieldAlert,
  AlertTriangle,
  MapPin,
  Navigation,
  Radio,
  Plane,
  Siren,
  Hospital as HospitalIcon,
  Tent,
  RefreshCw,
} from 'lucide-react';
import type {
  IndianDisasterRegion,
  GeoCoordinate,
  CWCTelemetry,
  CorridorStatus,
  BridgeStatus,
  FacilityKind,
} from '../types/india-disaster';

// ============================================================================
// API base resolution (mirrors src/api.ts convention)
// ============================================================================

const resolveApiBase = (): string => {
  try {
    // @ts-ignore — Vite env, optional
    if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL) {
      // @ts-ignore
      return (import.meta as any).env.VITE_API_BASE_URL;
    }
  } catch {
    /* noop */
  }
  if (typeof window !== 'undefined' && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    return '/api';
  }
  return 'http://localhost:8000/api';
};

const API_BASE = resolveApiBase();
const POLL_INTERVAL_MS = 12_000;
const AUTO_RISE_INTERVAL_MS = 4_000;
const MAX_SIM_DEPTH = 0.75;
const WADING_LIMIT_M = 0.5;
const DEFAULT_RISE_RATE = 0.18;

// ============================================================================
// Mission geography — mirrors core/ingestion/india_osm_ingestion.py exactly
// ============================================================================

const BRIDGE_B07: GeoCoordinate = [26.128, 91.691];
const DEPOT_D03: GeoCoordinate = [26.098, 91.798];
const SHELTER_S04: GeoCoordinate = [26.181, 91.749];
const GMCH_HOSPITAL: GeoCoordinate = [26.146, 91.769];

const ROUTE_R12_PATH: GeoCoordinate[] = [
  [26.135, 91.66],
  [26.13, 91.68],
  BRIDGE_B07,
  [26.15, 91.72],
  [26.181, 91.749],
];

const ROUTE_R14_PATH: GeoCoordinate[] = [
  [26.135, 91.66],
  [26.098, 91.7],
  DEPOT_D03,
  [26.14, 91.76],
  [26.181, 91.749],
];

const REGION_BBOX: [number, number, number, number] = [26.05, 91.6, 26.25, 91.85];

// Approximate real course of the Brahmaputra through the Guwahati stretch,
// passing under Saraighat Bridge — drawn as a soft underlay so the map reads
// as a real river corridor even in the rare case tile imagery can't load.
const BRAHMAPUTRA_COURSE: GeoCoordinate[] = [
  [26.108, 91.6],
  [26.112, 91.635],
  [26.118, 91.665],
  [26.128, 91.691],
  [26.122, 91.715],
  [26.108, 91.745],
  [26.095, 91.78],
  [26.082, 91.82],
  [26.075, 91.85],
];

/** Tight-fit bounds around the actual features (not the wider declared bbox). */
function computeFeatureBounds(): [[number, number], [number, number]] {
  const pts: GeoCoordinate[] = [BRIDGE_B07, DEPOT_D03, SHELTER_S04, GMCH_HOSPITAL, ...ROUTE_R12_PATH, ...ROUTE_R14_PATH];
  const lats = pts.map((p) => p[0]);
  const lons = pts.map((p) => p[1]);
  const pad = 0.012;
  return [
    [Math.min(...lats) - pad, Math.min(...lons) - pad],
    [Math.max(...lats) + pad, Math.max(...lons) + pad],
  ];
}
const FEATURE_BOUNDS = computeFeatureBounds();

const STATIC_FACILITIES = [
  { id: 'depot_d03', name: 'NDRF 1st Battalion Staging Depot D-03', kind: 'NDRF_STAGING_DEPOT' as FacilityKind, coord: DEPOT_D03 },
  { id: 'shelter_s04', name: 'District Shelter S-04', kind: 'DISTRICT_SHELTER' as FacilityKind, coord: SHELTER_S04, capacity: 400, occupied: 96 },
  { id: 'gmch_hospital', name: 'GMCH Emergency Hospital', kind: 'EMERGENCY_HOSPITAL' as FacilityKind, coord: GMCH_HOSPITAL },
];

const round = (n: number, dp: number) => {
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
};

/**
 * Pure, synchronous derivation of the full operational picture from a water
 * depth reading — the single source of truth used both for the instant
 * local simulation and as the offline fallback when the backend can't be
 * reached. Mirrors build_india_disaster_region_snapshot() in
 * core/ingestion/india_osm_ingestion.py so local and live data never
 * disagree in shape or thresholds.
 */
function deriveRegion(depthM: number, riseRateMHr: number): IndianDisasterRegion {
  const wadingLimit = WADING_LIMIT_M;
  const prevDepth = Math.max(0, round(depthM - riseRateMHr / 12, 3));
  const dangerLevelMsl = 49.68;
  const warningLevelMsl = 48.9;
  const currentLevelMsl = round(dangerLevelMsl - (wadingLimit - depthM), 2);

  let ttiMinutes = 0;
  if (depthM < wadingLimit && riseRateMHr > 0) {
    ttiMinutes = round(((wadingLimit - depthM) / riseRateMHr) * 60, 1);
  }
  const trend: CWCTelemetry['trend'] = riseRateMHr >= 0.15 ? 'RISING_RAPIDLY' : riseRateMHr > 0 ? 'RISING' : 'STABLE';

  const submerged = depthM >= wadingLimit;
  const bridgeStatus: BridgeStatus = submerged ? 'SUBMERGED_IMPASSABLE' : ttiMinutes < 30 ? 'AT_RISK' : 'PASSABLE';
  const r12Status: CorridorStatus = submerged ? 'FAILED' : ttiMinutes < 45 ? 'DEGRADED' : 'ACTIVE';
  const r14Status: CorridorStatus = submerged ? 'AUTHORIZED_DETOUR' : r12Status !== 'ACTIVE' ? 'DETOUR_EVALUATION' : 'ACTIVE';

  const severity = depthM >= 0.5 ? 'SEVERE' : depthM >= 0.35 ? 'MODERATE' : 'ADVISORY';
  const extent = 0.008 + depthM * 0.01;
  const [lat0, lon0] = BRIDGE_B07;
  const ring: GeoCoordinate[] = [
    [lat0 + extent, lon0 - extent * 1.3],
    [lat0 + extent * 0.6, lon0 + extent * 1.5],
    [lat0 - extent * 0.5, lon0 + extent * 1.1],
    [lat0 - extent * 0.9, lon0 - extent * 0.4],
    [lat0 + extent, lon0 - extent * 1.3],
  ].map(([la, lo]) => [round(la, 5), round(lo, 5)] as GeoCoordinate);

  const rainfallIntensity = round(Math.max(4, riseRateMHr * 55), 1);
  const cumulative24h = round(rainfallIntensity * 6.4, 1);
  const alert =
    rainfallIntensity >= 35 ? 'RED_ALERT' : rainfallIntensity >= 20 ? 'SEVERE_WARNING' : rainfallIntensity >= 10 ? 'WARNING' : 'WATCH';

  const voiScore = bridgeStatus === 'PASSABLE' ? 5.8 : 8.4;
  const voiThreshold = 7.5;
  const droneActive = voiScore >= voiThreshold;

  const nowIso = new Date().toISOString();

  return {
    region_id: 'assam_brahmaputra_guwahati',
    name: 'Brahmaputra River Basin / Guwahati Urban Flood Corridor',
    basin: 'Brahmaputra Basin',
    bbox: REGION_BBOX,
    bridges: [
      { id: 'bridge_b07', name: 'Saraighat Bridge (Bridge B-07)', coord: BRIDGE_B07, status: bridgeStatus, wading_limit_m: wadingLimit, tti_minutes: ttiMinutes },
    ],
    corridors: [
      {
        id: 'route_r12', name: 'Primary Evacuation Corridor', designation: 'NH-27 / Route R-12', kind: 'PRIMARY',
        path: ROUTE_R12_PATH, status: r12Status, depends_on: ['bridge_b07'], eta_minutes: 15, tti_minutes: ttiMinutes,
      },
      {
        id: 'route_r14', name: 'Secondary Detour Corridor', designation: 'South Highway Detour / Route R-14', kind: 'SECONDARY',
        path: ROUTE_R14_PATH, status: r14Status, depends_on: [], eta_minutes: 35, tti_minutes: 999,
      },
    ],
    facilities: STATIC_FACILITIES,
    flood_polygons: [
      { id: 'flood_poly_b07_corridor', source: 'ISRO_BHUVAN_FALLBACK', status: 'FALLBACK_INGESTED', ring, rise_velocity_m_hr: riseRateMHr, severity },
    ],
    cwc_telemetry: {
      source: 'CWC_FALLBACK', status: 'FALLBACK_INGESTED', station_code: 'BRAHMAPUTRA_GUWAHATI_SARAIGHAT', river_basin: 'Brahmaputra Basin',
      water_depth_m: round(depthM, 3), previous_depth_m: prevDepth, rise_rate_m_hr: round(riseRateMHr, 3),
      danger_level_msl_m: dangerLevelMsl, warning_level_msl_m: warningLevelMsl, current_level_msl_m: currentLevelMsl,
      trend, wading_limit_m: wadingLimit, tti_minutes: Math.max(0, ttiMinutes), timestamp: nowIso,
    },
    imd_telemetry: {
      source: 'IMD_FALLBACK', status: 'FALLBACK_INGESTED', radar_station: 'IMD_GUWAHATI_DWR',
      rainfall_intensity_mm_hr: rainfallIntensity, cumulative_24h_mm: cumulative24h, monsoon_alert_level: alert as any, timestamp: nowIso,
    },
    drone_flight: {
      mission_id: `local_orbit_${Math.round(depthM * 1000)}`, drone_id: 'RECON_DRONE_01', entity_id: 'bridge_b07',
      target_name: 'Saraighat Bridge (Bridge B-07) — Load Rating & Submergence Recon', voi_score: voiScore, voi_threshold: voiThreshold,
      active: droneActive,
      waypoints: buildOrbitWaypoints(BRIDGE_B07, 180),
    },
    osm_source: 'OSM_FALLBACK_BUNDLE',
    osm_status: 'FALLBACK_INGESTED',
    generated_at: nowIso,
  };
}

function buildOrbitWaypoints(center: GeoCoordinate, radiusM: number) {
  const [lat, lon] = center;
  const rEarth = 6371000;
  const dLat = (radiusM / rEarth) * (180 / Math.PI);
  const dLon = (radiusM / (rEarth * Math.cos((Math.PI * lat) / 180))) * (180 / Math.PI);
  const pts: [number, [number, number]][] = [
    [0, [lat + dLat, lon]],
    [1, [lat + dLat * 0.5, lon + dLon * 0.87]],
    [2, [lat - dLat * 0.5, lon + dLon * 0.87]],
    [3, [lat - dLat, lon]],
  ];
  return pts.map(([seq, coord]) => ({ seq, command: 'NAV_WAYPOINT' as const, coord, alt_m: 60, action: 'Orbit node' }));
}

const FALLBACK_REGION = deriveRegion(0.35, DEFAULT_RISE_RATE);

// ============================================================================
// Visual tokens
// ============================================================================

const TONE = {
  active: '#3fb984',
  detour: '#e0a83d',
  failed: '#e5645e',
  accent: '#5b8def',
  muted: '#647180',
};

function corridorColor(status: CorridorStatus): string {
  switch (status) {
    case 'ACTIVE': return TONE.active;
    case 'DEGRADED': return TONE.detour;
    case 'DETOUR_EVALUATION': return TONE.detour;
    case 'AUTHORIZED_DETOUR': return TONE.active;
    case 'FAILED': return TONE.failed;
    default: return TONE.muted;
  }
}

function bridgeColor(status: BridgeStatus): string {
  if (status === 'SUBMERGED_IMPASSABLE') return TONE.failed;
  if (status === 'AT_RISK') return TONE.detour;
  return TONE.accent;
}

const FACILITY_META: Record<FacilityKind, { icon: React.ReactNode; color: string }> = {
  NDRF_STAGING_DEPOT: { icon: <Siren size={14} />, color: TONE.accent },
  DISTRICT_SHELTER: { icon: <Tent size={14} />, color: TONE.active },
  EMERGENCY_HOSPITAL: { icon: <HospitalIcon size={14} />, color: '#f0908b' },
};

// ============================================================================
// Leaflet DivIcon builders (server-rendered React → static HTML, no image
// assets required — avoids the classic Leaflet+bundler marker-icon breakage)
// ============================================================================

function markerIcon(color: string, icon: React.ReactNode, pulsing = false): L.DivIcon {
  const html = renderToStaticMarkup(
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {pulsing && (
        <span
          style={{
            position: 'absolute', inset: -6, borderRadius: '50%',
            boxShadow: `0 0 0 2px ${color}`, animation: 'rd-pulse-soft 1.2s ease-in-out infinite',
          }}
        />
      )}
      <span
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8,
          background: '#1a222b', border: `2px solid ${color}`, color, boxShadow: '0 1px 2px rgba(0,0,0,0.4), 0 8px 24px -12px rgba(0,0,0,0.6)',
        }}
      >
        {icon}
      </span>
    </div>
  );
  return L.divIcon({ html, className: '', iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -16] });
}

// ============================================================================
// Component
// ============================================================================

interface Props {
  apiBase?: string;
  onSelectEntity?: (entityId: string) => void;
}

export const IndiaSpatialMapCanvas: React.FC<Props> = ({ apiBase = API_BASE, onSelectEntity }) => {
  const [region, setRegion] = useState<IndianDisasterRegion>(FALLBACK_REGION);
  const [liveOk, setLiveOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [layers, setLayers] = useState({ bridges: true, corridors: true, facilities: true, flood: true, drone: true, tti: true });
  const [simDepth, setSimDepth] = useState(0.35);
  const [autoRise, setAutoRise] = useState(true);

  const simDepthRef = useRef(0.35);
  const riseRateRef = useRef(DEFAULT_RISE_RATE);
  const abortRef = useRef<AbortController | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  const applyLocal = useCallback((depth: number, riseRate: number) => {
    const next = deriveRegion(depth, riseRate);
    setRegion(next);
    return next;
  }, []);

  const fetchSnapshot = useCallback(async (depthOverride?: number) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const depth = depthOverride ?? simDepthRef.current;
    const riseRate = riseRateRef.current;
    setLoading(true);
    try {
      const url = `${apiBase}/india/state?depth_m=${depth}&rise_rate_m_hr=${riseRate}&voi_score=8.4`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as IndianDisasterRegion;
      // Guard against an out-of-order response landing after a newer simulate() call.
      if (Math.abs(data.cwc_telemetry.water_depth_m - simDepthRef.current) < 1e-6) {
        setRegion(data);
        setLiveOk(true);
      }
    } catch {
      setLiveOk(false);
      // Offline / unreachable backend: keep the map correct using the same
      // physics locally rather than leaving stale data on screen.
      applyLocal(depth, riseRate);
    } finally {
      setLoading(false);
    }
  }, [apiBase, applyLocal]);

  // Initial load + periodic reconciliation with the backend (reads refs, so
  // it always polls the CURRENT simulated depth — not a stale closure).
  useEffect(() => {
    fetchSnapshot();
    const t = setInterval(() => fetchSnapshot(), POLL_INTERVAL_MS);
    return () => { clearInterval(t); abortRef.current?.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-rise clock: while not in the nominal scenario, water keeps rising
  // in real time so the TTI countdown genuinely counts down.
  useEffect(() => {
    if (!autoRise) return;
    const t = setInterval(() => {
      if (simDepthRef.current <= 0.35) return; // nominal — hold steady
      const next = Math.min(MAX_SIM_DEPTH, round(simDepthRef.current + riseRateRef.current * (AUTO_RISE_INTERVAL_MS / 3_600_000), 4));
      if (next === simDepthRef.current) return;
      simDepthRef.current = next;
      setSimDepth(next);
      applyLocal(next, riseRateRef.current);
    }, AUTO_RISE_INTERVAL_MS);
    return () => clearInterval(t);
  }, [autoRise, applyLocal]);

  const toggleLayer = (k: keyof typeof layers) => setLayers((p) => ({ ...p, [k]: !p[k] }));

  const simulate = (nextDepth: number) => {
    simDepthRef.current = nextDepth;
    setSimDepth(nextDepth);
    applyLocal(nextDepth, riseRateRef.current); // instant, guaranteed UI update
    fetchSnapshot(nextDepth); // best-effort reconciliation with live backend
  };

  const bridge = region.bridges[0];
  const r12 = region.corridors.find((c) => c.id === 'route_r12')!;
  const r14 = region.corridors.find((c) => c.id === 'route_r14')!;
  const cwc: CWCTelemetry = region.cwc_telemetry;
  const submerged = bridge?.status === 'SUBMERGED_IMPASSABLE';
  const droneActive = !!region.drone_flight?.active;

  const bridgeIcon = useMemo(
    () => markerIcon(bridgeColor(bridge.status), bridge.status === 'SUBMERGED_IMPASSABLE' ? <AlertTriangle size={14} /> : <Navigation size={14} />, submerged),
    [bridge.status, submerged]
  );
  const facilityIcons = useMemo(
    () => Object.fromEntries(STATIC_FACILITIES.map((f) => [f.id, markerIcon(FACILITY_META[f.kind].color, FACILITY_META[f.kind].icon)])),
    []
  );

  const select = (id: string) => onSelectEntity?.(id);

  const center: [number, number] = [26.155, 91.73];

  return (
    <div className="relative flex h-full flex-col overflow-hidden rd-panel">
      {/* Top bar */}
      <div className="z-[1200] flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--rd-border)] px-4 py-2.5" style={{ position: 'relative' }}>
        <div className="flex items-center gap-2.5">
          <MapPin className="h-4 w-4" style={{ color: 'var(--rd-accent)' }} />
          <span className="t-h3" style={{ color: 'var(--rd-text)' }}>India Operational Map</span>
          <span className="t-tech hidden md:inline">
            {region.name} · {bridge.coord[0].toFixed(3)}°N {bridge.coord[1].toFixed(3)}°E
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-md px-2.5 py-1" style={{ background: 'var(--rd-bg)', border: '1px solid var(--rd-border)' }}>
            <Waves className="h-3.5 w-3.5" style={{ color: submerged ? 'var(--rd-danger)' : 'var(--rd-success)' }} />
            <span className="t-label">CWC Depth</span>
            <span className="t-tech" style={{ color: submerged ? 'var(--rd-danger)' : 'var(--rd-success)' }}>
              {cwc.water_depth_m.toFixed(2)}m · +{cwc.rise_rate_m_hr.toFixed(2)}/h
            </span>
          </div>
          <button
            onClick={() => fetchSnapshot()}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[var(--rd-text-3)] transition-colors hover:bg-[var(--rd-hover)] hover:text-[var(--rd-text)]"
            style={{ border: '1px solid var(--rd-border)' }}
            aria-label="Refresh telemetry" title="Refresh telemetry"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'rd-spin-slow' : ''}`} />
          </button>
          <div className="hidden items-center gap-1.5 sm:flex">
            <span className="relative inline-flex h-2 w-2">
              {liveOk && <span className="absolute inset-0 rounded-full rd-ping" style={{ background: 'var(--rd-success)' }} />}
              <span className="rd-dot relative" style={{ width: 8, height: 8, background: liveOk ? 'var(--rd-success)' : 'var(--rd-text-3)' }} />
            </span>
            <span className="t-tech" style={{ color: liveOk ? 'var(--rd-success)' : 'var(--rd-text-3)' }}>
              {liveOk ? 'live CWC/OSM feed' : 'offline fallback graph'}
            </span>
          </div>
        </div>
      </div>

      {/* Real map */}
      <div className="relative flex-1 overflow-hidden">
        <style>{`
          .rd-leaflet-wrap { background: #0a0c10; }
          .rd-leaflet-wrap .leaflet-control-attribution { background: rgba(10,12,16,0.7) !important; color: var(--rd-text-3) !important; font-size: 9.5px; }
          .rd-leaflet-wrap .leaflet-control-attribution a { color: var(--rd-text-2) !important; }
          .rd-route-failed { animation: rd-dash 1s linear infinite; }
          .rd-drone-orbit { animation: rd-dash 2.2s linear infinite; }
        `}</style>
        <MapContainer
          center={center}
          zoom={12}
          minZoom={10}
          maxZoom={17}
          zoomControl={false}
          scrollWheelZoom
          className="rd-leaflet-wrap h-full w-full"
          ref={mapRef}
        >
          <FitToBBox bounds={FEATURE_BOUNDS} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
          />

          {/* Brahmaputra river underlay — keeps the map legible as a real
              river corridor even in the rare case tile imagery is blocked */}
          <Polyline
            positions={BRAHMAPUTRA_COURSE}
            pathOptions={{ color: '#3f6f9e', weight: 16, opacity: 0.32, lineCap: 'round', lineJoin: 'round' }}
            interactive={false}
          />
          <Polyline
            positions={BRAHMAPUTRA_COURSE}
            pathOptions={{ color: '#5b8def', weight: 3, opacity: 0.45, lineCap: 'round', lineJoin: 'round' }}
            interactive={false}
          />

          {/* Flood inundation contour */}
          {layers.flood && region.flood_polygons.map((poly) => (
            <Polygon
              key={poly.id}
              positions={poly.ring}
              pathOptions={{
                color: poly.severity === 'SEVERE' ? TONE.failed : 'var(--rd-accent)',
                fillColor: poly.severity === 'SEVERE' ? TONE.failed : TONE.accent,
                fillOpacity: poly.severity === 'SEVERE' ? 0.22 : 0.14,
                weight: 1.2,
                dashArray: '4 5',
              }}
            >
              <Popup>
                <b>Flood inundation contour</b><br />
                Severity: {poly.severity}<br />
                Rise velocity: +{poly.rise_velocity_m_hr.toFixed(2)} m/hr<br />
                Source: {poly.source} ({poly.status === 'LIVE_INGESTED' ? 'live' : 'fallback'})
              </Popup>
            </Polygon>
          ))}

          {/* Corridors */}
          {layers.corridors && [r14, r12].map((c) => (
            <Polyline
              key={`${c.id}-${c.status}`}
              positions={c.path}
              pathOptions={{
                color: corridorColor(c.status),
                weight: c.status === 'ACTIVE' || c.status === 'AUTHORIZED_DETOUR' ? 5 : 3,
                opacity: 0.9,
                dashArray: c.status === 'FAILED' ? '8 8' : c.status === 'DETOUR_EVALUATION' || c.status === 'DEGRADED' ? '2 6' : undefined,
                className: c.status === 'FAILED' ? 'rd-route-failed' : undefined,
                lineCap: 'round',
              }}
              eventHandlers={{ click: () => select(c.id) }}
            >
              <Popup>
                <b>{c.designation}</b><br />
                Status: {c.status.replace(/_/g, ' ')}<br />
                ETA: {c.eta_minutes} min{c.tti_minutes < 999 ? ` · TTI ${c.tti_minutes.toFixed(0)}m` : ''}
              </Popup>
            </Polyline>
          ))}

          {/* Drone orbit */}
          {layers.drone && droneActive && region.drone_flight && (
            <Polyline
              positions={[...region.drone_flight.waypoints.map((w) => w.coord), region.drone_flight.waypoints[0].coord]}
              pathOptions={{ color: '#7ba6f5', weight: 1.6, dashArray: '3 5', className: 'rd-drone-orbit' }}
            >
              <Popup>
                <b>Recon Drone Orbit</b><br />
                VoI score: {region.drone_flight.voi_score.toFixed(1)} (threshold {region.drone_flight.voi_threshold})<br />
                Target: {region.drone_flight.target_name}
              </Popup>
            </Polyline>
          )}

          {/* Bridge marker */}
          {layers.bridges && (
            <Marker position={bridge.coord} icon={bridgeIcon} eventHandlers={{ click: () => select(bridge.id) }}>
              <Popup>
                <b>Saraighat Bridge (Bridge B-07)</b><br />
                Status: {bridge.status.replace(/_/g, ' ')}<br />
                {bridge.status !== 'SUBMERGED_IMPASSABLE' ? `TTI: ${bridge.tti_minutes.toFixed(1)} min` : 'Wading limit exceeded'}
              </Popup>
            </Marker>
          )}

          {/* Facility markers */}
          {layers.facilities && STATIC_FACILITIES.map((f) => (
            <Marker key={f.id} position={f.coord} icon={facilityIcons[f.id]} eventHandlers={{ click: () => select(f.id) }}>
              <Popup>
                <b>{f.name}</b><br />
                {f.kind.replace(/_/g, ' ')}
                {f.capacity != null ? <><br />Occupancy: {f.occupied}/{f.capacity}</> : null}
              </Popup>
            </Marker>
          ))}

          {/* TTI countdown badges */}
          {layers.tti && [r12, r14].filter((c) => c.tti_minutes < 999).map((c) => {
            const mid = c.path[Math.floor(c.path.length / 2)];
            const danger = c.tti_minutes < c.eta_minutes;
            const icon = L.divIcon({
              html: renderToStaticMarkup(
                <div style={{
                  background: '#1a222b', border: `1px solid ${danger ? TONE.failed : '#2c3742'}`, borderRadius: 5,
                  padding: '2px 6px', fontFamily: 'Geist Mono, monospace', fontSize: 9.5, fontWeight: 600,
                  color: danger ? TONE.failed : '#9aa7b4', whiteSpace: 'nowrap',
                }}>
                  TTI {c.tti_minutes.toFixed(0)}m
                </div>
              ),
              className: '', iconSize: [0, 0],
            });
            return <Marker key={`tti-${c.id}`} position={mid} icon={icon} interactive={false} />;
          })}
        </MapContainer>

        {/* Zoom controls */}
        <ZoomControls mapRef={mapRef} />

        {/* Legend / layers */}
        <div className="absolute right-3 top-3 z-[1000] w-48 rounded-lg p-3" style={{ background: 'var(--rd-panel)', border: '1px solid var(--rd-border)' }}>
          <div className="mb-2.5 flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" style={{ color: 'var(--rd-text-3)' }} /><span className="t-label">Layers</span></div>
          <div className="space-y-1.5">
            {([
              ['bridges', 'Bridges'], ['corridors', 'Corridors'], ['facilities', 'Facilities'],
              ['flood', 'Flood contours'], ['drone', 'Drone orbit'], ['tti', 'TTI badges'],
            ] as const).map(([k, lbl]) => (
              <label key={k} className="flex cursor-pointer items-center justify-between text-[12px]" style={{ color: 'var(--rd-text-2)' }}>
                <span>{lbl}</span>
                <input type="checkbox" checked={layers[k]} onChange={() => toggleLayer(k)} style={{ accentColor: 'var(--rd-accent)' }} />
              </label>
            ))}
          </div>
          <div className="mt-3 space-y-1.5 border-t border-[var(--rd-border)] pt-2.5">
            <LegendRow color={TONE.active} label="Active / authorized" />
            <LegendRow color={TONE.detour} label="Detour evaluation" />
            <LegendRow color={TONE.failed} label="Failed / impassable" />
          </div>
        </div>

        {/* CWC gauge HUD */}
        <div className="absolute left-3 top-3 z-[1000] w-56 rounded-lg p-3" style={{ background: 'var(--rd-panel)', border: '1px solid var(--rd-border)' }}>
          <div className="mb-2 flex items-center gap-1.5"><Radio className="h-3.5 w-3.5" style={{ color: 'var(--rd-accent)' }} /><span className="t-label">CWC Stream Gauge</span></div>
          <HudRow k="Depth" v={`${cwc.water_depth_m.toFixed(2)}m`} tone={submerged ? 'danger' : 'default'} />
          <HudRow k="Rise rate" v={`+${cwc.rise_rate_m_hr.toFixed(2)} m/hr`} />
          <HudRow k="Danger level" v={`${cwc.danger_level_msl_m.toFixed(2)} MSL`} />
          <HudRow k="Trend" v={cwc.trend.replace(/_/g, ' ')} tone={cwc.trend === 'RISING_RAPIDLY' ? 'danger' : 'default'} />
          <div className="mt-2 border-t border-[var(--rd-border)] pt-2 t-tech" style={{ fontSize: 10 }}>
            {cwc.source} · {cwc.status === 'LIVE_INGESTED' ? 'live' : 'fallback'}
          </div>
        </div>

        {/* Disruption simulator */}
        <div className="absolute bottom-3 right-3 z-[1000] w-64 rounded-lg p-3" style={{ background: 'var(--rd-panel)', border: '1px solid var(--rd-border)' }}>
          <div className="mb-2 flex items-center gap-1.5"><ShieldAlert className="h-3.5 w-3.5" style={{ color: 'var(--rd-warn)' }} /><span className="t-label">Disruption Simulator</span></div>
          <div className="grid grid-cols-3 gap-1.5">
            <SimButton label="Nominal" active={simDepth <= 0.35} onClick={() => simulate(0.35)} />
            <SimButton label="Rising" active={simDepth > 0.35 && simDepth < 0.5} onClick={() => simulate(0.44)} />
            <SimButton label="Submerge" active={simDepth >= 0.5} onClick={() => simulate(0.58)} />
          </div>
          <label className="mt-2 flex cursor-pointer items-center justify-between text-[11px]" style={{ color: 'var(--rd-text-2)' }}>
            <span>Auto-rise clock</span>
            <input type="checkbox" checked={autoRise} onChange={() => setAutoRise((v) => !v)} style={{ accentColor: 'var(--rd-accent)' }} />
          </label>
          <div className="mt-1.5 flex items-center gap-1.5">
            <Plane className="h-3.5 w-3.5" style={{ color: droneActive ? 'var(--rd-accent)' : 'var(--rd-text-3)' }} />
            <span className="t-caption" style={{ fontSize: 11 }}>
              Recon drone {droneActive ? 'orbiting B-07' : 'grounded'} · VoI {region.drone_flight?.voi_score?.toFixed(1) ?? '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Fits the map to the actual feature extent (not the wider declared bbox,
 * which was zooming everything out into a tiny cluster in one corner), and
 * corrects Leaflet's classic "sized before the flex/grid parent settled"
 * problem by re-measuring the container with a ResizeObserver + a couple of
 * deferred invalidateSize() calls after mount.
 */
const FitToBBox: React.FC<{ bounds: [[number, number], [number, number]] }> = ({ bounds }) => {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    const fit = () => {
      map.invalidateSize();
      if (!fitted.current) {
        fitted.current = true;
        map.fitBounds(bounds, { padding: [32, 32], maxZoom: 15 });
      }
    };
    fit();
    const raf1 = requestAnimationFrame(() => fit());
    const t1 = setTimeout(fit, 120);
    const t2 = setTimeout(fit, 450);

    const container = map.getContainer();
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(container);

    return () => {
      cancelAnimationFrame(raf1);
      clearTimeout(t1);
      clearTimeout(t2);
      ro.disconnect();
    };
  }, [bounds, map]);
  return null;
};

const ZoomControls: React.FC<{ mapRef: React.RefObject<L.Map | null> }> = ({ mapRef }) => {
  return (
    <div className="absolute bottom-3 left-3 z-[1000] flex items-center gap-1 rounded-lg p-1" style={{ background: 'var(--rd-panel)', border: '1px solid var(--rd-border)' }}>
      {[
        { i: <ZoomIn className="h-4 w-4" />, f: () => mapRef.current?.zoomIn(), t: 'Zoom in' },
        { i: <ZoomOut className="h-4 w-4" />, f: () => mapRef.current?.zoomOut(), t: 'Zoom out' },
        { i: <RotateCcw className="h-4 w-4" />, f: () => mapRef.current?.fitBounds(FEATURE_BOUNDS, { padding: [32, 32], maxZoom: 15 }), t: 'Reset' },
      ].map((b, i) => (
        <button key={i} onClick={b.f} title={b.t} aria-label={b.t} className="rounded-md p-1.5 text-[var(--rd-text-3)] transition-colors hover:bg-[var(--rd-hover)] hover:text-[var(--rd-text)]">
          {b.i}
        </button>
      ))}
    </div>
  );
};

const LegendRow: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <div className="flex items-center gap-2">
    <span className="h-[3px] w-5 rounded-full" style={{ background: color }} />
    <span className="t-caption text-[11px]">{label}</span>
  </div>
);

const HudRow: React.FC<{ k: string; v: string; tone?: 'default' | 'danger' }> = ({ k, v, tone = 'default' }) => (
  <div className="flex items-center justify-between py-0.5">
    <span className="t-label" style={{ fontSize: 9.5 }}>{k}</span>
    <span className="t-tech" style={{ color: tone === 'danger' ? 'var(--rd-danger)' : 'var(--rd-text)' }}>{v}</span>
  </div>
);

const SimButton: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className="rounded-md px-1.5 py-1.5 text-[10.5px] font-medium transition-colors"
    style={{
      background: active ? 'var(--rd-accent-soft)' : 'var(--rd-bg)',
      color: active ? '#8bb2f7' : 'var(--rd-text-2)',
      border: `1px solid ${active ? 'rgba(91,141,239,0.4)' : 'var(--rd-border)'}`,
    }}
  >
    {label}
  </button>
);

export default IndiaSpatialMapCanvas;
