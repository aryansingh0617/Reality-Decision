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
  Cpu,
} from 'lucide-react';

interface AgentTraceProps {
  steps: AgentStep[];
  activeStep?: string | null;
  reasoningMode?: string;
}

const REASONING_ROSTER = [
  { key: 'inspect_evidence', name: '01. Inspection Step', icon: Database, desc: 'Inspects observations & detects data contradictions' },
  { key: 'query_dependency_graph', name: '02. Verification Step', icon: GitBranch, desc: 'Propagates infrastructure failure cascades' },
  { key: 'simulate_counterfactual', name: '03. Simulation Step', icon: Activity, desc: 'Stress-tests parallel candidate branches' },
  { key: 'calculate_voi', name: '04. VOI Step', icon: Search, desc: 'Ranks high-value missing evidence priorities' },
  { key: 'validate_plan', name: '05. Verification Step', icon: ClipboardCheck, desc: 'Enforces hard route & capacity constraints' },
  { key: 'critique_plan', name: '06. Critic Step', icon: AlertTriangle, desc: 'Challenges assumptions against safety boundaries' },
  { key: 'generate_decision_packet', name: '07. Decision Step', icon: BrainCircuit, desc: 'Formulates candidate operational decision' },
];

export const AgentTrace: React.FC<AgentTraceProps> = ({ steps, activeStep }) => {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const stepMap = React.useMemo(() => {
    const map: Record<string, AgentStep> = {};
    for (const step of steps) {
      for (const item of REASONING_ROSTER) {
        if (step.agent.toLowerCase().includes(item.key.toLowerCase()) || step.inputs.includes(item.key)) {
          map[item.key] = step;
        }
      }
    }
    return map;
  }, [steps]);

  const executedCount = steps.length;

  return (
    <div className="panel flex flex-col h-full font-mono text-left bg-[#14181a] border border-[#242a2e] rounded-xl overflow-hidden shadow-lg">
      <div className="panel-header bg-[#1b252c] border-b border-[#242a2e] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-[#2ecc71]" />
          <span className="panel-title font-bold text-xs text-[#f5f7fa] tracking-wider uppercase">
            Tool-Augmented Autonomous Orchestrator
          </span>
          <span className="bg-[#0a0d0f] border border-[#242a2e] text-[#2ecc71] px-2 py-0.5 rounded text-[10px] font-bold">
            {executedCount > 0 ? `${executedCount} Turns Executed` : 'Standby'}
          </span>
        </div>
        <button
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="text-[10px] text-[#6fa8dc] hover:text-[#9cc7ed] flex items-center gap-1 cursor-pointer bg-[#0a0d0f] border border-[#242a2e] px-2 py-1 rounded"
        >
          {showTechnicalDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          <span>{showTechnicalDetails ? 'HIDE RAW TELEMETRY' : 'SHOW TELEMETRY'}</span>
        </button>
      </div>

      <div className="p-3 text-[10px] text-[#8a9aaa] bg-[#0d1418] border-b border-[#242a2e] italic">
        Specialized reasoning steps: Inspection, Verification, Simulation, Decision, Critic, Sentinel.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 p-3 flex-1 overflow-y-auto">
        {REASONING_ROSTER.map((agentItem) => {
          const Icon = agentItem.icon;
          const stepData = stepMap[agentItem.key];
          const isCurrentActive = activeStep && agentItem.key.toLowerCase().includes(activeStep.toLowerCase());
          const isAlert = stepData?.status === 'REJECTED' || stepData?.status === 'FAILED';

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
            ? 'text-[#2ecc71] font-bold'
            : 'text-[#718086]';

          return (
            <div
              key={agentItem.key}
              className={`border rounded-lg p-2.5 flex flex-col justify-between text-xs transition-all ${
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
                        {stepData.token_usage && (
                          <div className="text-[#f39c12]"><strong className="text-[#f39c12]">TOKENS:</strong> {stepData.token_usage.total_tokens || 0}</div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[#5a6a7a] italic text-[10px]">Awaiting tool call...</p>
                )}
              </div>

              <div className="mt-2 pt-1 border-t border-[#182229] flex items-center justify-between text-[9px] text-[#718086] font-mono">
                <span className={`uppercase font-bold ${stepData?.mode === 'DETERMINISTIC_FALLBACK' ? 'text-[#e74c3c]' : 'text-[#2ecc71]'}`}>
                  {stepData?.mode || 'LLM_AGENTIC'}
                </span>
                <span>{stepData?.latency_ms ? `${stepData.latency_ms}ms` : '0ms'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
