import React from 'react';
import type { DecisionPacket } from '../api';
import {
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Sparkles,
  AlertTriangle,
  Radio,
  Compass,
  ArrowRight,
  Lock,
} from 'lucide-react';

interface DecisionPacketViewProps {
  packet: DecisionPacket | null;
  onAuthorize: (action: string) => void;
}

export const DecisionPacketView: React.FC<DecisionPacketViewProps> = ({
  packet,
  onAuthorize,
}) => {
  if (!packet) {
    return (
      <div className="w-full h-full bg-[#0d1117] border border-[#222b34] rounded-lg p-6 flex flex-col items-center justify-center text-center font-mono text-xs text-[#8a9aaa]">
        <ShieldAlert className="w-10 h-10 text-[#00f2fe] mb-3 animate-pulse" />
        <span className="text-sm font-bold text-[#e8edf2]">AWAITING AUTONOMOUS DECISION RE-PLAN</span>
        <span className="text-[11px] text-[#8a9aaa] max-w-xs mt-1">
          The Continuous Sentinel is actively monitoring reality state for hydro-infrastructure disruptions.
        </span>
      </div>
    );
  }

  const isLlmMode = packet.reasoning_mode === 'LLM_AGENTIC';
  const isAuthorized = packet.authorization_status === 'AUTHORIZED';
  const isStaleRejected = packet.authorization_status === 'STALE_REJECTED';

  return (
    <div className="w-full h-full bg-[#0d1117] border border-[#222b34] rounded-lg p-4 flex flex-col font-mono text-xs overflow-y-auto select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#222b34] mb-3">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-[#00f2fe]" />
          <span className="text-xs font-bold text-[#e8edf2]">DECISION INTELLIGENCE PACKET</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold border border-[#222b34] bg-[#07090b] text-[#00f2fe]">
            v{packet.world_state_version || 1}
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
              isLlmMode
                ? 'bg-[#a855f7]/15 border border-[#a855f7]/40 text-[#c084fc]'
                : 'bg-[#f59e0b]/15 border border-[#f59e0b]/40 text-[#fbbf24]'
            }`}
          >
            {isLlmMode ? <Sparkles className="w-3 h-3 text-[#c084fc]" /> : <Lock className="w-3 h-3 text-[#fbbf24]" />}
            <span>{isLlmMode ? 'LIVE AGENT REASONING' : 'DETERMINISTIC FALLBACK'}</span>
          </span>
        </div>
      </div>

      {/* Stale Packet Warning Banner if Version Mismatch */}
      {isStaleRejected && (
        <div className="p-3 bg-[#ef4444]/15 border border-[#ef4444] rounded text-[#f87171] mb-3 flex items-center gap-2 text-[11px] font-bold">
          <AlertTriangle className="w-4 h-4 text-[#ef4444] shrink-0" />
          <span>RACE CONDITION GATE: Authorization blocked! Reality state mutated during commander review. Revalidation required.</span>
        </div>
      )}

      {/* Primary Recommended Decision Hero Card */}
      <div className={`p-4 rounded-lg border mb-3 text-left ${
        packet.capacity_gap || packet.escalation_required
          ? 'bg-[#ef4444]/10 border-[#ef4444] crimson-glow'
          : 'bg-[#2ecc71]/10 border-[#2ecc71] emerald-glow'
      }`}>
        <div className="text-[10px] font-bold uppercase tracking-wider text-[#2ecc71] mb-1 flex items-center justify-between">
          <span>RECOMMENDED ACTION / PLAN</span>
          <span className="text-[#8a9aaa]">TTI: <strong className="text-[#e8edf2]">{packet.tti_minutes || 999}m</strong></span>
        </div>
        <div className={`text-base font-extrabold my-1 leading-snug ${packet.capacity_gap ? 'text-[#f87171]' : 'text-[#2ecc71]'}`}>
          {packet.recommendation}
        </div>
        <div className="text-[11px] text-[#8a9aaa] mt-1 flex items-center justify-between">
          <span>Route: <strong className="text-[#e8edf2]">{packet.route_id || 'N/A'}</strong></span>
          <span>Fragility: <strong className={packet.fragility === 'STABLE' ? 'text-[#2ecc71]' : 'text-[#f59e0b]'}>{packet.fragility || 'STABLE'}</strong></span>
        </div>
      </div>

      {/* Structured Option Comparison Cards */}
      <div className="mb-3">
        <div className="text-[10px] font-bold text-[#8a9aaa] uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <ArrowRight className="w-3.5 h-3.5 text-[#00f2fe]" />
          <span>EVALUATED DECISION OPTIONS</span>
        </div>
        <div className="space-y-2">
          {/* Option A: Fast Corridor */}
          <div className="p-2.5 bg-[#14191e] border border-[#222b34] rounded flex items-center justify-between">
            <div>
              <div className="font-bold text-[#e8edf2]">OPTION 01 — ROUTE R-12 (FAST CORRIDOR)</div>
              <div className="text-[10px] text-[#8a9aaa]">Transit ETA: 15m · TTI: 112m · Risk: LOW</div>
            </div>
            <span className="px-2 py-0.5 rounded bg-[#2ecc71]/20 text-[#2ecc71] text-[9px] font-bold">RECOMMENDED</span>
          </div>

          {/* Option B: Safe Bypass Detour */}
          <div className="p-2.5 bg-[#14191e] border border-[#222b34] rounded flex items-center justify-between">
            <div>
              <div className="font-bold text-[#e8edf2]">OPTION 02 — ROUTE R-14 (SAFE BYPASS DETOUR)</div>
              <div className="text-[10px] text-[#8a9aaa]">Transit ETA: 25m · TTI: 240m · Risk: VERY LOW</div>
            </div>
            <span className="px-2 py-0.5 rounded bg-[#1b222a] text-[#8a9aaa] text-[9px] font-bold">FEASIBLE DETOUR</span>
          </div>
        </div>
      </div>

      {/* Active Value-of-Information (VoI) Sensing Cards */}
      {packet.voi_rankings && packet.voi_rankings.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] font-bold text-[#8a9aaa] uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-[#00f2fe]" />
            <span>ACTIVE VALUE OF INFORMATION (VoI) RECON TASKS</span>
          </div>
          <div className="space-y-2">
            {packet.voi_rankings.map((task: any, idx: number) => (
              <div key={idx} className="p-2.5 bg-[#14191e] border border-[#00f2fe]/30 rounded text-left">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[#00f2fe]">{task.action_type || 'RECON_DRONE'} — {task.target}</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#00f2fe]/20 text-[#00f2fe] text-[9px] font-bold">VoI {task.score}/10</span>
                </div>
                <div className="text-[10px] text-[#8a9aaa]">{task.reason}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Rationale */}
      {packet.why && packet.why.length > 0 && (
        <div className="p-3 bg-[#14191e] border border-[#222b34] rounded mb-3 text-left">
          <div className="text-[10px] font-bold text-[#8a9aaa] uppercase tracking-wider mb-1">PRIMARY DECISION RATIONALE</div>
          <p className="text-[11px] text-[#e8edf2] leading-relaxed">{packet.why[0]}</p>
        </div>
      )}

      {/* Mandatory Human Authorization Buttons */}
      <div className="mt-auto pt-3 border-t border-[#222b34]">
        {packet.authorization_status === 'PENDING' ? (
          <div className="flex gap-2">
            <button
              onClick={() => onAuthorize('AUTHORIZE')}
              className="flex-1 py-2.5 bg-[#2ecc71] hover:bg-[#26b863] text-[#07090b] font-extrabold rounded flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all text-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>AUTHORIZE DECISION</span>
            </button>
            <button
              onClick={() => onAuthorize('REJECT')}
              className="px-4 py-2.5 bg-[#ef4444]/20 border border-[#ef4444] hover:bg-[#ef4444]/30 text-[#f87171] font-bold rounded flex items-center justify-center gap-1.5 cursor-pointer transition-all text-xs"
            >
              <XCircle className="w-4 h-4" />
              <span>REJECT</span>
            </button>
          </div>
        ) : (
          <div className={`p-2.5 rounded border text-center font-bold text-xs ${
            isAuthorized
              ? 'bg-[#2ecc71]/15 border-[#2ecc71] text-[#2ecc71]'
              : 'bg-[#ef4444]/15 border-[#ef4444] text-[#f87171]'
          }`}>
            <span>DECISION STATUS: {packet.authorization_status}</span>
          </div>
        )}
      </div>
    </div>
  );
};
