import React, { useState } from 'react';
import { Activity, ShieldAlert, GitBranch, AlertTriangle, Search, RefreshCw, CheckCircle2, X, ArrowRight } from 'lucide-react';
import type { DecisionPacket } from '../api';

interface CausalTraceProps {
  packet: DecisionPacket | null;
  replanCount: number;
}

export const CausalTrace: React.FC<CausalTraceProps> = ({ packet, replanCount }) => {
  const [selectedStep, setSelectedStep] = useState<any | null>(null);

  const isB07Down = packet?.why.some(w => w.includes('Bridge')) || packet?.recommendation.includes('R-14') || packet?.recommendation.includes('ESCALATION');

  const steps = [
    {
      label: 'REALITY',
      agent: 'Orchestrator',
      icon: Activity,
      detail: 'Guwahati Sector 04 Operational',
      input: 'Initial observations: Bridge B-07 open, Route R-12 accessible.',
      reasoning: 'Nominal baseline operational parameters.',
      output: 'Mission Status: NOMINAL',
      time: '00:00',
    },
    {
      label: 'FAILURE',
      agent: 'Evidence Agent',
      icon: ShieldAlert,
      detail: isB07Down ? 'Bridge B-07 Submerged' : 'Nominal Operational State',
      input: 'Event stream: Bridge B-07 status set to UNAVAILABLE.',
      reasoning: 'High flood water detected at Guwahati Waterway. B-07 structural failure.',
      output: 'Entity B-07 → UNAVAILABLE',
      time: '00:01',
    },
    {
      label: 'CASCADE',
      agent: 'Dependency Agent',
      icon: GitBranch,
      detail: 'Route R-12 Blocked → Evacuation Risk',
      input: 'Dependency graph traversal for B-07.',
      reasoning: 'B-07 failure propagates to dependent fast corridor Route R-12, degrading Depot D-03.',
      output: 'Route R-12 → BLOCKED',
      time: '00:02',
    },
    {
      label: 'SIMULATE',
      agent: 'Counterfactual Simulation Agent',
      icon: RefreshCw,
      detail: '3 Candidate Futures Evaluated',
      input: 'Cloned mission state deepcopy.',
      reasoning: 'Evaluated Branch A (Direct R-12), Branch B (Safe Bypass R-14), Branch C (Hold & Verify).',
      output: '3 Counterfactual Candidate Branches Generated',
      time: '00:03',
    },
    {
      label: 'CRITIQUE',
      agent: 'Critic Agent',
      icon: AlertTriangle,
      detail: packet?.authorization_status === 'REJECTED' ? 'Critic Rejected Plan' : 'Checked Constraint Boundaries',
      input: 'Proposed decision packet.',
      reasoning: 'Challenged direct corridor assumptions under active bridge failure. Identified R-12 failure mode.',
      output: 'Critique Review Complete',
      time: '00:04',
    },
    {
      label: 'INFO GAP',
      agent: 'Information Value Agent',
      icon: Search,
      detail: packet?.missing_information ? packet.missing_information.split(':')[0] : 'Route R-14 Load Rating Evaluated',
      input: 'Active uncertainties set.',
      reasoning: 'Quantified Information Value Score (V = Score × Impact). Ranked missing observation priorities.',
      output: 'Top Info Gap Identified',
      time: '00:05',
    },
    {
      label: 'REPLAN',
      agent: 'Decision Agent',
      icon: RefreshCw,
      detail: `Autonomous Re-plan Cycle #${replanCount}`,
      input: 'Policy constraints & risk trade-offs.',
      reasoning: 'Synthesized evidence, simulations, and criticism. Selected bypass detour Route R-14.',
      output: 'New Plan Formulated',
      time: '00:06',
    },
    {
      label: 'NEW PLAN',
      agent: 'Verification Agent',
      icon: CheckCircle2,
      detail: packet?.recommendation || 'Target Evacuation Plan Selected',
      input: 'Final decision packet.',
      reasoning: 'Verified capacity, route availability, and decision window constraints.',
      output: 'Decision Packet Finalized',
      time: '00:07',
      isFinal: true,
    },
  ];

  return (
    <div className="panel font-mono text-left relative flex flex-col h-full">
      <div className="panel-header">
        <span className="panel-title">Why the System Changed Its Mind (Adaptation Flow)</span>
        <span className="panel-tag">CAUSAL PIPELINE · {replanCount} CYCLES</span>
      </div>

      {/* Visual Delta Banner */}
      <div className="p-3 bg-[#0a0f12] border-b border-[#253139] grid grid-cols-1 md:grid-cols-5 gap-2 text-center text-xs">
        <div className="border border-[#253139] bg-[#07090b] p-2 rounded">
          <span className="text-[9px] text-[#718086] block font-bold uppercase">01 BEFORE</span>
          <span className="text-[#65c89a] font-bold text-[11px]">R-12 FAST CORRIDOR</span>
        </div>
        <div className="flex items-center justify-center text-[#e45b55] border border-[#e45b55]/30 bg-[#e45b55]/10 p-2 rounded">
          <ArrowRight className="w-3 h-3 mr-1 hidden md:block" />
          <span className="font-bold text-[10px]">02 DISRUPTION: B-07 FAILURE</span>
        </div>
        <div className="border border-[#e7a23b]/30 bg-[#e7a23b]/10 p-2 rounded text-[#f5c86e]">
          <span className="text-[9px] text-[#e7a23b] block font-bold uppercase">03 CASCADE</span>
          <span className="font-bold text-[11px]">R-12 INOPERABLE</span>
        </div>
        <div className="border border-[#6fa8dc]/30 bg-[#6fa8dc]/10 p-2 rounded text-[#9cc7ed]">
          <span className="text-[9px] text-[#6fa8dc] block font-bold uppercase">04 AI RE-EVALUATION</span>
          <span className="font-bold text-[11px]">TOOLS & COUNTERFACTUALS</span>
        </div>
        <div className="border border-[#65c89a]/50 bg-[#65c89a]/10 p-2 rounded text-[#65c89a]">
          <span className="text-[9px] text-[#65c89a] block font-bold uppercase">05 ADAPTED PLAN</span>
          <span className="font-bold text-[11px] truncate block">{packet?.recommendation || 'R-14 SAFE DETOUR'}</span>
        </div>
      </div>

      <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5 flex-1 overflow-y-auto">
        {steps.map((s, idx) => {
          const Icon = s.icon;
          const isFinal = s.isFinal;

          return (
            <button
              key={idx}
              onClick={() => setSelectedStep(s)}
              className={`border rounded p-2.5 flex flex-col justify-between text-left transition-all hover:border-[#6fa8dc] cursor-pointer ${
                isFinal
                  ? 'border-[#65c89a]/50 bg-[#65c89a]/10 text-[#65c89a]'
                  : 'border-[#253139] bg-[#0a0f12] text-[#aab5b8]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-bold text-[#718086] uppercase tracking-wider">{s.label}</span>
                <Icon className={`w-3.5 h-3.5 ${isFinal ? 'text-[#65c89a]' : 'text-[#718086]'}`} />
              </div>
              <div className="text-xs font-bold text-[#f1f3f0] truncate" title={s.detail}>
                {s.detail}
              </div>
              <div className="text-[8px] text-[#718086] mt-1 font-mono">{s.time}</div>
            </button>
          );
        })}
      </div>

      {/* Selected Step Detail Modal */}
      {selectedStep && (
        <div className="absolute inset-x-4 bottom-4 bg-[#0d1418]/95 border border-[#6fa8dc]/50 rounded p-4 text-xs shadow-2xl backdrop-blur z-20 font-mono">
          <div className="flex items-center justify-between border-b border-[#253139] pb-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#6fa8dc] animate-pulse"></span>
              <strong className="text-[#f1f3f0] uppercase">{selectedStep.label} STEP DETAIL</strong>
              <span className="text-[9px] text-[#718086]">Agent: {selectedStep.agent}</span>
            </div>
            <button
              onClick={() => setSelectedStep(null)}
              className="text-[#718086] hover:text-[#f1f3f0] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-[9px] text-[#718086] block uppercase mb-0.5">Input Observation</span>
              <p className="text-[#aab5b8] bg-[#07090b] p-2 rounded border border-[#253139] text-[10px]">
                {selectedStep.input}
              </p>
            </div>
            <div>
              <span className="text-[9px] text-[#718086] block uppercase mb-0.5">Agent Reasoning</span>
              <p className="text-[#aab5b8] bg-[#07090b] p-2 rounded border border-[#253139] text-[10px]">
                {selectedStep.reasoning}
              </p>
            </div>
            <div>
              <span className="text-[9px] text-[#718086] block uppercase mb-0.5">Output Payload</span>
              <p className="text-[#65c89a] bg-[#07090b] p-2 rounded border border-[#253139] text-[10px] font-bold">
                {selectedStep.output}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
