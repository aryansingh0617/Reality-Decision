import React, { useState } from 'react';
import type { AgentStep } from '../api';
import {
  Database,
  GitBranch,
  Activity,
  AlertTriangle,
  Search,
  BrainCircuit,
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface AgentTraceProps {
  steps: AgentStep[];
  activeStep: string | null;
}

const AGENT_ROSTER = [
  { key: 'Evidence Agent', name: '01. Evidence Ingestion', icon: Database, stage: 'OBSERVE', desc: 'Ingests observations & detects data contradictions' },
  { key: 'Dependency Agent', name: '02. Cascade Propagation', icon: GitBranch, stage: 'CASCADE', desc: 'Propagates infrastructure failure cascades' },
  { key: 'Counterfactual Simulation Agent', name: '03. Counterfactual Simulation', icon: Activity, stage: 'SIMULATE', desc: 'Stress-tests parallel candidate branches' },
  { key: 'Critic Agent', name: '04. Safety Critic', icon: AlertTriangle, stage: 'CRITIQUE', desc: 'Challenges assumptions against safety boundaries' },
  { key: 'Information Value Agent', name: '05. VOI Ranking', icon: Search, stage: 'VOI', desc: 'Ranks high-value missing evidence priorities' },
  { key: 'Decision Agent', name: '06. Policy Synthesis', icon: BrainCircuit, stage: 'DECIDE', desc: 'Formulates candidate operational decision' },
  { key: 'Verification Agent', name: '07. Deterministic Safety', icon: ClipboardCheck, stage: 'VALIDATE', desc: 'Enforces hard route & capacity constraints' },
];

export const AgentTrace: React.FC<AgentTraceProps> = ({ steps, activeStep }) => {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const stepMap = React.useMemo(() => {
    const map: Record<string, AgentStep> = {};
    for (const step of steps) {
      if (step.agent.includes('Evidence')) map['Evidence Agent'] = step;
      else if (step.agent.includes('Dependency')) map['Dependency Agent'] = step;
      else if (step.agent.includes('Simulation') || step.agent.includes('Counterfactual')) map['Counterfactual Simulation Agent'] = step;
      else if (step.agent.includes('Critic')) map['Critic Agent'] = step;
      else if (step.agent.includes('Information')) map['Information Value Agent'] = step;
      else if (step.agent.includes('Decision')) map['Decision Agent'] = step;
      else if (step.agent.includes('Verification')) map['Verification Agent'] = step;
    }
    return map;
  }, [steps]);

  const activeCount = Object.keys(stepMap).length;

  return (
    <div className="panel flex flex-col h-full font-mono text-left">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <span className="panel-title">Multi-Agent Autonomous Execution Grid</span>
          <span className="panel-tag">{activeCount > 0 ? `${activeCount}/7 Agents Executed` : 'Standby'}</span>
        </div>
        <button
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="text-[10px] text-[#6fa8dc] hover:text-[#9cc7ed] flex items-center gap-1 cursor-pointer bg-[#0a0d0f] border border-[#242a2e] px-2 py-0.5 rounded"
        >
          {showTechnicalDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          <span>{showTechnicalDetails ? 'HIDE RAW TELEMETRY' : 'SHOW RAW TELEMETRY'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-3 flex-1 overflow-y-auto">
        {AGENT_ROSTER.map((agentItem) => {
          const Icon = agentItem.icon;
          const stepData = stepMap[agentItem.key];
          const isCurrentActive = activeStep && agentItem.key.toLowerCase().includes(activeStep.toLowerCase());
          const isAlert = stepData?.status === 'REJECTED';

          const statusText = isCurrentActive
            ? 'EXECUTING...'
            : stepData
            ? stepData.status
            : 'STANDBY';

          const statusColor = isCurrentActive
            ? 'text-[#e7a23b] font-bold animate-pulse'
            : isAlert
            ? 'text-[#e45b55] font-bold'
            : stepData
            ? 'text-[#65c89a] font-bold'
            : 'text-[#718086]';

          return (
            <div
              key={agentItem.key}
              className={`border rounded p-2.5 flex flex-col justify-between text-xs transition-all ${
                isAlert
                  ? 'border-[#e45b55]/50 bg-[#e45b55]/10'
                  : isCurrentActive
                  ? 'border-[#e7a23b]/60 bg-[#e7a23b]/10 ring-1 ring-[#e7a23b]/30'
                  : stepData
                  ? 'border-[#253139] bg-[#0d1418]'
                  : 'border-[#182229] bg-[#0a0f12] opacity-75'
              }`}
            >
              <div>
                <div className="flex items-center justify-between border-b border-[#253139]/60 pb-1.5 mb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-[#e8edf2] text-[11px]">
                    <Icon className="w-3.5 h-3.5 text-[#6fa8dc]" />
                    <span>{agentItem.name}</span>
                  </div>
                  <span className={`text-[9px] uppercase tracking-wider ${statusColor}`}>{statusText}</span>
                </div>

                <p className="text-[10px] text-[#8a9aaa] mb-1.5 italic">
                  {agentItem.desc}
                </p>

                {stepData ? (
                  <div className="space-y-1">
                    <p className="text-[11px] text-[#f1f3f0] leading-relaxed font-sans">
                      {stepData.reasoning}
                    </p>
                    {showTechnicalDetails && (
                      <div className="mt-2 pt-2 border-t border-[#253139] text-[9px] font-mono space-y-1 text-[#aab5b8] bg-[#07090b] p-1.5 rounded">
                        <div><strong className="text-[#6fa8dc]">INPUT:</strong> {stepData.inputs}</div>
                        <div><strong className="text-[#65c89a]">OUTPUT:</strong> {stepData.outputs}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[#5a6a7a] italic text-[10px]">Awaiting trigger...</p>
                )}
              </div>

              <div className="mt-2 pt-1 border-t border-[#182229] flex items-center justify-between text-[9px] text-[#718086] font-mono">
                <span className="uppercase">{stepData?.mode || 'LLM_AGENTIC'}</span>
                <span>{stepData?.latency_ms ? `${stepData.latency_ms}ms` : '0ms'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
