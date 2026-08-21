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
  const progressPercent = Math.min(100, Math.max(0, (currentIndex / (STAGES.length - 1)) * 100));

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

      <div className="relative w-full overflow-x-auto pb-1">
        <div className="relative flex items-start justify-between min-w-[720px] px-6">
          {/* Continuous background track line */}
          <div className="absolute top-[16px] left-[50px] right-[50px] h-[2px] bg-[var(--rd-border-2)] pointer-events-none" />
          
          {/* Active progress fill line */}
          <div
            className="absolute top-[16px] left-[50px] h-[2px] bg-[var(--rd-success)] transition-all duration-500 pointer-events-none"
            style={{ width: `calc((100% - 100px) * ${progressPercent / 100})` }}
          />

          {STAGES.map((s, i) => {
            const Icon = s.icon;
            const done = i < currentIndex;
            const active = i === currentIndex;
            const fg = done ? 'var(--rd-success)' : active ? 'var(--rd-accent)' : 'var(--rd-text-3)';
            const isWorkingActive = active && working;

            return (
              <div key={s.key} className="relative z-10 flex flex-col items-center min-w-[75px] max-w-[95px] flex-1">
                {/* Circle Icon */}
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300"
                  style={{
                    color: fg,
                    background: active ? 'var(--rd-accent-soft)' : done ? 'var(--rd-success-soft)' : 'var(--rd-panel)',
                    border: `2px solid ${active ? 'var(--rd-accent)' : done ? 'var(--rd-success)' : 'var(--rd-border)'}`,
                    boxShadow: active ? '0 0 0 4px rgba(91,141,239,0.18)' : 'none',
                  }}
                >
                  {done ? (
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  ) : (
                    <Icon className={`w-3.5 h-3.5 ${isWorkingActive ? 'animate-pulse' : ''}`} />
                  )}
                </div>

                {/* Uniform text container */}
                <div className="mt-2 text-center w-full px-1">
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
            );
          })}
        </div>
      </div>
    </div>
  );
};
