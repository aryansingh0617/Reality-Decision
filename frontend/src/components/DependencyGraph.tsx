import { useEffect, useState, useCallback } from 'react';
import ReactFlow, {
  type Node,
  type Edge,
  Position,
  Handle,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { RealityState } from '../api';
import { GitBranch, X, Maximize2 } from 'lucide-react';

const C = {
  blue: '#5b8def',
  green: '#3fb984',
  amber: '#e0a83d',
  red: '#e5645e',
  muted: '#647180',
};

const DiamondNode = ({ data }: { data: any }) => {
  const isGhost = data.isGhost;
  const isRecommended = data.isRecommended;

  const map: Record<string, string> = {
    KNOWN: C.blue,
    CONFIRMED: C.green,
    UNCERTAIN: C.amber,
    CONFLICTING: C.red,
    UNAVAILABLE: C.red,
    FAILED: C.red,
    UNKNOWN: C.muted,
  };
  const failed = data.status === 'UNAVAILABLE' || data.status === 'FAILED';
  const color = isGhost ? C.muted : isRecommended ? C.green : map[data.status] || C.muted;
  const statusLabel = isGhost
    ? 'Counterfactual'
    : data.status === 'KNOWN' || data.status === 'CONFIRMED'
    ? 'Nominal'
    : data.status === 'UNAVAILABLE'
    ? 'Failed'
    : data.status.charAt(0) + data.status.slice(1).toLowerCase();

  return (
    <div className="group flex select-none flex-col items-center justify-center">
      <Handle type="target" position={Position.Left} className="border-none opacity-0" style={{ width: 6, height: 6 }} />
      <div
        className="flex items-center justify-center transition-all duration-300 group-hover:scale-110"
        style={{
          width: 30,
          height: 30,
          transform: 'rotate(45deg)',
          borderRadius: 7,
          background: 'var(--rd-panel)',
          border: `1.5px solid ${color}`,
          borderStyle: isGhost ? 'dashed' : 'solid',
          boxShadow: isRecommended
            ? `0 0 0 4px ${color}22`
            : failed
            ? `0 0 14px ${color}66`
            : 'none',
        }}
      >
        <span style={{ width: 9, height: 9, borderRadius: 3, transform: 'rotate(45deg)', background: color }} />
      </div>
      <div className="mt-2.5 whitespace-nowrap text-center">
        <div className="text-[11px] font-semibold" style={{ color: 'var(--rd-text)' }}>{data.label}</div>
        <div className="mt-0.5 text-[9.5px] font-medium uppercase tracking-wider" style={{ color }}>{statusLabel}</div>
      </div>
      <Handle type="source" position={Position.Right} className="border-none opacity-0" style={{ width: 6, height: 6 }} />
    </div>
  );
};

const NODE_TYPES = { custom: DiamondNode };

export const DependencyGraph = ({ state }: { state: RealityState | null; activeStep?: string | null }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [rf, setRf] = useState<any | null>(null);

  const getStatus = useCallback(
    (entityId: string) => {
      if (!state) return 'UNKNOWN';
      const conflicts = state.conflicts || [];
      const routes = state.routes || {};
      const hospitals = state.hospitals || {};
      const shelters = state.shelters || {};
      const vehicles = state.vehicles || {};

      if (entityId === 'bridge_b07') {
        const st = routes.route_r12?.status || 'KNOWN';
        if (conflicts.some((c: any) => c.entity === 'bridge_b07')) return 'CONFLICTING';
        return st === 'UNAVAILABLE' ? 'UNAVAILABLE' : st;
      }
      if (routes[entityId]) return routes[entityId].status;
      if (hospitals[entityId]) return hospitals[entityId].status;
      if (shelters[entityId]) return shelters[entityId].status;
      if (vehicles[entityId]) return vehicles[entityId].available ? 'KNOWN' : 'UNAVAILABLE';
      return 'KNOWN';
    },
    [state]
  );

  useEffect(() => {
    if (!state) return;
    const conflicts = state.conflicts || [];
    const vehicles = state.vehicles || {};
    const activeRec = state.current_packet?.route_id || 'route_r12';
    const b07 = getStatus('bridge_b07');
    const r12 = getStatus('route_r12');
    const r14 = getStatus('route_r14');

    const baseNodes: Node[] = [
      { id: 'north_relay', type: 'custom', position: { x: 80, y: 180 }, data: { label: 'North Relay', type: 'Comms node', status: 'KNOWN', detail: '400 MHz mesh comms', downstream: ['Bridge B-07', 'Route R-12', 'Route R-14'] } },
      { id: 'orbit_relay', type: 'custom', position: { x: 440, y: 20 }, data: { label: 'Orbit Relay', type: 'Satellite node', status: conflicts.some((c: any) => c.entity === 'bridge_b07') ? 'CONFLICTING' : 'KNOWN', detail: 'Sentinel-2 optical imagery', downstream: ['Bridge B-07', 'Route R-14'] } },
      { id: 'bridge_b07', type: 'custom', position: { x: 260, y: 180 }, data: { label: 'Bridge B-07', type: 'Infrastructure', status: b07, detail: 'Guwahati waterway crossing', downstream: ['Route R-12', 'Depot D-03', 'Shelter S-04'] } },
      { id: 'south_depot', type: 'custom', position: { x: 260, y: 340 }, data: { label: 'South Depot', type: 'Backup hub', status: 'KNOWN', detail: 'Reserve evacuation stock', downstream: ['Vehicle V-02', 'Shelter S-04'] } },
      { id: 'route_r12', type: 'custom', position: { x: 440, y: 100 }, data: { label: 'Route R-12', type: 'Fast corridor', status: r12, detail: 'ETA 15 min · 20 slots', isRecommended: activeRec === 'route_r12', downstream: ['Depot D-03', 'Shelter S-04'] } },
      { id: 'route_r14', type: 'custom', position: { x: 440, y: 260 }, data: { label: 'Route R-14', type: 'Bypass detour', status: r14, detail: 'ETA 35 min · 15 slots', isRecommended: activeRec === 'route_r14', downstream: ['Depot D-04', 'Shelter S-04'] } },
      { id: 'depot_d03', type: 'custom', position: { x: 640, y: 100 }, data: { label: 'Depot D-03', type: 'Primary hub', status: b07 === 'UNAVAILABLE' ? 'UNCERTAIN' : 'KNOWN', detail: 'Capacity 40', downstream: ['Shelter S-04'] } },
      { id: 'depot_d04', type: 'custom', position: { x: 640, y: 260 }, data: { label: 'Depot D-04', type: 'Alternate hub', status: 'KNOWN', detail: 'Capacity 30', downstream: ['Shelter S-04'] } },
      { id: 'shelter_s04', type: 'custom', position: { x: 840, y: 180 }, data: { label: 'Shelter S-04', type: 'Target shelter', status: b07 === 'UNAVAILABLE' && activeRec !== 'route_r14' ? 'UNCERTAIN' : 'KNOWN', detail: 'Evacuees 25/50', downstream: ['Guwahati grid'] } },
      { id: 'vehicle_v02', type: 'custom', position: { x: 80, y: 360 }, data: { label: 'Vehicle V-02', type: 'Transport asset', status: vehicles.vehicle_v02?.available !== false ? 'KNOWN' : 'UNAVAILABLE', detail: 'Cap 20 · active dispatch', isRecommended: true, downstream: ['Active route'] } },
    ];

    const branchNodes: Node[] = [
      { id: 'cf_branch_c', type: 'custom', position: { x: 440, y: 350 }, data: { label: 'Branch C: Hold', type: 'Counterfactual', status: 'UNCERTAIN', detail: 'Recon latency +25m', isGhost: true, downstream: ['Recon team'] } },
    ];

    const edge = (id: string, s: string, t: string, color: string, w: number, animated = false, dash?: string): Edge => ({
      id, source: s, target: t, animated, style: { stroke: color, strokeWidth: w, strokeDasharray: dash },
    });

    const baseEdges: Edge[] = [
      edge('e-north-b07', 'north_relay', 'bridge_b07', C.blue, 1.5, true),
      edge('e-orbit-b07', 'orbit_relay', 'bridge_b07', C.blue, 1.5, true),
      edge('e-south-b07', 'south_depot', 'bridge_b07', '#2c3742', 1),
      edge('e-b07-r12', 'bridge_b07', 'route_r12', b07 === 'UNAVAILABLE' ? C.red : b07 === 'CONFLICTING' ? C.amber : C.green, activeRec === 'route_r12' ? 3 : 1.5, activeRec === 'route_r12', b07 === 'UNAVAILABLE' ? '5,4' : undefined),
      edge('e-r12-d03', 'route_r12', 'depot_d03', r12 === 'UNAVAILABLE' ? C.red : C.green, activeRec === 'route_r12' ? 3 : 1.5, activeRec === 'route_r12'),
      edge('e-d03-s04', 'depot_d03', 'shelter_s04', C.blue, 1.5, true),
      edge('e-b07-r14', 'bridge_b07', 'route_r14', activeRec === 'route_r14' ? C.green : C.blue, activeRec === 'route_r14' ? 3 : 1.5, activeRec === 'route_r14'),
      edge('e-r14-d04', 'route_r14', 'depot_d04', r14 === 'UNAVAILABLE' ? C.red : C.green, activeRec === 'route_r14' ? 3 : 1.5, activeRec === 'route_r14'),
      edge('e-d04-s04', 'depot_d04', 'shelter_s04', C.blue, 1.5, true),
      edge('e-cf-branch-c', 'bridge_b07', 'cf_branch_c', C.muted, 1.5, false, '4,4'),
    ];

    setNodes([...baseNodes, ...branchNodes]);
    setEdges(baseEdges);
  }, [state, getStatus, setNodes, setEdges]);

  const onInit = useCallback((instance: any) => {
    setRf(instance);
    setTimeout(() => instance.fitView({ padding: 0.2 }), 100);
  }, []);

  return (
    <div className="rd-panel relative flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--rd-border)] px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <GitBranch className="h-4 w-4" style={{ color: 'var(--rd-accent)' }} />
          <span className="t-h3" style={{ color: 'var(--rd-text)' }}>Infrastructure dependencies</span>
          <span className="t-tech hidden md:inline">how a failure cascades through the network</span>
        </div>
        <button onClick={() => rf?.fitView({ padding: 0.2 })} className="rd-chip cursor-pointer transition-colors hover:border-[var(--rd-border-2)]">
          <Maximize2 className="h-3.5 w-3.5" /> Fit view
        </button>
      </div>

      <div className="relative flex-1" style={{ background: 'radial-gradient(ellipse at 50% 45%, rgba(20,26,32,0.7), var(--rd-bg) 85%)' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={NODE_TYPES}
          onNodeClick={(_e, node) => setSelected(node.data)}
          onInit={onInit}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          proOptions={{ hideAttribution: true }}
          className="bg-transparent"
        >
          <Background variant={BackgroundVariant.Dots} gap={30} size={1} color="#1a222b" />
          <Controls className="!border-[var(--rd-border)]" showInteractive={false} />
        </ReactFlow>

        {selected && (
          <div className="absolute bottom-4 left-4 right-4 z-30 rounded-lg p-4 rd-anim-fade" style={{ background: 'var(--rd-elevated)', border: '1px solid var(--rd-border-2)', boxShadow: 'var(--rd-shadow)' }}>
            <div className="mb-2.5 flex items-center justify-between border-b border-[var(--rd-border)] pb-2">
              <div className="flex items-center gap-2">
                <span className="rd-dot rd-pulse" style={{ background: 'var(--rd-accent)' }} />
                <span className="t-h3" style={{ color: 'var(--rd-text)' }}>{selected.label}</span>
                <span className="t-caption">· {selected.type}</span>
              </div>
              <button onClick={() => setSelected(null)} aria-label="Close" className="text-[var(--rd-text-3)] hover:text-[var(--rd-text)]"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><div className="t-label">Status</div><div className="t-h3 mt-1" style={{ color: 'var(--rd-text)' }}>{selected.status}</div></div>
              <div><div className="t-label">Specs</div><div className="t-body-sm mt-1" style={{ color: 'var(--rd-text-2)' }}>{selected.detail}</div></div>
              <div><div className="t-label">Downstream impact</div><div className="t-body-sm mt-1" style={{ color: 'var(--rd-warn)' }}>{selected.downstream ? selected.downstream.join(', ') : 'None'}</div></div>
            </div>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between border-t border-[var(--rd-border)] px-5 py-2.5">
        <span className="t-tech">Emergency flood response · sector 04</span>
        <div className="flex items-center gap-4">
          {[['Nominal', C.blue], ['Uncertain', C.amber], ['Failed', C.red]].map(([l, c]) => (
            <span key={l} className="flex items-center gap-1.5 t-caption text-[11px]"><span className="rd-dot" style={{ background: c as string }} /> {l}</span>
          ))}
        </div>
      </div>
    </div>
  );
};
