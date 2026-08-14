import React from 'react';
import type { DecisionPacket } from '../api';
import { Check, X, ShieldAlert, Sparkles, HelpCircle, GitBranch, Search } from 'lucide-react';

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
      <div className="panel flex flex-col items-center justify-center h-full p-8 text-[#718086] font-mono">
        <ShieldAlert className="w-10 h-10 text-[#3b4d56] mb-2" />
        <span className="text-xs">Awaiting Autonomous Re-plan...</span>
      </div>
    );
  }

  const isLlmMode = packet.provenance.some((p) => p.includes('LLM'));
  const isAuthorized = packet.authorization_status === 'AUTHORIZED';
  const isRejected = packet.authorization_status === 'REJECTED';

  return (
    <div className="panel flex flex-col h-full font-mono text-left max-h-[550px] overflow-y-auto">
      {/* Panel Header */}
      <div className="panel-header">
        <span className="panel-title">Decision Intelligence Packet</span>
        <div className="flex items-center gap-2">
          <span
            className={`text-[9px] px-2 py-0.5 font-bold rounded flex items-center gap-1 ${
              isLlmMode
                ? 'bg-purple-950 text-purple-400 border border-purple-800/40'
                : 'bg-[#182229] text-[#aab5b8]'
            }`}
          >
            {isLlmMode && <Sparkles className="w-2.5 h-2.5 text-purple-400" />}
            {isLlmMode ? 'LIVE AGENT REASONING' : 'DETERMINISTIC FALLBACK'}
          </span>
          {packet.authorization_status !== 'PENDING' && (
            <span
              className={`text-[9px] px-2 py-0.5 font-bold rounded ${
                isAuthorized
                  ? 'bg-emerald-950 text-[#65c89a] border border-emerald-800/40'
                  : isRejected
                  ? 'bg-rose-950 text-[#e45b55] border border-rose-800/40'
                  : 'bg-blue-950 text-[#6fa8dc] border border-blue-800/40'
              }`}
            >
              {packet.authorization_status}
            </span>
          )}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Replit Decision Callout */}
        <div className="decision-callout">
          <span>RECOMMENDED ACTION / PLAN</span>
          <strong className={packet.capacity_gap ? 'text-[#e45b55]' : 'text-[#f5c86e]'}>
            {packet.recommendation}
          </strong>
          <p>Mission: {packet.mission} · Policy: {packet.policy}</p>
        </div>

        {/* Missing High-Value Information */}
        {packet.missing_information && (
          <div className="border border-[#e7a23b]/40 bg-[#e7a23b]/10 rounded p-3 text-left">
            <div className="flex items-center gap-1.5 text-[#f5c86e] font-bold text-xs mb-1">
              <Search className="w-3.5 h-3.5" />
              <span>HIGHEST-VALUE MISSING INFORMATION</span>
            </div>
            <p className="text-xs text-[#f1f3f0] leading-relaxed">
              {packet.missing_information}
            </p>
          </div>
        )}

        {/* Counterfactual Branches */}
        {packet.counterfactual_branches && packet.counterfactual_branches.length > 0 && (
          <div className="border-t border-[#253139] pt-3">
            <div className="flex items-center gap-1.5 text-[9px] text-[#718086] uppercase tracking-wider mb-2 font-semibold">
              <GitBranch className="w-3 h-3 text-[#718086]" />
              <span>Evaluated Counterfactual Branches</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {packet.counterfactual_branches.map((branch, idx) => (
                <div
                  key={idx}
                  className={`border rounded p-2 text-xs flex items-center justify-between ${
                    branch.branch_status === 'RECOMMENDED'
                      ? 'border-[#65c89a]/50 bg-[#65c89a]/10 text-[#65c89a]'
                      : 'border-[#253139] bg-[#0a0f12] text-[#aab5b8]'
                  }`}
                >
                  <div>
                    <div className="font-bold text-[#f1f3f0] text-[11px]">{branch.name}</div>
                    <div className="text-[9px] text-[#718086]">{branch.recommendation} · Delay: {branch.delay_min}m</div>
                  </div>
                  <span
                    className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${
                      branch.branch_status === 'RECOMMENDED'
                        ? 'bg-[#65c89a]/20 text-[#65c89a]'
                        : 'bg-[#182229] text-[#718086]'
                    }`}
                  >
                    {branch.branch_status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Rationale */}
        <div>
          <div className="text-[9px] text-[#718086] uppercase mb-1 font-semibold">Action Rationale & Tradeoffs</div>
          <ul className="list-disc pl-4 text-xs text-[#aab5b8] space-y-1">
            {packet.why.map((w, i) => (
              <li key={i} className="leading-relaxed">{w}</li>
            ))}
          </ul>
        </div>

        {/* Critical Assumption & Consequence */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-[#253139] pt-3">
          <div>
            <div className="text-[9px] text-[#718086] uppercase mb-1">Critical Assumption</div>
            <p className="text-xs text-[#aab5b8] bg-[#0a0f12] border border-[#253139] rounded p-2 leading-relaxed">
              {packet.critical_assumption}
            </p>
          </div>
          <div>
            <div className="text-[9px] text-[#718086] uppercase mb-1">Consequence if Wrong</div>
            <p className="text-xs text-[#aab5b8] bg-[#0a0f12] border border-[#253139] rounded p-2 leading-relaxed">
              {packet.consequence_if_wrong}
            </p>
          </div>
        </div>

        {/* Replit Confidence Track Bar */}
        <div className="confidence border-t border-[#253139] pt-3">
          <div className="confidence-head">
            <span>Confidence Assessment</span>
            <b>{packet.confidence}</b>
          </div>
          <div className="confidence-track">
            <i style={{ width: packet.confidence === 'HIGH' ? '90%' : packet.confidence === 'MEDIUM' ? '65%' : '35%' }}></i>
          </div>
        </div>

        {/* Human Authorization Buttons */}
        {packet.authorization_status === 'PENDING' && (
          <div className="border-t border-[#253139] pt-3 flex gap-2">
            <button
              onClick={() => onAuthorize('AUTHORIZE')}
              className="primary-btn flex-1 flex items-center justify-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" /> AUTHORIZE PLAN
            </button>

            <button
              onClick={() => onAuthorize('REQUEST_VERIFY')}
              className="secondary-btn flex items-center justify-center gap-1.5"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#6fa8dc]" /> RECON VFY
            </button>

            <button
              onClick={() => onAuthorize('REJECT')}
              className="secondary-btn text-[#e45b55] hover:border-[#e45b55] hover:bg-[#e45b55]/10 flex items-center justify-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" /> REJECT
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
