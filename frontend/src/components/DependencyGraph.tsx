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
import { GitBranch, Maximize2 } from 'lucide-react';
import { TRANSLATIONS, type Language } from '../i18n';

const C = {
  blue: '#38bdf8',
  green: '#10b981',
  amber: '#f59e0b',
  red: '#f43f5e',
  muted: '#64748b',
};

const DiamondNode = ({ data }: { data: any }) => {
  const isGhost = data.isGhost;
  const isRecommended = data.isRecommended;

  const map: Record<string, string> = {
    KNOWN: C.blue,
    CONFIRMED: C.green,
    NOMINAL: C.blue,
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
    : data.status === 'KNOWN' || data.status === 'CONFIRMED' || data.status === 'NOMINAL'
    ? (data.lang === 'hi' ? 'सामान्य (NOMINAL)' : 'NOMINAL')
    : data.status === 'UNAVAILABLE' || data.status === 'FAILED'
    ? (data.lang === 'hi' ? 'अवरुद्ध / FAILED' : 'FAILED')
    : data.status;

  return (
    <div className="group flex select-none flex-col items-center justify-center">
      <Handle type="target" position={Position.Left} className="border-none opacity-0" style={{ width: 6, height: 6 }} />
      <div
        className="flex items-center justify-center transition-all duration-300 group-hover:scale-110"
        style={{
          width: 36,
          height: 36,
          transform: 'rotate(45deg)',
          borderRadius: 8,
          background: '#090e17',
          border: `2px solid ${color}`,
          borderStyle: isGhost ? 'dashed' : 'solid',
          boxShadow: isRecommended
            ? `0 0 20px ${color}66, inset 0 0 10px ${color}33`
            : failed
            ? `0 0 20px ${color}88, inset 0 0 10px ${color}44`
            : `0 0 16px ${color}44`,
        }}
      >
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: 3,
            background: color,
            boxShadow: `0 0 8px ${color}`,
          }}
        />
      </div>
      <div className="mt-3 whitespace-nowrap text-center">
        <div className="text-xs font-bold text-slate-100 tracking-tight">{data.label}</div>
        <div className="mt-0.5 text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color }}>
          {statusLabel}
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="border-none opacity-0" style={{ width: 6, height: 6 }} />
    </div>
  );
};

const NODE_TYPES = { custom: DiamondNode };

export const DependencyGraph = ({
  state,
  lang = 'en',
}: {
  state: RealityState | null;
  activeStep?: string | null;
  lang?: Language;
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [rf, setRf] = useState<any | null>(null);
  const isHindi = lang === 'hi';

  const getStatus = useCallback(
    (entityId: string): string => {
      if (!state) return 'NOMINAL';
      const conflicts = state.conflicts || [];
      const routes = state.routes || {};

      if (entityId === 'bridge_b07') {
        const st = routes.route_r12?.status || 'KNOWN';
        if (conflicts.some((c: any) => c.entity === 'bridge_b07')) return 'UNCERTAIN';
        if (st === 'UNAVAILABLE' || st === 'FAILED' || (state.current_water_depth_m ?? 0.35) >= 0.50) return 'FAILED';
        return 'UNCERTAIN';
      }
      return 'NOMINAL';
    },
    [state]
  );

  useEffect(() => {
    const node = (
      id: string,
      x: number,
      y: number,
      label: string,
      type: string,
      status: string,
      detail: string,
      downstream?: string[],
      isRecommended?: boolean
    ) => ({
      id,
      type: 'custom',
      position: { x, y },
      data: { id, label, type, status, detail, downstream, isRecommended, lang },
    });

    const b07Status = getStatus('bridge_b07');
    const isBridgeFailed = b07Status === 'FAILED' || b07Status === 'UNAVAILABLE';
    const r12Downstream = [isHindi ? 'दिसपुर अस्पताल H-03' : 'Dispur Hospital H-03', isHindi ? 'मिशन M-17' : 'Mission M-17'];

    const baseNodes: Node[] = [
      node(
        'bridge_b07',
        60,
        180,
        isHindi ? 'सरायघाट पुल B-07' : 'Saraighat Bridge B-07',
        isHindi ? 'ब्रह्मपुत्र नदी क्रॉसिंग' : 'River Crossing',
        b07Status,
        isHindi ? 'जल सीमा 0.50m (वर्तमान 0.35m)' : 'Water Limit 0.50m (Current 0.35m)',
        r12Downstream
      ),
      node(
        'route_r12',
        280,
        90,
        isHindi ? 'मार्ग R-12 (NH-27)' : 'Route R-12 (NH-27)',
        isHindi ? 'प्राथमिक एक्सप्रेसवे' : 'Primary Expressway',
        isBridgeFailed ? 'FAILED' : 'NOMINAL',
        isHindi ? '28 km · 15 मिनट मूल ETA' : '28 km · 15 min baseline ETA',
        r12Downstream
      ),
      node(
        'route_r14',
        280,
        270,
        isHindi ? 'मार्ग R-14 (NH-6 बाईपास)' : 'Route R-14 (NH-6 Bypass)',
        isHindi ? 'सुरक्षित बाईपास' : 'Safe Bypass',
        'NOMINAL',
        isHindi ? '42 km · 35 मिनट सुरक्षित ETA' : '42 km · 35 min safe ETA',
        [isHindi ? 'दिसपुर अस्पताल H-03' : 'Dispur Hospital H-03'],
        true
      ),
      node(
        'hosp_h03',
        520,
        180,
        isHindi ? 'दिसपुर अस्पताल H-03' : 'Dispur District Hospital H-03',
        isHindi ? 'इमरजेंसी वार्ड' : 'Emergency Facility',
        'NOMINAL',
        isHindi ? 'आपातकालीन वैक्सीन बफर: 2.5 घंटे शेष' : 'Vaccine Buffer: 2.5h remaining'
      ),
    ];

    const edge = (
      id: string,
      source: string,
      target: string,
      color: string,
      strokeWidth = 2,
      dashed = false
    ) => ({
      id,
      source,
      target,
      type: 'default', // Smooth Cubic Bezier Splines
      style: {
        stroke: color,
        strokeWidth,
        strokeDasharray: dashed ? '6, 6' : undefined,
      },
      animated: dashed,
    });

    const baseEdges: Edge[] = [
      edge('e1', 'bridge_b07', 'route_r12', isBridgeFailed ? C.red : C.blue, 2.5),
      edge('e2', 'route_r12', 'hosp_h03', isBridgeFailed ? C.red : C.blue, 2.5),
      edge('e3', 'route_r14', 'hosp_h03', C.green, 2.5, true),
    ];

    setNodes(baseNodes);
    setEdges(baseEdges);
  }, [state, getStatus, setNodes, setEdges, lang, isHindi]);

  const onInit = useCallback((instance: any) => {
    setRf(instance);
    setTimeout(() => instance.fitView({ padding: 0.25 }), 100);
  }, []);

  return (
    <div className="rd-panel relative flex h-full min-h-[520px] flex-col overflow-hidden bg-[#070b12] border border-[var(--rd-border)] rounded-xl shadow-2xl">
      {/* Exact Header matching screenshot */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-800/80 px-5 py-3 bg-[#080d16]">
        <div className="flex items-center gap-2.5">
          <GitBranch className="h-4 w-4 text-cyan-400" />
          <span className="text-sm font-bold text-white tracking-tight">
            {isHindi ? 'कारणात्मक अवसंरचना ग्राफ (Causal Infrastructure Graph)' : 'Causal Infrastructure Graph'}
          </span>
          <span className="text-xs font-mono text-slate-400 hidden md:inline ml-1">
            {isHindi ? 'पुल विफलता का पूरे नेटवर्क पर कैस्केडिंग प्रभाव' : 'how a failure cascades through the logistics network'}
          </span>
        </div>
        <button
          onClick={() => rf?.fitView({ padding: 0.25 })}
          className="px-2.5 py-1 text-xs font-mono font-bold bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700/80 flex items-center gap-1.5 transition-colors"
        >
          <Maximize2 className="h-3.5 w-3.5" /> {isHindi ? 'व्यू फिट करें' : 'Fit view'}
        </button>
      </div>

      {/* Main Canvas with Dotted Matrix Grid */}
      <div className="relative flex-1 w-full h-full min-h-[420px] bg-[#070b12]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={NODE_TYPES}
          onNodeClick={(_e, node) => setSelected(node.data)}
          onInit={onInit}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          proOptions={{ hideAttribution: true }}
          className="bg-transparent"
        >
          <Background variant={BackgroundVariant.Dots} gap={28} size={1.2} color="#1e293b" />
          <Controls
            className="!border-slate-800 !bg-[#0b121e] !rounded-lg !shadow-xl !text-slate-300"
            showInteractive={false}
          />
        </ReactFlow>

        {/* Selected Entity Drawer */}
        {selected && (
          <div className="absolute bottom-4 left-4 right-4 z-30 rounded-xl p-4 bg-[#0c1422] border border-slate-700 shadow-2xl space-y-2 rd-anim-up">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                <span className="font-bold text-sm text-white">{selected.label}</span>
                <span className="text-xs text-slate-400 font-mono">· {selected.type}</span>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white text-xs font-bold font-mono">✕</button>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <div className="text-slate-400 font-mono text-[10px] uppercase">{isHindi ? 'स्थिति' : 'Status'}</div>
                <div className="font-mono font-bold text-white mt-0.5">{selected.status}</div>
              </div>
              <div>
                <div className="text-slate-400 font-mono text-[10px] uppercase">{isHindi ? 'विनिर्देश' : 'Specs'}</div>
                <div className="text-slate-300 mt-0.5">{selected.detail}</div>
              </div>
              <div>
                <div className="text-slate-400 font-mono text-[10px] uppercase">{isHindi ? 'डाउनस्ट्रीम प्रभाव' : 'Downstream impact'}</div>
                <div className="text-amber-400 font-bold mt-0.5">{selected.downstream ? selected.downstream.join(', ') : 'None'}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Exact Footer matching screenshot */}
      <div className="flex shrink-0 items-center justify-between border-t border-slate-800/80 px-5 py-2.5 bg-[#080d16] text-xs">
        <span className="font-mono text-slate-400">Kamrup Metro NH-27 Corridor</span>
        <div className="flex items-center gap-4 font-mono">
          {[
            [isHindi ? 'सामान्य (Nominal)' : 'Nominal', C.blue],
            [isHindi ? 'अनुशंसित (Recommended)' : 'Recommended', C.green],
            [isHindi ? 'अनिश्चित (Uncertain)' : 'Uncertain', C.amber],
            [isHindi ? 'विफल (Failed)' : 'Failed', C.red],
          ].map(([l, c]: any) => (
            <span key={l} className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-full" style={{ background: c }} /> {l}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
