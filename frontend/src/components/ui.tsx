import React from 'react';

type Tone = 'neutral' | 'accent' | 'success' | 'warn' | 'danger';

const TONE: Record<Tone, { fg: string; bg: string; bd: string }> = {
  neutral: { fg: 'var(--rd-text-2)', bg: 'var(--rd-panel)', bd: 'var(--rd-border-2)' },
  accent: { fg: '#8bb2f7', bg: 'var(--rd-accent-soft)', bd: 'rgba(91,141,239,0.4)' },
  success: { fg: '#5fd0a0', bg: 'var(--rd-success-soft)', bd: 'rgba(63,185,132,0.4)' },
  warn: { fg: '#eec173', bg: 'var(--rd-warn-soft)', bd: 'rgba(224,168,61,0.4)' },
  danger: { fg: '#f0908b', bg: 'var(--rd-danger-soft)', bd: 'rgba(229,100,94,0.4)' },
};

export const Badge: React.FC<{ tone?: Tone; children: React.ReactNode; className?: string; dot?: boolean }> = ({
  tone = 'neutral',
  children,
  className = '',
  dot = false,
}) => {
  const t = TONE[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${className}`}
      style={{ color: t.fg, background: t.bg, border: `1px solid ${t.bd}` }}
    >
      {dot && <span className="rd-dot" style={{ background: t.fg }} />}
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
}) => (
  <div className="rd-card px-4 py-3">
    <div className="t-label">{label}</div>
    <div className="t-num mt-1.5 text-[18px] font-semibold" style={{ color: TONE[tone].fg === 'var(--rd-text-2)' ? 'var(--rd-text)' : TONE[tone].fg }}>
      {value}
    </div>
    {hint && <div className="t-caption mt-0.5">{hint}</div>}
  </div>
);

export const StatusDot: React.FC<{ tone: Tone; pulse?: boolean }> = ({ tone, pulse }) => (
  <span className="relative inline-flex" style={{ width: 8, height: 8 }}>
    {pulse && (
      <span className="absolute inset-0 rounded-full rd-ping" style={{ background: TONE[tone].fg, opacity: 0.6 }} />
    )}
    <span className="rd-dot relative" style={{ width: 8, height: 8, background: TONE[tone].fg }} />
  </span>
);

/* Confidence indicator: segmented bar + label, non-color-only (also shows text) */
export const Confidence: React.FC<{ level: string }> = ({ level }) => {
  const l = (level || 'MEDIUM').toUpperCase();
  const filled = l === 'HIGH' ? 3 : l === 'MEDIUM' ? 2 : 1;
  const tone: Tone = l === 'HIGH' ? 'success' : l === 'MEDIUM' ? 'warn' : 'danger';
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-end gap-[3px]" aria-label={`Confidence ${l}`}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="rounded-sm transition-all"
            style={{
              width: 7,
              height: 8 + i * 5,
              background: i < filled ? TONE[tone].fg : 'var(--rd-border-2)',
            }}
          />
        ))}
      </div>
      <span className="text-[12px] font-semibold" style={{ color: TONE[tone].fg }}>{l}</span>
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
    {icon && <div className="mb-4 text-[var(--rd-text-3)]">{icon}</div>}
    <div className="t-h3 text-[var(--rd-text)]">{title}</div>
    {body && <div className="t-caption mt-2 max-w-sm">{body}</div>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);
