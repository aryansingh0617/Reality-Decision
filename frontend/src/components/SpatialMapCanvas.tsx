import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Truck,
  Home,
  AlertTriangle,
  X,
  MapPin,
  Navigation,
} from 'lucide-react';
import type { RealityState } from '../api';
import { Badge } from './ui';

interface Props {
  state: RealityState | null;
  activePlanRouteId?: string | null;
  replayRouteId?: string | null;
  onSelectEntity?: (entityId: string) => void;
}

export const SpatialMapCanvas: React.FC<Props> = ({ state, activePlanRouteId = 'route_r12', replayRouteId = null, onSelectEntity }) => {
  const [zoom, setZoom] = useState(1);
  const [layers, setLayers] = useState({ bridges: true, routes: true, vehicles: true, shelters: true, surgeZone: true });
  const [sel, setSel] = useState<any | null>(null);

  const rec = replayRouteId ?? (state?.current_packet?.route_id || activePlanRouteId);
  const replaying = replayRouteId != null;
  const curDepth = state?.current_water_depth_m ?? 0.35;
  const riseRate = state?.water_rise_rate_m_hr ?? 0.15;
  
  // Robust check for Bridge B-07 failure across all possible state signals
  const isB07Down = replaying
    ? replayRouteId === 'route_r14'
    : (
        !state?.routes?.route_r12?.operational ||
        ['UNAVAILABLE', 'UNCERTAIN', 'FAILED', 'BLOCKED'].includes(state?.routes?.route_r12?.status || '') ||
        rec === 'route_r14' ||
        state?.current_packet?.recommendation === 'AUTHORIZE_ROUTE_R14' ||
        state?.sentinel_status === 'ALERT' ||
        (state?.last_state_change || '').toLowerCase().includes('bridge') ||
        curDepth > 0.5
      );

  const b07Status = isB07Down ? 'IMPASSABLE' : 'OPERATIONAL';
  const r12Op = b07Status === 'OPERATIONAL';
  const r14Op = true;
  const highWater = curDepth > 0.5 || isB07Down;

  const C = {
    rec: 'var(--rd-success)',
    alt: 'var(--rd-accent)',
    blocked: 'var(--rd-danger)',
    muted: 'var(--rd-text-3)',
  };

  const toggle = (k: keyof typeof layers) => setLayers((p) => ({ ...p, [k]: !p[k] }));
  const click = (n: any) => { setSel(n); onSelectEntity?.(n.id); };

  const r12Rec = rec === 'route_r12';
  const r14Rec = rec === 'route_r14';
  const r12Color = b07Status === 'OPERATIONAL' ? (r12Rec ? C.rec : C.alt) : C.blocked;
  const r14Color = r14Op ? (r14Rec ? C.rec : C.alt) : C.blocked;

  return (
    <div className="relative flex h-full flex-col overflow-hidden rd-panel">
      {/* Map bar */}
      <div className="z-10 flex shrink-0 items-center justify-between border-b border-[var(--rd-border)] px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <MapPin className="h-4 w-4" style={{ color: 'var(--rd-accent)' }} />
          <span className="t-h3" style={{ color: 'var(--rd-text)' }}>Operational Map</span>
          <span className="t-tech hidden md:inline">Brahmaputra region · 26.18°N 91.73°E</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-md px-2.5 py-1" style={{ background: 'var(--rd-bg)', border: '1px solid var(--rd-border)' }}>
            <span className="t-label">Water</span>
            <span className="t-tech" style={{ color: highWater ? 'var(--rd-danger)' : 'var(--rd-success)' }}>{curDepth}m · +{riseRate}/h</span>
          </div>
          <div className="hidden items-center gap-1.5 sm:flex">
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inset-0 rounded-full rd-ping" style={{ background: 'var(--rd-success)' }} />
              <span className="rd-dot relative" style={{ width: 8, height: 8, background: 'var(--rd-success)' }} />
            </span>
            <span className="t-tech" style={{ color: 'var(--rd-success)' }}>live feed</span>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden rd-grid-bg">
        <motion.div animate={{ scale: zoom }} transition={{ type: 'spring', stiffness: 200, damping: 25 }} className="relative h-[520px] w-[880px]">
          {/* Surge zone */}
          {layers.surgeZone && (
            <svg className="pointer-events-none absolute inset-0 h-full w-full">
              <defs>
                <radialGradient id="surge" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(229,100,94,0.14)" />
                  <stop offset="100%" stopColor="rgba(229,100,94,0)" />
                </radialGradient>
              </defs>
              <ellipse cx="470" cy="260" rx="230" ry="150" fill="url(#surge)" stroke="rgba(229,100,94,0.35)" strokeWidth="1" strokeDasharray="4 5" />
              <text x="300" y="130" fill="rgba(229,100,94,0.75)" fontSize="10.5" fontFamily="Geist, sans-serif" fontWeight="600" letterSpacing="0.05em">
                HIGH SURGE ZONE
              </text>
            </svg>
          )}

          {/* Routes */}
          {layers.routes && (
            <svg className="pointer-events-none absolute inset-0 h-full w-full">
              {/* R-14 alt/detour */}
              {r14Rec ? (
                <motion.path
                  key={`r14-rec-${r14Op}`}
                  d="M 150 410 Q 300 470 470 440 T 740 150"
                  fill="none"
                  stroke={r14Color}
                  strokeWidth={4.5}
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1.1, ease: 'easeInOut' }}
                />
              ) : (
                <path d="M 150 410 Q 300 470 470 440 T 740 150" fill="none" stroke={r14Color} strokeWidth={2.5} strokeLinecap="round" opacity={0.7} />
              )}
              {/* R-12 fast corridor */}
              {b07Status !== 'OPERATIONAL' ? (
                <motion.path
                  key={`r12-broken-${b07Status}`}
                  d="M 150 410 L 450 260 L 740 150"
                  fill="none"
                  stroke={C.blocked}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeDasharray="6 7"
                  animate={{ opacity: [1, 0.25, 1, 0.25, 0.55] }}
                  transition={{ duration: 1.5, times: [0, 0.25, 0.5, 0.75, 1] }}
                />
              ) : r12Rec ? (
                <motion.path
                  key={`r12-rec-${rec}`}
                  d="M 150 410 L 450 260 L 740 150"
                  fill="none"
                  stroke={r12Color}
                  strokeWidth={4.5}
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1.1, ease: 'easeInOut' }}
                />
              ) : (
                <path d="M 150 410 L 450 260 L 740 150" fill="none" stroke={r12Color} strokeWidth={2.5} strokeLinecap="round" opacity={0.7} />
              )}
              <text x="300" y="335" fill={r12Color} fontSize="10.5" fontFamily="Geist, sans-serif" fontWeight="600">R-12 · Fast corridor</text>
              <text x="360" y="462" fill={r14Color} fontSize="10.5" fontFamily="Geist, sans-serif" fontWeight="600">R-14 · Safe bypass</text>
            </svg>
          )}

          {/* Depot */}
          <MapNode x={128} y={388} tone={C.alt} icon={<Truck className="h-4 w-4" />} title="Fleet depot V-02" sub="10 seats · Ready" onClick={() => click({ id: 'depot', name: 'Fleet Depot (V-02)', type: 'Depot', status: 'OPERATIONAL', lat: 26.15, lon: 91.7 })} />

          {/* Bridge */}
          {layers.bridges && (
            <MapNode
              x={432}
              y={238}
              tone={b07Status === 'OPERATIONAL' ? C.alt : C.blocked}
              icon={b07Status === 'OPERATIONAL' ? <Navigation className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              title="Bridge B-07"
              sub={b07Status === 'OPERATIONAL' ? 'Passable · TTI 112m' : 'Submerged · impassable'}
              highlight={b07Status !== 'OPERATIONAL'}
              onClick={() => click({ id: 'bridge_b07', name: 'Bridge B-07', type: 'Bridge', status: b07Status, lat: 26.18, lon: 91.73 })}
            />
          )}

          {/* Shelter */}
          {layers.shelters && (
            <MapNode x={648} y={132} tone={C.rec} icon={<Home className="h-4 w-4" />} title="Shelter S-04" sub="25/100 · Open" onClick={() => click({ id: 'shelter_s04', name: 'Shelter S-04', type: 'Shelter', status: 'OPERATIONAL', lat: 26.22, lon: 91.78 })} />
          )}
        </motion.div>

        {/* Zoom controls */}
        <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1 rounded-lg p-1" style={{ background: 'var(--rd-panel)', border: '1px solid var(--rd-border)' }}>
          {[
            { i: <ZoomIn className="h-4 w-4" />, f: () => setZoom((z) => Math.min(1.5, z + 0.1)), t: 'Zoom in' },
            { i: <ZoomOut className="h-4 w-4" />, f: () => setZoom((z) => Math.max(0.8, z - 0.1)), t: 'Zoom out' },
            { i: <RotateCcw className="h-4 w-4" />, f: () => setZoom(1), t: 'Reset' },
          ].map((b, i) => (
            <button key={i} onClick={b.f} title={b.t} aria-label={b.t} className="rounded-md p-1.5 text-[var(--rd-text-3)] transition-colors hover:bg-[var(--rd-hover)] hover:text-[var(--rd-text)]">
              {b.i}
            </button>
          ))}
        </div>

        {/* Legend / layers */}
        <div className="absolute right-4 top-4 z-20 w-44 rounded-lg p-3" style={{ background: 'var(--rd-panel)', border: '1px solid var(--rd-border)' }}>
          <div className="mb-2.5 flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" style={{ color: 'var(--rd-text-3)' }} /><span className="t-label">Layers</span></div>
          <div className="space-y-1.5">
            {([['bridges', 'Bridges'], ['routes', 'Routes'], ['vehicles', 'Fleets'], ['shelters', 'Shelters'], ['surgeZone', 'Surge zone']] as const).map(([k, lbl]) => (
              <label key={k} className="flex cursor-pointer items-center justify-between text-[12px]" style={{ color: 'var(--rd-text-2)' }}>
                <span>{lbl}</span>
                <input type="checkbox" checked={layers[k]} onChange={() => toggle(k)} style={{ accentColor: 'var(--rd-accent)' }} />
              </label>
            ))}
          </div>
          <div className="mt-3 space-y-1.5 border-t border-[var(--rd-border)] pt-2.5">
            <LegendRow color={C.rec} label="Recommended" />
            <LegendRow color={C.alt} label="Alternative" />
            <LegendRow color={C.blocked} label="Blocked" />
          </div>
        </div>
      </div>

      {/* Node detail */}
      <AnimatePresence>
        {sel && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="absolute bottom-4 right-4 z-30 w-72 rounded-lg p-4"
            style={{ background: 'var(--rd-elevated)', border: '1px solid var(--rd-border-2)', boxShadow: 'var(--rd-shadow)' }}
          >
            <div className="mb-3 flex items-center justify-between border-b border-[var(--rd-border)] pb-2.5">
              <span className="t-h3" style={{ color: 'var(--rd-text)' }}>{sel.name}</span>
              <button onClick={() => setSel(null)} aria-label="Close" className="text-[var(--rd-text-3)] hover:text-[var(--rd-text)]"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-2">
              <Row k="Type" v={sel.type} />
              <Row k="Status"><Badge tone={sel.status === 'OPERATIONAL' ? 'success' : 'danger'}>{sel.status}</Badge></Row>
              <Row k="Coordinates" v={`${sel.lat}°, ${sel.lon}°`} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const MapNode: React.FC<{ x: number; y: number; tone: string; icon: React.ReactNode; title: string; sub: string; onClick: () => void; highlight?: boolean }> = ({ x, y, tone, icon, title, sub, onClick, highlight }) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    onClick={onClick}
    className="group absolute z-10 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left"
    style={{ top: y, left: x, background: 'var(--rd-elevated)', border: `1px solid ${tone}`, boxShadow: highlight ? `0 0 0 4px ${tone}22` : 'var(--rd-shadow)' }}
  >
    <span className="flex h-8 w-8 items-center justify-center rounded-md" style={{ background: `${tone}1f`, color: tone }}>{icon}</span>
    <span>
      <span className="block t-h3" style={{ color: 'var(--rd-text)' }}>{title}</span>
      <span className="block t-tech">{sub}</span>
    </span>
  </motion.button>
);

const LegendRow: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <div className="flex items-center gap-2">
    <span className="h-[3px] w-5 rounded-full" style={{ background: color }} />
    <span className="t-caption text-[11px]">{label}</span>
  </div>
);

const Row: React.FC<{ k: string; v?: string; children?: React.ReactNode }> = ({ k, v, children }) => (
  <div className="flex items-center justify-between">
    <span className="t-label">{k}</span>
    {children || <span className="t-tech" style={{ color: 'var(--rd-text)' }}>{v}</span>}
  </div>
);
