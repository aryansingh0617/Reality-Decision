import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Globe2,
  Droplets,
  Shield,
  Clock,
  Play,
  Pause,
  Plane,
  Ship,
  Sparkles,
} from 'lucide-react';
import type { RealityState } from '../api';
import { TRANSLATIONS, type Language } from '../i18n';

interface Props {
  state: RealityState | null;
  activePlanRouteId?: string | null;
  replayRouteId?: string | null;
  onSelectEntity?: (entityId: string) => void;
  lang?: Language;
  onSimulateScenario?: (scenario: 'nominal' | 'rising' | 'submerge') => void;
}

export const SpatialMapCanvas: React.FC<Props> = ({
  state,
  activePlanRouteId = 'route_r12',
  replayRouteId = null,
  onSelectEntity,
  lang = 'en',
  onSimulateScenario,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);

  const [layers, setLayers] = useState({
    bridges: true,
    corridors: true,
    facilities: true,
    floodContours: true,
    multimodal: true,
    ttiBadges: true,
  });

  const [layersOpen, setLayersOpen] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<'nominal' | 'rising' | 'submerge'>('rising');
  const [timeOffsetHours, setTimeOffsetHours] = useState<number>(0);
  const [isPlayingLapse, setIsPlayingLapse] = useState<boolean>(false);

  const isHindi = lang === 'hi';

  const baseDepth = state?.current_water_depth_m ?? 0.35;
  const riseRate = state?.water_rise_rate_m_hr ?? 0.15;
  
  // Predictive Time-Lapse Depth calculation
  const curDepth = Number((baseDepth + (timeOffsetHours * riseRate)).toFixed(2));
  const rec = replayRouteId ?? (state?.current_packet?.route_id || activePlanRouteId);

  const isB07Down = (
    !state?.routes?.route_r12?.operational ||
    ['UNAVAILABLE', 'UNCERTAIN', 'FAILED', 'BLOCKED'].includes(state?.routes?.route_r12?.status || '') ||
    rec === 'route_r14' ||
    curDepth >= 0.50
  );

  const toggleLayer = (key: keyof typeof layers) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Time-Lapse Player
  useEffect(() => {
    let timer: any;
    if (isPlayingLapse) {
      timer = setInterval(() => {
        setTimeOffsetHours((h) => (h >= 6 ? 0 : h + 1));
      }, 1400);
    }
    return () => clearInterval(timer);
  }, [isPlayingLapse]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [26.148, 91.735],
      zoom: 12.1,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    L.control.attribution({ position: 'bottomright', prefix: false })
      .addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" style="color:#64748b">OSM</a> &copy; <a href="https://carto.com/" target="_blank" style="color:#64748b">CARTO</a>')
      .addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    layersGroupRef.current = layerGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Vector Overlays & Modern Pinpoint Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = layersGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    // Coordinates of Infrastructure Points
    const coords = {
      depot: [26.128, 91.685] as [number, number], // Central Depot D-03 (Maligaon)
      bridge: [26.185, 91.728] as [number, number], // Saraighat Bridge B-07
      dispur: [26.142, 91.791] as [number, number], // Dispur District Hospital H-03
      shelter: [26.115, 91.765] as [number, number], // Shelter S-04 (Khanapara)
      heliBase: [26.112, 91.605] as [number, number], // IAF Borjhar Heli-Drop LZ-01
      ndrfBoat: [26.175, 91.692] as [number, number], // Pandu Ghat NDRF Boat Staging
    };

    // 1. Natural River Channel Inundation Corridor (Dynamically expands with time-lapse)
    if (layers.floodContours) {
      const floodExpansionFactor = timeOffsetHours * 0.003;
      const naturalRiverContour: [number, number][] = [
        [26.196 + floodExpansionFactor, 91.635],
        [26.198 + floodExpansionFactor, 91.680],
        [26.195 + floodExpansionFactor, 91.720],
        [26.188 + floodExpansionFactor, 91.755],
        [26.175 + floodExpansionFactor, 91.800],
        [26.162, 91.835],
        [26.155 - floodExpansionFactor, 91.820],
        [26.168 - floodExpansionFactor, 91.770],
        [26.178 - floodExpansionFactor, 91.725],
        [26.182 - floodExpansionFactor, 91.680],
        [26.178 - floodExpansionFactor, 91.640],
      ];

      L.polygon(naturalRiverContour, {
        color: isB07Down ? '#f43f5e' : '#0284c7',
        fillColor: isB07Down ? '#f43f5e' : '#0284c7',
        fillOpacity: isB07Down ? 0.18 + (timeOffsetHours * 0.03) : 0.08,
        weight: isB07Down ? 1.8 : 1.2,
        dashArray: isB07Down ? '4, 4' : undefined,
      }).addTo(group);
    }

    // 2. Corridors
    if (layers.corridors) {
      // Primary Route R-12 (via Saraighat Bridge)
      const r12Coords: [number, number][] = [
        coords.depot,
        [26.155, 91.705],
        coords.bridge,
        [26.165, 91.765],
        coords.dispur,
      ];

      const isR12Rec = rec === 'route_r12' && !isB07Down;
      const r12Color = isB07Down ? '#f43f5e' : isR12Rec ? '#10b981' : '#38bdf8';

      L.polyline(r12Coords, {
        color: r12Color,
        weight: isR12Rec ? 4 : 2.5,
        opacity: isB07Down ? 0.6 : 0.9,
        dashArray: isB07Down ? '6, 6' : undefined,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(group);

      // Safe Bypass Route R-14 (via South Highway / Khanapara)
      const r14Coords: [number, number][] = [
        coords.depot,
        [26.115, 91.710],
        coords.shelter,
        [26.128, 91.785],
        coords.dispur,
      ];

      const isR14Rec = rec === 'route_r14' || isB07Down;
      const r14Color = isR14Rec ? '#10b981' : '#38bdf8';

      L.polyline(r14Coords, {
        color: r14Color,
        weight: isR14Rec ? 4 : 2.5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(group);
    }

    // Modern Apple / Mapbox-Style Circular Pin Creator
    const createModernPin = (code: string, label: string, color: string, pulse: boolean = false, subtext?: string) => {
      return L.divIcon({
        className: 'modern-gis-pin',
        html: `
          <div style="
            display: flex;
            align-items: center;
            gap: 6px;
            cursor: pointer;
            filter: drop-shadow(0 4px 10px rgba(0,0,0,0.8));
          ">
            <div style="
              position: relative;
              width: 22px;
              height: 22px;
              border-radius: 50%;
              background: #090e17;
              border: 2px solid ${color};
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 0 12px ${color}88;
            ">
              ${pulse ? `<span style="position:absolute;inset:-4px;border-radius:50%;border:1.5px solid ${color};animation:rdPulse 1.8s infinite;opacity:0.8;"></span>` : ''}
              <span style="font-family:ui-monospace, monospace;font-size:9.5px;font-weight:800;color:${color};">${code}</span>
            </div>
            <div style="
              background: rgba(9, 14, 23, 0.88);
              backdrop-filter: blur(4px);
              border: 1px solid rgba(255,255,255,0.08);
              padding: 2px 7px;
              border-radius: 5px;
              display: flex;
              flex-direction: column;
            ">
              <span style="font-family:sans-serif;font-size:10.5px;font-weight:600;color:#f8fafc;letter-spacing:-0.01em;line-height:1.2;">${label}</span>
              ${subtext ? `<span style="font-family:ui-monospace, monospace;font-size:9px;font-weight:500;color:${color};line-height:1;">${subtext}</span>` : ''}
            </div>
          </div>
        `,
        iconSize: [120, 24],
        iconAnchor: [11, 12],
      });
    };

    // 3. Facilities & Bridge Pins
    if (layers.facilities) {
      // Central Depot D-03
      const depotMarker = L.marker(coords.depot, {
        icon: createModernPin('D', isHindi ? 'केंद्रीय डिपो D-03' : 'Central Depot D-03', '#38bdf8', false, isHindi ? 'मलीगांव हब' : 'Maligaon Hub'),
      }).addTo(group);
      depotMarker.bindTooltip(
        `<b>${isHindi ? 'केंद्रीय लॉजिस्टिक्स डिपो D-03' : 'Central Logistics Depot D-03'}</b><br/>${isHindi ? 'मलीगांव हब · क्षमता: 40 टन' : 'Maligaon Logistics Hub · 40T capacity'}`,
        { direction: 'top', className: 'leaflet-tactical-tooltip' }
      );
      depotMarker.on('click', () => onSelectEntity?.('depot_d03'));

      // Dispur Hospital H-03
      const hospMarker = L.marker(coords.dispur, {
        icon: createModernPin('H', isHindi ? 'दिसपुर अस्पताल' : 'Dispur Hospital', '#fb7185', true, isHindi ? 'वैक्सीन गंतव्य' : '45m Deadline'),
      }).addTo(group);
      hospMarker.bindTooltip(
        `<b>${isHindi ? 'दिसपुर जिला अस्पताल H-03' : 'Dispur District Hospital H-03'}</b><br/>${isHindi ? 'वैक्सीन डिलीवरी समय-सीमा: 45 मिनट' : 'Vaccine Delivery Deadline: 45m limit'}`,
        { direction: 'top', className: 'leaflet-tactical-tooltip' }
      );
      hospMarker.on('click', () => onSelectEntity?.('hosp_h03'));

      // Shelter S-04
      const shelterMarker = L.marker(coords.shelter, {
        icon: createModernPin('S', isHindi ? 'राहत शिविर S-04' : 'Shelter S-04', '#38bdf8', false, isHindi ? 'खानापारा बाईपास' : 'Khanapara Bypass'),
      }).addTo(group);
      shelterMarker.bindTooltip(
        `<b>${isHindi ? 'राहत शिविर S-04' : 'Evacuation Shelter S-04'}</b><br/>${isHindi ? 'खानापारा बाईपास गलियारा' : 'Khanapara Bypass Corridor'}`,
        { direction: 'top', className: 'leaflet-tactical-tooltip' }
      );
      shelterMarker.on('click', () => onSelectEntity?.('shelter_s04'));
    }

    if (layers.bridges) {
      // Saraighat Bridge B-07
      const bridgeColor = isB07Down ? '#f43f5e' : '#10b981';
      const bridgeLabel = isHindi ? 'सरायघाट पुल B-07' : 'Saraighat Bridge B-07';
      const bridgeSub = isB07Down
        ? (isHindi ? `जलमग्न (${curDepth}m / 0m TTI)` : `Submerged (${curDepth}m / 0m)`)
        : (isHindi ? `चालू (${curDepth}m / 60m TTI)` : `Operational (${curDepth}m / 60m)`);

      const bridgeMarker = L.marker(coords.bridge, {
        icon: createModernPin('B', bridgeLabel, bridgeColor, isB07Down, bridgeSub),
      }).addTo(group);
      bridgeMarker.bindTooltip(
        `<b>${isHindi ? 'सरायघाट पुल B-07 (ब्रह्मपुत्र)' : 'Saraighat Bridge B-07 (Brahmaputra)'}</b><br/>${
          isB07Down
            ? (isHindi ? `स्थिति: जलमग्न (${curDepth}m / 0.50m सीमा)` : `STATUS: SUBMERGED (${curDepth}m / 0.50m limit)`)
            : (isHindi ? `स्थिति: चालू (${curDepth}m जल स्तर)` : `STATUS: OPERATIONAL (${curDepth}m water level)`)
        }`,
        { direction: 'top', className: 'leaflet-tactical-tooltip' }
      );
      bridgeMarker.on('click', () => onSelectEntity?.('bridge_b07'));
    }

    // 4. KILLER ADDON: Multi-Modal Helicopter LZ & NDRF Boat Crossing Pins
    if (layers.multimodal) {
      // IAF Heli-Drop LZ-01
      const heliMarker = L.marker(coords.heliBase, {
        icon: createModernPin('🚁', isHindi ? 'आईएएफ हेली-ड्रॉप LZ-01' : 'IAF Heli LZ-01', '#a855f7', false, isHindi ? 'हवाई पुनः आपूर्ति' : 'Air-Drop Capable'),
      }).addTo(group);
      heliMarker.bindTooltip(
        `<b>${isHindi ? 'भारतीय वायु सेना हेली-ड्रॉप लैंडिंग ज़ोन LZ-01' : 'IAF Emergency Heli-Drop Landing Zone LZ-01'}</b><br/>${isHindi ? 'एमआई-17 क्रायो पेलोड एयरड्रॉप तैयार' : 'MI-17 Cryo-Payload Air-Drop Ready'}`,
        { direction: 'top', className: 'leaflet-tactical-tooltip' }
      );

      // Pandu Ghat NDRF River Crossing Point
      const boatMarker = L.marker(coords.ndrfBoat, {
        icon: createModernPin('🚢', isHindi ? 'एनडीआरएफ बोट स्टेशन' : 'NDRF Boat Dock', '#06b6d4', false, isHindi ? 'जलमार्ग क्रॉसिंग' : 'River Crossing'),
      }).addTo(group);
      boatMarker.bindTooltip(
        `<b>${isHindi ? 'पांडु घाट एनडीआरएफ जलमार्ग क्रॉसिंग' : 'Pandu Ghat NDRF Amphibious River Crossing'}</b><br/>${isHindi ? 'इन्फ्लेटेबल रेस्क्यू बोट तैयार' : 'Inflatable Rescue Craft Ready'}`,
        { direction: 'top', className: 'leaflet-tactical-tooltip' }
      );
    }

    // 5. Subtle Route Label Tag
    if (layers.ttiBadges) {
      const ttiText = isB07Down ? 'Route R-14 (Safe Bypass) · TTI 340m' : 'Route R-12 (Express Corridor) · TTI 60m';
      const ttiColor = isB07Down ? '#10b981' : '#38bdf8';
      const ttiPos: [number, number] = isB07Down ? [26.122, 91.750] : [26.160, 91.720];

      const ttiIcon = L.divIcon({
        className: 'route-tag-icon',
        html: `
          <div style="
            background: rgba(9, 14, 23, 0.9);
            border: 1px solid ${ttiColor}40;
            color: ${ttiColor};
            font-family: ui-monospace, monospace;
            font-size: 10px;
            font-weight: 700;
            padding: 2px 7px;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.6);
            white-space: nowrap;
          ">
            ${ttiText}
          </div>
        `,
        iconSize: [180, 18],
        iconAnchor: [90, 9],
      });
      L.marker(ttiPos, { icon: ttiIcon }).addTo(group);
    }
  }, [state, layers, isB07Down, rec, isHindi, timeOffsetHours, curDepth]);

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleReset = () => mapInstanceRef.current?.setView([26.148, 91.735], 12.1);

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[#07090e] border border-[var(--rd-border)] rounded-xl shadow-xl">
      {/* Top Map Operational Strip */}
      <div className="z-20 flex shrink-0 items-center justify-between border-b border-[var(--rd-border)] px-3.5 py-2 bg-[#0c121c]">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-300 bg-cyan-950/70 px-2 py-0.5 rounded border border-cyan-800/50">
            <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Guwahati · NH-27</span>
          </div>

          <span className="font-bold text-xs text-white">
            {isHindi ? 'ब्रह्मपुत्र बेसिन परिचालन मानचित्र' : 'Brahmaputra Basin GIS Map'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Live CWC Stream Gauge Telemetry */}
          <div className="flex items-center gap-1.5 rounded-md px-2 py-0.5 bg-[#111a27] border border-slate-800 text-[11px] font-mono">
            <Droplets className="w-3 h-3 text-cyan-400" />
            <span className="text-slate-400">PREDICTED DEPTH:</span>
            <strong className={isB07Down ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
              {curDepth}m ({timeOffsetHours > 0 ? `T+${timeOffsetHours}h` : 'LIVE'})
            </strong>
          </div>

          {/* Minimalist Layers Toggle Dropdown */}
          <div className="relative">
            <button
              onClick={() => setLayersOpen((o) => !o)}
              className="flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded bg-[#111a27] hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
            >
              <Layers className="w-3 h-3 text-cyan-400" />
              <span>{isHindi ? 'परतें' : 'Layers'}</span>
            </button>

            {layersOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setLayersOpen(false)} />
                <div className="absolute right-0 top-[calc(100%+4px)] z-50 w-48 rounded-lg p-2.5 bg-[#0e1622] border border-slate-700 shadow-2xl space-y-1.5 text-[11px] rd-anim-up">
                  <div className="font-bold text-slate-400 uppercase text-[10px] pb-1 border-b border-slate-800">
                    {isHindi ? 'मानचित्र परतें' : 'Map Layers'}
                  </div>
                  <label className="flex cursor-pointer items-center justify-between text-slate-300 hover:text-white">
                    <span>{isHindi ? 'पुल (Bridges)' : 'Bridges'}</span>
                    <input type="checkbox" checked={layers.bridges} onChange={() => toggleLayer('bridges')} className="accent-cyan-500 rounded" />
                  </label>
                  <label className="flex cursor-pointer items-center justify-between text-slate-300 hover:text-white">
                    <span>{isHindi ? 'गलियारे (Routes)' : 'Corridors'}</span>
                    <input type="checkbox" checked={layers.corridors} onChange={() => toggleLayer('corridors')} className="accent-cyan-500 rounded" />
                  </label>
                  <label className="flex cursor-pointer items-center justify-between text-slate-300 hover:text-white">
                    <span>{isHindi ? 'सुविधाएं (Facilities)' : 'Facilities'}</span>
                    <input type="checkbox" checked={layers.facilities} onChange={() => toggleLayer('facilities')} className="accent-cyan-500 rounded" />
                  </label>
                  <label className="flex cursor-pointer items-center justify-between text-slate-300 hover:text-white">
                    <span>{isHindi ? 'बाढ़ क्षेत्र (Inundation)' : 'Flood Inundation'}</span>
                    <input type="checkbox" checked={layers.floodContours} onChange={() => toggleLayer('floodContours')} className="accent-cyan-500 rounded" />
                  </label>
                  <label className="flex cursor-pointer items-center justify-between text-slate-300 hover:text-white">
                    <span>{isHindi ? 'मल्टी-मॉडल हेली/बोट' : 'Heli-LZ & Boat Dock'}</span>
                    <input type="checkbox" checked={layers.multimodal} onChange={() => toggleLayer('multimodal')} className="accent-cyan-500 rounded" />
                  </label>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Map Canvas */}
      <div className="relative flex-1 w-full h-full min-h-[420px]">
        <div ref={mapContainerRef} className="w-full h-full" style={{ background: '#07090e' }} />

        {/* KILLER FEATURE: PREDICTIVE 6-HOUR TIME-LAPSE INUNDATION SLIDER */}
        <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2 bg-[#0c121c]/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 shadow-2xl">
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-400">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isHindi ? 'पूर्वानुमानित बाढ़ स्लाइडर:' : 'Predictive Inundation:'}</span>
          </div>

          <div className="flex items-center gap-1">
            {[0, 2, 4, 6].map((h) => (
              <button
                key={h}
                onClick={() => {
                  setTimeOffsetHours(h);
                  setIsPlayingLapse(false);
                }}
                className={`px-2 py-0.5 rounded text-[10.5px] font-mono font-bold transition-all border ${
                  timeOffsetHours === h
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-500 shadow-sm'
                    : 'bg-[#111a27] text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                {h === 0 ? 'T+0 (Now)' : `T+${h}h`}
              </button>
            ))}

            <button
              onClick={() => setIsPlayingLapse((p) => !p)}
              className={`p-1 rounded border transition-colors ${
                isPlayingLapse ? 'bg-amber-950 text-amber-300 border-amber-500' : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
              title="Play / Pause Time-Lapse"
            >
              {isPlayingLapse ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* BOTTOM SEGMENTED SCENARIO CONTROLLER */}
        <div className="absolute bottom-3 left-3 z-[1000] flex items-center gap-1.5 bg-[#0c121c]/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-800 shadow-xl text-xs">
          <span className="text-[10.5px] font-mono text-slate-400 uppercase font-bold flex items-center gap-1">
            <Shield className="w-3 h-3 text-cyan-400" />
            {isHindi ? 'सिमुलेशन:' : 'Sim:'}
          </span>
          <button
            onClick={() => {
              setSelectedScenario('nominal');
              setTimeOffsetHours(0);
              onSimulateScenario?.('nominal');
            }}
            className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all border ${
              selectedScenario === 'nominal'
                ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                : 'bg-[#111a27] text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            {isHindi ? 'सामान्य' : 'Nominal'}
          </button>
          <button
            onClick={() => {
              setSelectedScenario('rising');
              onSimulateScenario?.('rising');
            }}
            className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all border ${
              selectedScenario === 'rising'
                ? 'bg-amber-950 text-amber-300 border-amber-500'
                : 'bg-[#111a27] text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            {isHindi ? 'वृद्धि (+0.15m/h)' : 'Rising (+0.15m/h)'}
          </button>
          <button
            onClick={() => {
              setSelectedScenario('submerge');
              setTimeOffsetHours(2);
              onSimulateScenario?.('submerge');
            }}
            className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all border ${
              selectedScenario === 'submerge'
                ? 'bg-rose-950 text-rose-300 border-rose-500'
                : 'bg-[#111a27] text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            {isHindi ? 'जलमग्न (Breach)' : 'Submerge (Breach)'}
          </button>
        </div>

        {/* BOTTOM-RIGHT CONTROLS: ZOOM & RESET */}
        <div className="absolute bottom-3 right-3 z-[1000] flex items-center gap-1 bg-[#0c121c]/90 backdrop-blur-md p-1 rounded-lg border border-slate-800 shadow-xl">
          <button
            onClick={handleZoomIn}
            aria-label="Zoom In"
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomOut}
            aria-label="Zoom Out"
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleReset}
            aria-label="Reset View"
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
