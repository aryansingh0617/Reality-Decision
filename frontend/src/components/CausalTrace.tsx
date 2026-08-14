import React, { useState } from 'react';
import { Activity, ShieldAlert, GitBranch, AlertTriangle, Search, RefreshCw, CheckCircle2, X } from 'lucide-react';
import type { DecisionPacket } from '../api';

interface CausalTraceProps {
  packet: DecisionPacket | null;
  replanCount: number;
}

export const CausalTrace: React.FC<CausalTraceProps> = ({ packet, replanCount }) => {
  const [selectedStep, setSelectedStep] = useState<any | null>(null);

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
      detail: packet?.why.some(w => w.includes('Bridge')) ? 'Bridge B-07 Submerged' : 'Nominal Operational State',
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
    <div className="panel font-mono text-left relative">
      <div className="panel-header">
        <span className="panel-title">Counterfactual Causal Reasoning Trace</span>
        <span className="panel-tag">CAUSAL PIPELINE · {replanCount} CYCLES</span>
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {steps.map((s, idx) => {
          const Icon = s.icon;
          const isFinal = s.isFinal;

          return (
            <button
              key={idx}
              onClick={() => setSelectedStep(s)}
              className={`border rounded p-2.5 flex flex-col justify-between text-left transition-all hover:border-[#6fa8dc] ${
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
              className="text-[#718086] hover:text-[#f1f3f0]"
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
