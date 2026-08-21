import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ShieldAlert,
  Radio,
  Truck,
  Home,
  AlertTriangle,
  X,
  Compass,
} from 'lucide-react';
import type { RealityState } from '../api';

interface SpatialMapCanvasProps {
  state: RealityState | null;
  activePlanRouteId?: string | null;
  onSelectEntity?: (entityId: string) => void;
}

export const SpatialMapCanvas: React.FC<SpatialMapCanvasProps> = ({
  state,
  activePlanRouteId = 'route_r12',
  onSelectEntity,
}) => {
  const [zoom, setZoom] = useState(1);
  const [activeLayers, setActiveLayers] = useState({
    bridges: true,
    routes: true,
    vehicles: true,
    shelters: true,
    surgeZone: true,
  });
  const [selectedNode, setSelectedNode] = useState<any | null>(null);

  const curDepth = state?.current_water_depth_m ?? 0.35;
  const riseRate = state?.water_rise_rate_m_hr ?? 0.15;
  const isR12Operational = state?.routes?.route_r12?.operational && state?.routes?.route_r12?.status !== 'UNAVAILABLE' && state?.routes?.route_r12?.status !== 'UNCERTAIN';
  const b07Status = isR12Operational ? 'OPERATIONAL' : 'IMPASSABLE';
  const r14Status = state?.routes?.route_r14?.operational ? 'OPERATIONAL' : 'IMPASSABLE';

  const toggleLayer = (key: keyof typeof activeLayers) => {
    setActiveLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleNodeClick = (node: any) => {
    setSelectedNode(node);
    if (onSelectEntity) onSelectEntity(node.id);
  };

  return (
    <div className="relative w-full h-full bg-[#0d1117] border border-[#222b34] rounded-lg overflow-hidden flex flex-col select-none">
      {/* Top Map Bar */}
      <div className="px-4 py-2.5 bg-[#14191e] border-b border-[#222b34] flex items-center justify-between font-mono text-xs z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[#00f2fe] font-bold">
            <Compass className="w-4 h-4 animate-spin-slow" />
            <span>BRAHMAPUTRA REGIONAL TACTICAL CANVAS</span>
          </div>
          <span className="text-[#8a9aaa]">|</span>
          <span className="text-[#8a9aaa]">LAT: <strong className="text-[#e8edf2]">26.1833° N</strong></span>
          <span className="text-[#8a9aaa]">LON: <strong className="text-[#e8edf2]">91.7333° E</strong></span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#07090b] border border-[#222b34] text-[10px]">
            <span className="text-[#8a9aaa]">Water Elevation:</span>
            <span className={curDepth > 0.5 ? 'text-[#ef4444] font-bold' : 'text-[#2ecc71] font-bold'}>
              {curDepth}m (+{riseRate}m/h)
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-[#2ecc71]">
            <span className="w-2 h-2 rounded-full bg-[#2ecc71] animate-ping" />
            <span>LIVE GIS FEED</span>
          </div>
        </div>
      </div>

      {/* Main SVG Spatial Canvas */}
      <div className="relative flex-1 bg-dot-grid overflow-hidden flex items-center justify-center cursor-crosshair">
        <motion.div
          animate={{ scale: zoom }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          className="relative w-[900px] h-[550px]"
        >
          {/* Hydrographic Surge Danger Zone Overlay */}
          {activeLayers.surgeZone && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-25">
              <defs>
                <pattern id="floodGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 20 M 0 0 L 20 20" fill="none" stroke="#ef4444" strokeWidth="0.5" />
                </pattern>
              </defs>
              <ellipse cx="480" cy="270" rx="220" ry="140" fill="url(#floodGrid)" stroke="#ef4444" strokeWidth="1.5" />
              <text x="400" y="260" fill="#ef4444" fontSize="10" fontFamily="monospace" fontWeight="bold">
                HIGH SURGE DANGER ZONE (TTI PREDICTED &lt; 30m)
              </text>
            </svg>
          )}

          {/* SVG Highways & Detours */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {/* Route R-12 (Fast Corridor via B-07) */}
            {activeLayers.routes && (
              <g>
                <path
                  d="M 150 420 L 450 270 L 750 150"
                  fill="none"
                  stroke={b07Status === 'OPERATIONAL' ? '#00f2fe' : '#ef4444'}
                  strokeWidth={activePlanRouteId === 'route_r12' ? '5' : '2.5'}
                  strokeDasharray={b07Status === 'OPERATIONAL' ? 'none' : '6 4'}
                  className="transition-all duration-300"
                />
                <text x="320" y="320" fill={b07Status === 'OPERATIONAL' ? '#00f2fe' : '#ef4444'} fontSize="11" fontFamily="monospace" fontWeight="bold">
                  Route R-12 (Fast Corridor)
                </text>
              </g>
            )}

            {/* Route R-14 (Safe Bypass Detour) */}
            {activeLayers.routes && (
              <g>
                <path
                  d="M 150 420 Q 300 480 480 450 T 750 150"
                  fill="none"
                  stroke={r14Status === 'OPERATIONAL' ? '#2ecc71' : '#f59e0b'}
                  strokeWidth={activePlanRouteId === 'route_r14' ? '5' : '2.5'}
                />
                <text x="380" y="470" fill="#2ecc71" fontSize="11" fontFamily="monospace" fontWeight="bold">
                  Route R-14 (Safe Bypass Detour)
                </text>
              </g>
            )}
          </svg>

          {/* Interactive Spatial Markers */}

          {/* 1. Origin Depot / Fleet Hub */}
          <motion.div
            whileHover={{ scale: 1.1 }}
            onClick={() => handleNodeClick({ id: 'depot_guwahati', name: 'Evacuation Fleet Depot', type: 'Depot', status: 'OPERATIONAL', lat: 26.15, lon: 91.70 })}
            className="absolute top-[400px] left-[130px] p-2 bg-[#14191e] border-2 border-[#00f2fe] rounded-lg cursor-pointer shadow-lg flex items-center gap-2 group z-10"
          >
            <div className="w-7 h-7 rounded bg-[#00f2fe]/20 flex items-center justify-center text-[#00f2fe]">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#e8edf2] group-hover:text-[#00f2fe] transition-colors">FLEET DEPOT (V-02)</div>
              <div className="text-[9px] font-mono text-[#8a9aaa]">Cap: 10Slots | Ready</div>
            </div>
          </motion.div>

          {/* 2. Critical Bridge B-07 Node */}
          {activeLayers.bridges && (
            <motion.div
              whileHover={{ scale: 1.1 }}
              onClick={() => handleNodeClick({ id: 'bridge_b07', name: 'Bridge B-07 (Tributary)', type: 'Bridge', status: b07Status, lat: 26.18, lon: 91.73 })}
              className={`absolute top-[250px] left-[435px] p-2.5 rounded-lg border-2 cursor-pointer shadow-xl z-20 transition-all ${
                b07Status === 'OPERATIONAL'
                  ? 'bg-[#14191e] border-[#00f2fe] cyan-glow'
                  : 'bg-[#ef4444]/15 border-[#ef4444] crimson-glow'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded flex items-center justify-center ${b07Status === 'OPERATIONAL' ? 'bg-[#00f2fe]/20 text-[#00f2fe]' : 'bg-[#ef4444]/20 text-[#ef4444]'}`}>
                  {b07Status === 'OPERATIONAL' ? <ShieldAlert className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4 animate-bounce" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-[#e8edf2]">BRIDGE B-07</div>
                  <div className={`text-[10px] font-mono font-bold ${b07Status === 'OPERATIONAL' ? 'text-[#00f2fe]' : 'text-[#ef4444]'}`}>
                    {b07Status === 'OPERATIONAL' ? 'PASSABLE (TTI: 112m)' : 'SUBMERGED / IMPASSABLE'}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* 3. Destination Shelter S-04 Node */}
          {activeLayers.shelters && (
            <motion.div
              whileHover={{ scale: 1.1 }}
              onClick={() => handleNodeClick({ id: 'shelter_s04', name: 'Shelter S-04 (Silchar)', type: 'Shelter', status: 'OPERATIONAL', lat: 26.22, lon: 91.78 })}
              className="absolute top-[130px] left-[730px] p-2.5 bg-[#14191e] border-2 border-[#2ecc71] rounded-lg cursor-pointer shadow-xl z-10 flex items-center gap-2 group"
            >
              <div className="w-8 h-8 rounded bg-[#2ecc71]/20 flex items-center justify-center text-[#2ecc71]">
                <Home className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#e8edf2] group-hover:text-[#2ecc71] transition-colors">SHELTER S-04</div>
                <div className="text-[10px] font-mono text-[#2ecc71]">Occ: 25/100 | Open</div>
              </div>
            </motion.div>
          )}

          {/* Recon Drone Flight Orbit Path Animation */}
          <div className="absolute top-[210px] left-[400px] pointer-events-none">
            <div className="relative w-[130px] h-[130px] border border-dashed border-[#00f2fe]/40 rounded-full animate-spin-slow flex items-center justify-center">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 p-1 bg-[#00f2fe] rounded-full shadow-md">
                <Radio className="w-3 h-3 text-[#07090b]" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Map Control Buttons */}
        <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-[#14191e] border border-[#222b34] p-1.5 rounded-lg shadow-xl z-20">
          <button
            onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}
            className="p-1.5 rounded text-[#8a9aaa] hover:text-[#e8edf2] hover:bg-[#1b222a] transition-all cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.8, z - 0.1))}
            className="p-1.5 rounded text-[#8a9aaa] hover:text-[#e8edf2] hover:bg-[#1b222a] transition-all cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="p-1.5 rounded text-[#8a9aaa] hover:text-[#e8edf2] hover:bg-[#1b222a] transition-all cursor-pointer"
            title="Reset Zoom"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* GIS Layer Control Overlay */}
        <div className="absolute top-4 right-4 bg-[#14191e] border border-[#222b34] p-3 rounded-lg shadow-xl z-20 w-48 text-xs font-mono">
          <div className="text-[11px] font-bold text-[#8a9aaa] uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#00f2fe]" />
            <span>GIS LAYERS</span>
          </div>
          <div className="space-y-1.5">
            <label className="flex items-center justify-between text-[#e8edf2] cursor-pointer hover:text-[#00f2fe]">
              <span>Bridges</span>
              <input type="checkbox" checked={activeLayers.bridges} onChange={() => toggleLayer('bridges')} className="accent-[#00f2fe]" />
            </label>
            <label className="flex items-center justify-between text-[#e8edf2] cursor-pointer hover:text-[#00f2fe]">
              <span>Corridors</span>
              <input type="checkbox" checked={activeLayers.routes} onChange={() => toggleLayer('routes')} className="accent-[#00f2fe]" />
            </label>
            <label className="flex items-center justify-between text-[#e8edf2] cursor-pointer hover:text-[#00f2fe]">
              <span>Fleets</span>
              <input type="checkbox" checked={activeLayers.vehicles} onChange={() => toggleLayer('vehicles')} className="accent-[#00f2fe]" />
            </label>
            <label className="flex items-center justify-between text-[#e8edf2] cursor-pointer hover:text-[#00f2fe]">
              <span>Shelters</span>
              <input type="checkbox" checked={activeLayers.shelters} onChange={() => toggleLayer('shelters')} className="accent-[#00f2fe]" />
            </label>
            <label className="flex items-center justify-between text-[#e8edf2] cursor-pointer hover:text-[#00f2fe]">
              <span>Surge Zone</span>
              <input type="checkbox" checked={activeLayers.surgeZone} onChange={() => toggleLayer('surgeZone')} className="accent-[#00f2fe]" />
            </label>
          </div>
        </div>
      </div>

      {/* Selected Node Detail Drawer */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-4 right-4 bg-[#14191e] border border-[#2e3844] p-4 rounded-lg shadow-2xl z-30 w-80 text-xs"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#222b34] mb-3">
              <div className="font-bold text-[#e8edf2]">{selectedNode.name}</div>
              <button onClick={() => setSelectedNode(null)} className="text-[#8a9aaa] hover:text-[#e8edf2] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-[#8a9aaa]">Node Type:</span>
                <span className="text-[#00f2fe] font-bold">{selectedNode.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8a9aaa]">Operational Status:</span>
                <span className={selectedNode.status === 'OPERATIONAL' ? 'text-[#2ecc71] font-bold' : 'text-[#ef4444] font-bold'}>
                  {selectedNode.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8a9aaa]">Coordinates:</span>
                <span className="text-[#e8edf2]">{selectedNode.lat}°, {selectedNode.lon}°</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
