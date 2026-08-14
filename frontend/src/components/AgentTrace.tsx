import React from 'react';
import type { AgentStep } from '../api';
import {
  Database,
  GitBranch,
  Activity,
  AlertTriangle,
  Search,
  BrainCircuit,
  ClipboardCheck,
} from 'lucide-react';

interface AgentTraceProps {
  steps: AgentStep[];
  activeStep: string | null;
}

const AGENT_ROSTER = [
  { key: 'Evidence Agent', name: 'Evidence Agent', icon: Database },
  { key: 'Dependency Agent', name: 'Dependency Agent', icon: GitBranch },
  { key: 'Counterfactual Simulation Agent', name: 'Counterfactual Agent', icon: Activity },
  { key: 'Critic Agent', name: 'Critic Agent', icon: AlertTriangle },
  { key: 'Information Value Agent', name: 'Information Value', icon: Search },
  { key: 'Decision Agent', name: 'Decision Agent', icon: BrainCircuit },
  { key: 'Verification Agent', name: 'Verification Agent', icon: ClipboardCheck },
];

export const AgentTrace: React.FC<AgentTraceProps> = ({ steps, activeStep }) => {
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

  return (
    <div className="panel flex flex-col h-full font-mono text-left">
      <div className="panel-header">
        <span className="panel-title">Multi-Agent Autonomous Execution Grid</span>
        <span className="panel-tag">7 Active Agents</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 flex-1">
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
              className={`agent ${isAlert ? 'alert' : ''} ${
                isCurrentActive ? 'bg-[#e7a23b]/10 ring-1 ring-[#e7a23b]/30' : ''
              }`}
            >
              <div className="agent-head">
                <Icon className="w-3.5 h-3.5" />
                <span className="agent-name">{agentItem.name}</span>
                <span className={`agent-status ${statusColor}`}>{statusText}</span>
              </div>

              <div className="agent-reason">
                {stepData ? (
                  <>
                    <p className="line-clamp-3 text-[#aab5b8] text-[11px] leading-relaxed">
                      {stepData.reasoning}
                    </p>
                    <div className="mt-1 flex items-center justify-between text-[9px] text-[#718086] font-mono">
                      <span>{stepData.mode || 'DETERMINISTIC'}</span>
                      <span>{stepData.latency_ms}ms</span>
                    </div>
                  </>
                ) : (
                  <p className="text-[#718086] italic text-[11px]">Agent standing by for operational trigger...</p>
                )}
              </div>

              <div className="agent-bar">
                <i
                  style={{
                    width: stepData ? '100%' : isCurrentActive ? '50%' : '0%',
                  }}
                ></i>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
