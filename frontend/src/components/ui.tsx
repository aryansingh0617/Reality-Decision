import React from 'react';

type Tone = 'neutral' | 'accent' | 'success' | 'warn' | 'danger' | 'purple';

const TONE: Record<Tone, { fg: string; bg: string; bd: string }> = {
  neutral: { fg: 'var(--rd-text-2)', bg: 'var(--rd-panel)', bd: 'var(--rd-border)' },
  accent: { fg: '#38bdf8', bg: 'rgba(6, 182, 212, 0.12)', bd: 'rgba(56, 189, 248, 0.3)' },
  success: { fg: '#34d399', bg: 'rgba(16, 185, 129, 0.12)', bd: 'rgba(52, 211, 153, 0.3)' },
  warn: { fg: '#fbbf24', bg: 'rgba(245, 158, 11, 0.12)', bd: 'rgba(251, 191, 36, 0.3)' },
  danger: { fg: '#fb7185', bg: 'rgba(244, 63, 94, 0.12)', bd: 'rgba(251, 113, 133, 0.3)' },
  purple: { fg: '#c084fc', bg: 'rgba(168, 85, 247, 0.12)', bd: 'rgba(192, 132, 252, 0.3)' },
};

export const Badge: React.FC<{ tone?: Tone; children: React.ReactNode; className?: string; dot?: boolean }> = ({
  tone = 'neutral',
  children,
  className = '',
  dot = false,
}) => {
  const t = TONE[tone] || TONE.neutral;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold border ${className}`}
      style={{ color: t.fg, background: t.bg, borderColor: t.bd }}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: t.fg }} />}
      {children}
    </span>
  );
};

export const SectionLabel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`t-label ${className}`}>{children}</div>
);

export const Metric: React.FC<{ label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: Tone }> = ({
  label,
  value,
  hint,
  tone = 'neutral',
}) => {
  const t = TONE[tone] || TONE.neutral;
  return (
    <div className="rd-card px-3.5 py-2.5 border border-[var(--rd-border)] rounded-xl bg-[var(--rd-panel)] flex flex-col justify-between">
      <div className="t-label text-slate-400">{label}</div>
      <div className="t-num mt-1 text-[18px] font-bold tracking-tight" style={{ color: tone === 'neutral' ? 'var(--rd-text)' : t.fg }}>
        {value}
      </div>
      {hint && <div className="t-caption text-[11px] text-slate-400 mt-0.5 truncate">{hint}</div>}
    </div>
  );
};

export const StatusDot: React.FC<{ tone: Tone; pulse?: boolean }> = ({ tone, pulse }) => {
  const t = TONE[tone] || TONE.neutral;
  return (
    <span className="relative inline-flex" style={{ width: 8, height: 8 }}>
      {pulse && (
        <span className="absolute inset-0 rounded-full animate-ping opacity-60" style={{ background: t.fg }} />
      )}
      <span className="relative inline-flex rounded-full" style={{ width: 8, height: 8, background: t.fg }} />
    </span>
  );
};

export const Confidence: React.FC<{ level: string; lang?: 'en' | 'hi' }> = ({ level, lang = 'en' }) => {
  const l = (level || 'MEDIUM').toUpperCase();
  const filled = l === 'HIGH' ? 3 : l === 'MEDIUM' ? 2 : 1;
  const tone: Tone = l === 'HIGH' ? 'success' : l === 'MEDIUM' ? 'warn' : 'danger';
  const labelText = lang === 'hi' 
    ? (l === 'HIGH' ? 'उच्च (HIGH)' : l === 'MEDIUM' ? 'मध्यम (MEDIUM)' : 'निम्न (LOW)')
    : l;

  return (
    <div className="flex items-center gap-1.5 font-mono">
      <div className="flex items-end gap-[2.5px]" aria-label={`Confidence ${l}`}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="rounded-[1.5px] transition-all"
            style={{
              width: 5,
              height: 6 + i * 4,
              background: i < filled ? TONE[tone].fg : 'var(--rd-border-2)',
            }}
          />
        ))}
      </div>
      <span className="text-[11px] font-bold" style={{ color: TONE[tone].fg }}>{labelText}</span>
    </div>
  );
};

export const EmptyState: React.FC<{ icon?: React.ReactNode; title: string; body?: string; action?: React.ReactNode }> = ({
  icon,
  title,
  body,
  action,
}) => (
  <div className="flex h-full flex-col items-center justify-center px-8 py-10 text-center">
    {icon && <div className="mb-3 text-slate-500">{icon}</div>}
    <div className="t-h3 text-slate-100">{title}</div>
    {body && <div className="t-caption mt-1.5 max-w-sm text-slate-400">{body}</div>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
