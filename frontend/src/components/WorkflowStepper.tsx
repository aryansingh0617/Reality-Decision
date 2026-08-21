import React from 'react';
import {
  Radar,
  Search,
  Scale,
  FlaskConical,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Eye,
  Check,
} from 'lucide-react';

export interface Stage {
  key: string;
  label: string;
  icon: React.ElementType;
  hint: string;
}

/* The core product story — always visible so a first-time judge understands the loop. */
export const STAGES: Stage[] = [
  { key: 'reality', label: 'Reality', icon: Radar, hint: 'Sensing physical state' },
  { key: 'investigate', label: 'Investigate', icon: Search, hint: 'Inspecting evidence' },
  { key: 'evaluate', label: 'Evaluate', icon: Scale, hint: 'Evaluating cascades' },
  { key: 'simulate', label: 'Simulate', icon: FlaskConical, hint: 'Stress-testing detours' },
  { key: 'validate', label: 'Validate', icon: ShieldCheck, hint: 'Validating safety bounds' },
  { key: 'recommend', label: 'Recommend', icon: Sparkles, hint: 'Synthesizing packet' },
  { key: 'review', label: 'Human Review', icon: UserCheck, hint: 'Commander authorization' },
  { key: 'monitor', label: 'Monitor', icon: Eye, hint: 'Sentinel watching reality' },
];

interface WorkflowStepperProps {
  currentIndex: number; // index of the active stage
  working?: boolean; // AI actively computing
  workingLabel?: string;
}

export const WorkflowStepper: React.FC<WorkflowStepperProps> = ({ currentIndex, working, workingLabel }) => {
  return (
    <div className="rd-panel px-5 py-3.5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="t-label">Autonomous Decision Loop</span>
        </div>
        <div className="t-caption flex items-center gap-2">
          {working ? (
            <>
              <span className="rd-dot rd-pulse" style={{ background: 'var(--rd-accent)' }} />
              <span style={{ color: 'var(--rd-accent-2)' }}>{workingLabel || 'Agent Reasoning in Progress…'}</span>
            </>
          ) : (
            <span className="text-[11px] font-mono text-[var(--rd-text-3)] hidden sm:inline">
              Observe → Investigate → Evaluate → Simulate → Validate → Decide → Authorize → Monitor
            </span>
          )}
        </div>
      </div>

      <div className="w-full overflow-x-auto pb-1">
        <div className="flex items-center justify-between min-w-[720px] px-2">
          {STAGES.map((s, i) => {
            const Icon = s.icon;
            const done = i < currentIndex;
            const active = i === currentIndex;
            const fg = done ? 'var(--rd-success)' : active ? 'var(--rd-accent)' : 'var(--rd-text-3)';
            const isWorkingActive = active && working;

            return (
              <React.Fragment key={s.key}>
                {/* Step Node */}
                <div className="flex flex-col items-center min-w-[65px] max-w-[90px] shrink-0">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300"
                    style={{
                      color: fg,
                      border: `2px solid ${active ? 'var(--rd-accent)' : done ? 'var(--rd-success)' : 'var(--rd-border)'}`,
                      background: active ? '#101c2e' : done ? '#0c2219' : '#141a1f',
                      boxShadow: active ? '0 0 0 4px rgba(91,141,239,0.18)' : 'none',
                    }}
                  >
                    {done ? (
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    ) : (
                      <Icon className={`w-3.5 h-3.5 ${isWorkingActive ? 'animate-pulse' : ''}`} />
                    )}
                  </div>

                  <div className="mt-2 text-center w-full">
                    <div
                      className="text-[11px] font-medium leading-tight truncate"
                      style={{ color: active ? 'var(--rd-text)' : done ? 'var(--rd-text-2)' : 'var(--rd-text-3)' }}
                      title={s.label}
                    >
                      {s.label}
                    </div>
                    <div
                      className="text-[9.5px] font-mono leading-tight mt-0.5 truncate"
                      style={{ color: active ? 'var(--rd-accent)' : 'var(--rd-text-3)', opacity: active ? 1 : 0.6 }}
                    >
                      {active ? s.hint : s.key}
                    </div>
                  </div>
                </div>

                {/* Connector Line strictly between circles */}
                {i < STAGES.length - 1 && (
                  <div
                    className="flex-1 mx-2 mb-6 h-[2px] rounded-full transition-all duration-300"
                    style={{
                      background: i < currentIndex ? 'var(--rd-success)' : 'var(--rd-border-2)',
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
