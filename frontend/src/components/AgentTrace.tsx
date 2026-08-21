import React, { useState } from 'react';
import type { AgentStep } from '../api';
import {
  Radar,
  Search,
  GitBranch,
  Timer,
  Scale,
  FlaskConical,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Send,
  Cpu,
  Terminal,
  Loader2,
} from 'lucide-react';

interface Props {
  steps: AgentStep[];
  reasoningMode?: string;
  working?: boolean;
}

/* Map raw tool key -> human-readable stage */
const TOOL_MAP: Record<string, { label: string; icon: React.ElementType }> = {
  inspect_reality_state: { label: 'Read the current reality', icon: Radar },
  inspect_evidence: { label: 'Inspected supporting evidence', icon: Search },
  query_dependency_graph: { label: 'Analyzed infrastructure dependencies', icon: GitBranch },
  calculate_tti: { label: 'Estimated time-to-impact', icon: Timer },
  calculate_voi: { label: 'Prioritized what to verify next', icon: Scale },
  simulate_counterfactual: { label: 'Simulated alternative outcomes', icon: FlaskConical },
  validate_plan: { label: 'Validated the plan against constraints', icon: ShieldCheck },
  critique_plan: { label: 'Critiqued assumptions for weak points', icon: AlertTriangle },
  generate_decision_packet: { label: 'Generated the recommendation', icon: Sparkles },
  escalate: { label: 'Escalated to a human operator', icon: AlertTriangle },
  synthetic_execution: { label: 'Prepared execution receipt', icon: Send },
};

function parseTool(agent: string): { key: string; label: string; icon: React.ElementType } {
  const m = agent.match(/\(([^)]+)\)/);
  const key = (m ? m[1] : agent).toLowerCase().trim();
  const found = TOOL_MAP[key];
  if (found) return { key, ...found };
  return { key, label: agent.replace(/Autonomous Planner\s*/i, '').replace(/[()]/g, '') || 'Reasoning step', icon: Cpu };
}

export const AgentTrace: React.FC<Props> = ({ steps, working }) => {
  const [showTrace, setShowTrace] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--rd-border)] px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="t-label">AI Activity</span>
          {working ? (
            <span className="flex items-center gap-1.5 t-caption" style={{ color: 'var(--rd-accent-2)' }}>
              <Loader2 className="h-3.5 w-3.5 rd-spin-slow" /> investigating…
            </span>
          ) : (
            <span className="t-tech">{steps.length} steps</span>
          )}
        </div>
        <button
          onClick={() => setShowTrace((s) => !s)}
          data-testid="toggle-execution-trace"
          className="rd-chip cursor-pointer transition-colors hover:border-[var(--rd-border-2)]"
          style={showTrace ? { color: 'var(--rd-accent-2)', borderColor: 'rgba(91,141,239,0.4)', background: 'var(--rd-accent-soft)' } : undefined}
        >
          <Terminal className="h-3.5 w-3.5" />
          {showTrace ? 'Hide execution trace' : 'View execution trace'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {steps.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 py-8 text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: 'var(--rd-panel)', color: 'var(--rd-text-3)' }}>
              <Cpu className="h-5 w-5" />
            </div>
            <div className="t-h3" style={{ color: 'var(--rd-text)' }}>No activity yet</div>
            <div className="t-caption mt-1.5 max-w-xs">
              Run a decision cycle to watch the system investigate reality, weigh options, and reach a recommendation — step by step.
            </div>
          </div>
        ) : (
          <div className="relative rd-stagger">
            <div className="absolute bottom-2 left-[15px] top-2 w-px" style={{ background: 'var(--rd-border)' }} />
            {steps.map((step, i) => {
              const { label, icon: Icon } = parseTool(step.agent);
              const failed = step.status === 'REJECTED' || step.status === 'FAILED';
              const tone = failed ? 'var(--rd-danger)' : 'var(--rd-success)';
              const isLast = i === steps.length - 1;
              const active = working && isLast;
              return (
                <div key={i} className="relative flex gap-3.5 pb-4 last:pb-0">
                  <div
                    className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                    style={{
                      background: active ? 'var(--rd-accent-soft)' : failed ? 'var(--rd-danger-soft)' : 'var(--rd-success-soft)',
                      border: `1px solid ${active ? 'rgba(91,141,239,0.5)' : failed ? 'rgba(229,100,94,0.4)' : 'rgba(63,185,132,0.4)'}`,
                      color: active ? 'var(--rd-accent)' : tone,
                    }}
                  >
                    <Icon className={`h-4 w-4 ${active ? 'rd-pulse' : ''}`} />
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="t-h3" style={{ color: 'var(--rd-text)' }}>{label}</div>
                    {step.reasoning && <div className="t-body-sm mt-1" style={{ color: 'var(--rd-text-2)' }}>{step.reasoning}</div>}
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 t-tech">
                      <span>{step.latency_ms ? `${step.latency_ms} ms` : '—'}</span>
                      <span style={{ color: step.mode === 'DETERMINISTIC_FALLBACK' ? 'var(--rd-warn)' : 'var(--rd-success)' }}>
                        {step.mode === 'DETERMINISTIC_FALLBACK' ? 'fallback' : 'live'}
                      </span>
                      {step.status && <span>{step.status.toLowerCase()}</span>}
                    </div>

                    {showTrace && (
                      <div className="mt-2.5 space-y-1.5 rounded-lg px-3 py-2.5 rd-anim-fade" style={{ background: 'var(--rd-bg)', border: '1px solid var(--rd-border)' }}>
                        {step.execution_id && (
                          <div className="t-tech"><span style={{ color: 'var(--rd-accent-2)' }}>exec_id</span> {step.execution_id}</div>
                        )}
                        {step.inputs && <div className="t-tech break-words"><span style={{ color: 'var(--rd-accent-2)' }}>input</span> {step.inputs}</div>}
                        {step.outputs && <div className="t-tech break-words"><span style={{ color: 'var(--rd-success)' }}>output</span> {step.outputs}</div>}
                        {step.token_usage?.total_tokens ? (
                          <div className="t-tech"><span style={{ color: 'var(--rd-warn)' }}>tokens</span> {step.token_usage.total_tokens}</div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
