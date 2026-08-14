import React, { useEffect, useState, useCallback } from 'react';
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
import { Crosshair, X, Maximize2 } from 'lucide-react';

// Replit / Military Tactical Diamond Node Component (Matching Reference UI)
const TacticalDiamondNode = ({ data }: { data: any }) => {
  const isGhost = data.isGhost;
  const isRecommended = data.isRecommended;

  const stateColors: Record<string, { border: string; bg: string; text: string; dot: string; glow: string }> = {
    KNOWN: { border: 'border-[#6fa8dc]', bg: 'bg-[#0d1418]', text: 'text-[#6fa8dc]', dot: 'bg-[#6fa8dc]', glow: 'shadow-[#6fa8dc]/30' },
    CONFIRMED: { border: 'border-[#65c89a]', bg: 'bg-[#0d1418]', text: 'text-[#65c89a]', dot: 'bg-[#65c89a]', glow: 'shadow-[#65c89a]/30' },
    UNCERTAIN: { border: 'border-[#e7a23b]', bg: 'bg-[#0d1418]', text: 'text-[#e7a23b]', dot: 'bg-[#e7a23b]', glow: 'shadow-[#e7a23b]/30' },
    CONFLICTING: { border: 'border-[#e45b55]', bg: 'bg-[#0d1418]', text: 'text-[#e45b55]', dot: 'bg-[#e45b55]', glow: 'shadow-[#e45b55]/30' },
    UNAVAILABLE: { border: 'border-[#e45b55]', bg: 'bg-[#0d1418]', text: 'text-[#e45b55]', dot: 'bg-[#e45b55]', glow: 'shadow-[#e45b55]/30' },
    FAILED: { border: 'border-[#e45b55]', bg: 'bg-[#0d1418]', text: 'text-[#e45b55]', dot: 'bg-[#e45b55]', glow: 'shadow-[#e45b55]/30' },
    UNKNOWN: { border: 'border-[#718086]', bg: 'bg-[#0d1418]', text: 'text-[#718086]', dot: 'bg-[#718086]', glow: 'shadow-none' },
  };

  const style = stateColors[data.status] || stateColors.UNKNOWN;
  const statusLabel = isGhost
    ? 'COUNTERFACTUAL'
    : data.status === 'KNOWN' || data.status === 'CONFIRMED'
    ? 'NOMINAL'
    : data.status === 'UNAVAILABLE'
    ? 'FAILED'
    : data.status;

  return (
    <div className="flex flex-col items-center justify-center font-mono cursor-pointer group select-none">
      <Handle type="target" position={Position.Left} className="w-1.5 h-1.5 bg-[#718086] border-none opacity-0" />
      
      {/* Outer Diamond Marker matching reference image */}
      <div
        className={`w-7 h-7 border flex items-center justify-center transition-all duration-300 shadow-md ${
          data.status === 'UNAVAILABLE' || data.status === 'FAILED'
            ? 'neon-node-failed bg-[#10171c] border-[#ff453a] scale-110'
            : isGhost
            ? 'rotate-45 border-[#718086] border-dashed bg-transparent'
            : isRecommended
            ? 'rotate-45 border-[#34c759] bg-[#0e151b] ring-2 ring-[#34c759]/60 shadow-[0_0_20px_rgba(52,199,89,0.5)] scale-110'
            : `rotate-45 ${style.border} ${style.bg} ${style.glow}`
        } group-hover:scale-115`}
      >
        <div className={`w-2.5 h-2.5 rotate-45 ${isGhost ? 'bg-[#718086]' : isRecommended ? 'bg-[#34c759]' : style.dot}`}></div>
      </div>

      {/* Label & Status underneath node */}
      <div className="mt-2 text-center whitespace-nowrap">
        <div className="text-[11px] font-extrabold tracking-wider text-[#f1f3f0] uppercase">
          {data.label}
        </div>
        <div className={`text-[9px] font-mono font-bold tracking-widest uppercase mt-0.5 ${style.text}`}>
          {statusLabel}
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="w-1.5 h-1.5 bg-[#718086] border-none opacity-0" />
    </div>
  );
};

const NODE_TYPES = {
  custom: TacticalDiamondNode,
};

interface DependencyGraphProps {
  state: RealityState;
}

export const DependencyGraph: React.FC<DependencyGraphProps> = ({ state }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeData, setSelectedNodeData] = useState<any | null>(null);
  const [rfInstance, setRfInstance] = useState<any | null>(null);

  // Helper to determine entity status
  const getStatus = useCallback((entityId: string) => {
    if (entityId === 'bridge_b07') {
      const st = state.routes.route_r12?.status || 'KNOWN';
      if (state.conflicts.some((c) => c.entity === 'bridge_b07')) {
        return 'CONFLICTING';
      }
      return st === 'UNAVAILABLE' ? 'UNAVAILABLE' : st;
    }
    if (state.routes[entityId]) return state.routes[entityId].status;
    if (state.hospitals[entityId]) return state.hospitals[entityId].status;
    if (state.shelters[entityId]) return state.shelters[entityId].status;
    if (state.vehicles[entityId]) return state.vehicles[entityId].available ? 'KNOWN' : 'UNAVAILABLE';
    return 'KNOWN';
  }, [state]);

  const activeRec = state.current_packet?.route_id || 'route_r12';
  const b07Status = getStatus('bridge_b07');
  const r12Status = getStatus('route_r12');
  const r14Status = getStatus('route_r14');

  // Build Nodes & Edges on state change
  useEffect(() => {
    const baseNodes: Node[] = [
      {
        id: 'north_relay',
        type: 'custom',
        position: { x: 80, y: 180 },
        data: {
          label: 'North Relay',
          type: 'Comms Node',
          status: 'KNOWN',
          detail: '400 MHz Mesh Comms',
          downstream: ['Bridge B-07', 'Route R-12', 'Route R-14'],
        },
      },
      {
        id: 'orbit_relay',
        type: 'custom',
        position: { x: 440, y: 20 },
        data: {
          label: 'Orbit Relay',
          type: 'Satellite Node',
          status: state.conflicts.some((c) => c.entity === 'bridge_b07') ? 'CONFLICTING' : 'KNOWN',
          detail: 'Sent-2 Optical Imagery',
          downstream: ['Bridge B-07', 'Route R-14'],
        },
      },
      {
        id: 'bridge_b07',
        type: 'custom',
        position: { x: 260, y: 180 },
        data: {
          label: 'Bridge B-07',
          type: 'Infrastructure',
          status: b07Status,
          detail: 'Guwahati Waterway Crossing',
          downstream: ['Route R-12', 'Depot D-03', 'Shelter S-04'],
        },
      },
      {
        id: 'south_depot',
        type: 'custom',
        position: { x: 260, y: 340 },
        data: {
          label: 'South Depot',
          type: 'Backup Hub',
          status: 'KNOWN',
          detail: 'Reserve Evacuation Stock',
          downstream: ['Rescue Vehicle V-02', 'Shelter S-04'],
        },
      },
      {
        id: 'route_r12',
        type: 'custom',
        position: { x: 440, y: 100 },
        data: {
          label: 'Route R-12',
          type: 'Fast Corridor',
          status: r12Status,
          detail: 'ETA: 15 min · 20 Slots',
          isRecommended: activeRec === 'route_r12',
          downstream: ['Depot D-03', 'Shelter S-04'],
        },
      },
      {
        id: 'route_r14',
        type: 'custom',
        position: { x: 440, y: 260 },
        data: {
          label: 'Route R-14',
          type: 'Bypass Detour',
          status: r14Status,
          detail: 'ETA: 35 min · 15 Slots',
          isRecommended: activeRec === 'route_r14',
          downstream: ['Depot D-04', 'Shelter S-04'],
        },
      },
      {
        id: 'depot_d03',
        type: 'custom',
        position: { x: 640, y: 100 },
        data: {
          label: 'Depot D-03',
          type: 'Primary Hub',
          status: b07Status === 'UNAVAILABLE' ? 'UNCERTAIN' : 'KNOWN',
          detail: 'Capacity: 40',
          downstream: ['Shelter S-04'],
        },
      },
      {
        id: 'depot_d04',
        type: 'custom',
        position: { x: 640, y: 260 },
        data: {
          label: 'Depot D-04',
          type: 'Alternate Hub',
          status: 'KNOWN',
          detail: 'Capacity: 30',
          downstream: ['Shelter S-04'],
        },
      },
      {
        id: 'shelter_s04',
        type: 'custom',
        position: { x: 840, y: 180 },
        data: {
          label: 'Shelter S-04',
          type: 'Target Shelter',
          status: b07Status === 'UNAVAILABLE' && activeRec !== 'route_r14' ? 'UNCERTAIN' : 'KNOWN',
          detail: 'Evacuees: 25/50',
          downstream: ['Guwahati Grid'],
        },
      },
      {
        id: 'vehicle_v02',
        type: 'custom',
        position: activeRec === 'route_r14' ? { x: 440, y: 290 } : { x: 440, y: 130 },
        data: {
          label: 'Vehicle V-02',
          type: 'Transport Asset',
          status: state.vehicles.vehicle_v02?.available !== false ? 'KNOWN' : 'UNAVAILABLE',
          detail: 'Cap: 20 · Active Dispatch',
          isRecommended: true,
          downstream: ['Active Evacuation Route'],
        },
      },
    ];

    const branchNodes: Node[] = [
      {
        id: 'cf_branch_c',
        type: 'custom',
        position: { x: 440, y: 350 },
        data: {
          label: 'Branch C: Hold/Wait',
          type: 'Counterfactual',
          status: 'UNCERTAIN',
          detail: 'Recon Latency +25m',
          isGhost: true,
          downstream: ['Verification Recon Team'],
        },
      },
    ];

    const baseEdges: Edge[] = [
      {
        id: 'e-north-b07',
        source: 'north_relay',
        target: 'bridge_b07',
        animated: true,
        style: { stroke: '#6fa8dc', strokeWidth: 1.5 },
      },
      {
        id: 'e-orbit-b07',
        source: 'orbit_relay',
        target: 'bridge_b07',
        animated: true,
        style: { stroke: '#6fa8dc', strokeWidth: 1.5 },
      },
      {
        id: 'e-south-b07',
        source: 'south_depot',
        target: 'bridge_b07',
        animated: false,
        style: { stroke: '#3b4d56', strokeWidth: 1 },
      },
      {
        id: 'e-b07-r12',
        source: 'bridge_b07',
        target: 'route_r12',
        animated: activeRec === 'route_r12',
        style: {
          stroke: b07Status === 'UNAVAILABLE' ? '#e45b55' : b07Status === 'CONFLICTING' ? '#e7a23b' : '#65c89a',
          strokeWidth: activeRec === 'route_r12' ? 3.5 : 2,
          strokeDasharray: b07Status === 'UNAVAILABLE' ? '4,4' : undefined,
        },
      },
      {
        id: 'e-r12-d03',
        source: 'route_r12',
        target: 'depot_d03',
        animated: activeRec === 'route_r12',
        style: {
          stroke: r12Status === 'UNAVAILABLE' ? '#e45b55' : '#65c89a',
          strokeWidth: activeRec === 'route_r12' ? 3.5 : 2,
        },
      },
      {
        id: 'e-d03-s04',
        source: 'depot_d03',
        target: 'shelter_s04',
        animated: true,
        style: { stroke: '#6fa8dc', strokeWidth: 2 },
      },
      {
        id: 'e-b07-r14',
        source: 'bridge_b07',
        target: 'route_r14',
        animated: activeRec === 'route_r14',
        style: {
          stroke: activeRec === 'route_r14' ? '#65c89a' : '#6fa8dc',
          strokeWidth: activeRec === 'route_r14' ? 3.5 : 1.5,
        },
      },
      {
        id: 'e-r14-d04',
        source: 'route_r14',
        target: 'depot_d04',
        animated: activeRec === 'route_r14',
        style: {
          stroke: r14Status === 'UNAVAILABLE' ? '#e45b55' : '#65c89a',
          strokeWidth: activeRec === 'route_r14' ? 3.5 : 2,
        },
      },
      {
        id: 'e-d04-s04',
        source: 'depot_d04',
        target: 'shelter_s04',
        animated: true,
        style: { stroke: '#6fa8dc', strokeWidth: 2 },
      },
      {
        id: 'e-cf-branch-c',
        source: 'bridge_b07',
        target: 'cf_branch_c',
        animated: false,
        style: { stroke: '#718086', strokeWidth: 1.5, strokeDasharray: '4,4' },
      },
    ];

    setNodes([...baseNodes, ...branchNodes]);
    setEdges(baseEdges);
  }, [state, getStatus, activeRec, b07Status, r12Status, r14Status, setNodes, setEdges]);

  // Fit View handler
  const handleFitView = useCallback(() => {
    if (rfInstance) {
      rfInstance.fitView({ padding: 0.2 });
    }
  }, [rfInstance]);

  // Auto fit view on load
  const onInit = useCallback((instance: any) => {
    setRfInstance(instance);
    setTimeout(() => {
      instance.fitView({ padding: 0.2 });
    }, 100);
  }, []);

  return (
    <div className="panel flex flex-col font-mono text-left relative min-h-[500px] h-[500px] bg-[#07090b] border border-[#253139] rounded-lg overflow-hidden shadow-2xl">
      {/* Top Banner matching reference image */}
      <div className="px-4 py-2 bg-[#0a0f12] border-b border-[#253139] flex items-center justify-between text-[10px] text-[#718086]">
        <span className="font-bold tracking-widest text-[#f1f3f0]">CURRENT REALITY</span>
        <div className="flex items-center gap-3">
          <span className="text-[#65c89a] font-bold">SIMULATION ACTIVE</span>
          <span>/</span>
          <span>LIVE LOCAL STATE</span>
        </div>
      </div>

      {/* Inner Header matching reference image */}
      <div className="px-4 py-3 bg-[#0d1418]/90 border-b border-[#253139] flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <Crosshair className="w-3.5 h-3.5 text-[#6fa8dc]" />
          <h3 className="text-xs font-extrabold text-[#f1f3f0] uppercase tracking-wider">
            ASSET / ROUTE MAP
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleFitView}
            className="text-[9px] px-2.5 py-1 rounded border border-[#253139] bg-[#0d1418] text-[#aab5b8] hover:text-[#f1f3f0] hover:border-[#6fa8dc] flex items-center gap-1.5 transition-all font-bold"
          >
            <Maximize2 className="w-3 h-3 text-[#6fa8dc]" /> FIT VIEW
          </button>
          <span className="text-[10px] font-bold text-[#718086] uppercase tracking-wider">
            NORTH CORRIDOR / 04
          </span>
        </div>
      </div>

      {/* Atmospheric Canvas Wrapper with Explicit Height */}
      <div
        className="flex-1 w-full h-[380px] relative"
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, rgba(15, 30, 45, 0.75), #07090b 85%)',
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={NODE_TYPES}
          onNodeClick={(_evt, node) => setSelectedNodeData(node.data)}
          onInit={onInit}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          proOptions={{ hideAttribution: true }}
          className="bg-transparent"
        >
          <Background variant={BackgroundVariant.Lines} gap={36} size={1} color="#182229" />
          <Controls className="bg-[#0d1418] border border-[#253139] text-[#aab5b8] fill-[#aab5b8]" />
        </ReactFlow>

        {/* Selected Node Telemetry Inspector Popup */}
        {selectedNodeData && (
          <div className="absolute left-4 bottom-14 right-4 bg-[#0d1418]/95 border border-[#6fa8dc]/50 rounded p-3 text-xs shadow-2xl backdrop-blur z-30 font-mono">
            <div className="flex items-center justify-between border-b border-[#253139] pb-1.5 mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#6fa8dc] animate-pulse"></span>
                <strong className="text-[#f1f3f0] uppercase">{selectedNodeData.label} Telemetry</strong>
                <span className="text-[9px] text-[#718086]">({selectedNodeData.type})</span>
              </div>
              <button
                onClick={() => setSelectedNodeData(null)}
                className="text-[#718086] hover:text-[#f1f3f0]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-[10px]">
              <div>
                <span className="text-[#718086] block uppercase">Live Status</span>
                <span className="text-[#65c89a] font-bold uppercase">{selectedNodeData.status}</span>
              </div>
              <div>
                <span className="text-[#718086] block uppercase">Operational Specs</span>
                <span className="text-[#aab5b8]">{selectedNodeData.detail}</span>
              </div>
              <div>
                <span className="text-[#718086] block uppercase">Downstream Dependency Impact</span>
                <span className="text-[#f5c86e]">
                  {selectedNodeData.downstream ? selectedNodeData.downstream.join(', ') : 'None'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom HUD Overlay matching reference image */}
      <div className="px-4 py-2 bg-[#0a0f12] border-t border-[#253139] flex items-center justify-between text-[10px] text-[#718086]">
        <span>SECTOR 04  /  ASSAM FLOOD RESPONSE  /  SIMULATED</span>
        <div className="flex items-center gap-4 font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#6fa8dc]"></span> nominal
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#e7a23b]"></span> uncertain
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#e45b55]"></span> failed
          </span>
        </div>
      </div>
    </div>
  );
};
