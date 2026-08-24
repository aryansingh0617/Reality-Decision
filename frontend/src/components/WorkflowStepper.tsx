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
import { TRANSLATIONS, type Language } from '../i18n';

export interface Stage {
  key: string;
  label: string;
  icon: React.ElementType;
  hint: string;
}

const STAGES_EN: Stage[] = [
  { key: 'reality', label: 'Reality', icon: Radar, hint: 'Sensing physical state' },
  { key: 'investigate', label: 'Investigate', icon: Search, hint: 'Inspecting evidence' },
  { key: 'evaluate', label: 'Evaluate', icon: Scale, hint: 'Evaluating cascades' },
  { key: 'simulate', label: 'Simulate', icon: FlaskConical, hint: 'Stress-testing detours' },
  { key: 'validate', label: 'Validate', icon: ShieldCheck, hint: 'Validating safety bounds' },
  { key: 'recommend', label: 'Recommend', icon: Sparkles, hint: 'Synthesizing packet' },
  { key: 'review', label: 'Human Review', icon: UserCheck, hint: 'Commander authorization' },
  { key: 'monitor', label: 'Monitor', icon: Eye, hint: 'Sentinel watching reality' },
];

const STAGES_HI: Stage[] = [
  { key: 'reality', label: 'वास्तविकता', icon: Radar, hint: 'भौतिक स्थिति संवेदन' },
  { key: 'investigate', label: 'जांच', icon: Search, hint: 'साक्ष्य निरीक्षण' },
  { key: 'evaluate', label: 'मूल्यांकन', icon: Scale, hint: 'कैस्केड विश्लेषण' },
  { key: 'simulate', label: 'सिमुलेशन', icon: FlaskConical, hint: 'मार्ग सिमुलेशन' },
  { key: 'validate', label: 'सत्यापन', icon: ShieldCheck, hint: 'सुरक्षा गेट जांच' },
  { key: 'recommend', label: 'अनुशंसा', icon: Sparkles, hint: 'पैकेट निर्माण' },
  { key: 'review', label: 'मानव समीक्षा', icon: UserCheck, hint: 'कमांडर प्राधिकरण' },
  { key: 'monitor', label: 'प्रहरी निगरानी', icon: Eye, hint: 'सतत निगरानी' },
];

interface WorkflowStepperProps {
  currentIndex: number;
  working?: boolean;
  workingLabel?: string;
  lang?: Language;
}

export const WorkflowStepper: React.FC<WorkflowStepperProps> = ({
  currentIndex,
  working,
  workingLabel,
  lang = 'en',
}) => {
  const stages = lang === 'hi' ? STAGES_HI : STAGES_EN;
  const loopTitle = lang === 'hi' ? 'स्वायत्त निर्णय चक्र (Autonomous Loop)' : 'Autonomous Decision Loop';

  return (
    <div className="rd-panel px-5 py-3.5 bg-[var(--rd-surface)] border border-[var(--rd-border)] rounded-xl shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="t-label text-slate-300 font-bold">{loopTitle}</span>
        </div>
        <div className="t-caption flex items-center gap-2">
          {working ? (
            <>
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-cyan-300 font-mono text-xs font-semibold">
                {workingLabel || (lang === 'hi' ? 'एजेंट रीज़निंग जारी है…' : 'Agent Reasoning in Progress…')}
              </span>
            </>
          ) : (
            <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
              {lang === 'hi'
                ? 'निरीक्षण → जांच → मूल्यांकन → सिमुलेशन → सत्यापन → निर्णय → प्राधिकरण → प्रहरी'
                : 'Observe → Investigate → Evaluate → Simulate → Validate → Decide → Authorize → Monitor'}
            </span>
          )}
        </div>
      </div>

      <div className="w-full overflow-x-auto pb-1">
        <div className="flex items-center justify-between min-w-[720px] px-2">
          {stages.map((s, i) => {
            const Icon = s.icon;
            const done = i < currentIndex;
            const active = i === currentIndex;
            const fg = done ? '#34d399' : active ? '#38bdf8' : '#64748b';

            return (
              <React.Fragment key={s.key}>
                {/* Step Node */}
                <div className="flex flex-col items-center min-w-[65px] max-w-[90px] shrink-0">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300 border"
                    style={{
                      color: fg,
                      borderColor: active ? '#06b6d4' : done ? '#10b981' : '#334155',
                      background: active ? '#082f49' : done ? '#064e3b' : '#0f172a',
                      boxShadow: active ? '0 0 0 4px rgba(6,182,212,0.2)' : 'none',
                    }}
                  >
                    {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>

                  <div
                    className="mt-1.5 text-[11px] font-bold text-center leading-tight tracking-tight transition-colors"
                    style={{ color: active ? '#f8fafc' : done ? '#94a3b8' : '#64748b' }}
                  >
                    {s.label}
                  </div>
                  <div className="text-[9px] text-slate-400 font-mono text-center truncate max-w-[80px]">
                    {s.hint}
                  </div>
                </div>

                {/* Connector Line */}
                {i < stages.length - 1 && (
                  <div
                    className="flex-1 h-0.5 mx-1 transition-all duration-300"
                    style={{ background: done ? '#10b981' : '#1e293b' }}
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
