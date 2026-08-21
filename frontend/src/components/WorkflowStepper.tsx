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
  { key: 'reality', label: 'Reality', icon: Radar, hint: 'Sensing the current situation' },
  { key: 'investigate', label: 'Investigate', icon: Search, hint: 'Inspecting evidence' },
  { key: 'evaluate', label: 'Evaluate', icon: Scale, hint: 'Comparing options' },
  { key: 'simulate', label: 'Simulate', icon: FlaskConical, hint: 'Testing alternatives' },
  { key: 'validate', label: 'Validate', icon: ShieldCheck, hint: 'Safety-checking the plan' },
  { key: 'recommend', label: 'Recommend', icon: Sparkles, hint: 'Decision generated' },
  { key: 'review', label: 'Human Review', icon: UserCheck, hint: 'Awaiting authorization' },
  { key: 'monitor', label: 'Monitor', icon: Eye, hint: 'Sentinel watching reality' },
];

interface WorkflowStepperProps {
  currentIndex: number; // index of the active stage
  working?: boolean; // AI actively computing
  workingLabel?: string;
}

export const WorkflowStepper: React.FC<WorkflowStepperProps> = ({ currentIndex, working, workingLabel }) => {
  return (
    <div className="rd-panel px-5 py-4">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <span className="t-label">Autonomous Decision Loop</span>
        </div>
        <div className="t-caption flex items-center gap-2">
          {working ? (
            <>
              <span className="rd-dot rd-pulse" style={{ background: 'var(--rd-accent)' }} />
              <span style={{ color: 'var(--rd-accent-2)' }}>{workingLabel || 'Working…'}</span>
            </>
          ) : (
            <span>Reality → Investigate → Evaluate → Recommend → Review → Monitor</span>
          )}
        </div>
      </div>

      <div className="flex items-stretch">
        {STAGES.map((s, i) => {
          const Icon = s.icon;
          const done = i < currentIndex;
          const active = i === currentIndex;
          const fg = done ? 'var(--rd-success)' : active ? 'var(--rd-accent)' : 'var(--rd-text-3)';
          const isWorkingActive = active && working;
          return (
            <React.Fragment key={s.key}>
              <div className="flex flex-col items-center gap-2 min-w-0 flex-1">
                <div
                  className="flex items-center justify-center rounded-full transition-all"
                  style={{
                    width: 34,
                    height: 34,
                    color: fg,
                    background: active ? 'var(--rd-accent-soft)' : done ? 'var(--rd-success-soft)' : 'var(--rd-panel)',
                    border: `1px solid ${active ? 'rgba(91,141,239,0.5)' : done ? 'rgba(63,185,132,0.4)' : 'var(--rd-border)'}`,
                    boxShadow: active ? '0 0 0 4px var(--rd-accent-soft)' : 'none',
                  }}
                >
                  {done ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Icon className={`w-4 h-4 ${isWorkingActive ? 'rd-pulse' : ''}`} />
                  )}
                </div>
                <div className="text-center leading-tight">
                  <div
                    className="text-[11px] font-semibold truncate max-w-[90px]"
                    style={{ color: active || done ? 'var(--rd-text)' : 'var(--rd-text-3)' }}
                  >
                    {s.label}
                  </div>
                  {active && <div className="t-caption text-[10px] mt-0.5 max-w-[100px]">{s.hint}</div>}
                </div>
              </div>
              {i < STAGES.length - 1 && (
                <div className="flex items-center pt-[17px] px-1" style={{ flex: '0 0 auto', width: 22 }}>
                  <div
                    className="h-[2px] w-full rounded-full transition-all"
                    style={{ background: i < currentIndex ? 'var(--rd-success)' : 'var(--rd-border-2)' }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
