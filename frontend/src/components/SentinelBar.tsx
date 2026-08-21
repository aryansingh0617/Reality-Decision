import React from 'react';
import { Eye, ShieldCheck, AlertTriangle, RefreshCw } from 'lucide-react';

interface SentinelBarProps {
  status?: string; // MONITORING | VALID | INVALIDATED | REPLANNING
  replanCount?: number;
  version?: number;
  authorized?: boolean;
  replanning?: boolean;
}

export const SentinelBar: React.FC<SentinelBarProps> = ({
  status = 'MONITORING',
  replanCount = 0,
  version = 1,
  authorized = false,
  replanning = false,
}) => {
  const state = replanning
    ? 'REPLANNING'
    : (status || 'MONITORING').toUpperCase();

  const config = {
    REPLANNING: {
      tone: 'var(--rd-warn)',
      bg: 'var(--rd-warn-soft)',
      icon: RefreshCw,
      title: 'Reality changed — replanning',
      body: 'The previous plan is no longer valid. Generating a new recommendation.',
      spin: true,
    },
    INVALIDATED: {
      tone: 'var(--rd-danger)',
      bg: 'var(--rd-danger-soft)',
      icon: AlertTriangle,
      title: 'Plan invalidated',
      body: 'A change in reality broke a key assumption. A new decision is required.',
      spin: false,
    },
    VALID: {
      tone: 'var(--rd-success)',
      bg: 'var(--rd-success-soft)',
      icon: ShieldCheck,
      title: authorized ? 'Plan authorized — Sentinel active' : 'Plan valid — Sentinel active',
      body: 'Continuously checking whether this recommendation still holds.',
      spin: false,
    },
    MONITORING: {
      tone: 'var(--rd-success)',
      bg: 'var(--rd-success-soft)',
      icon: Eye,
      title: 'Sentinel monitoring reality',
      body: 'Continuously checking whether the current recommendation remains valid.',
      spin: false,
    },
  }[state] || {
    tone: 'var(--rd-success)',
    bg: 'var(--rd-success-soft)',
    icon: Eye,
    title: 'Sentinel monitoring reality',
    body: 'Continuously checking whether the current recommendation remains valid.',
    spin: false,
  };

  const Icon = config.icon;

  return (
    <div
      className="rd-panel flex items-center gap-4 px-5 py-3.5"
      style={{ borderColor: config.tone === 'var(--rd-success)' ? 'var(--rd-border)' : config.tone }}
    >
      <div
        className="flex items-center justify-center rounded-lg shrink-0"
        style={{ width: 38, height: 38, background: config.bg, color: config.tone }}
      >
        <Icon className={`w-[18px] h-[18px] ${config.spin ? 'rd-spin-slow' : ''}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="t-h3" style={{ color: 'var(--rd-text)' }}>{config.title}</span>
          {!replanning && state !== 'INVALIDATED' && (
            <span className="rd-dot rd-pulse" style={{ background: config.tone }} />
          )}
        </div>
        <div className="t-caption mt-0.5 truncate">{config.body}</div>
      </div>
      <div className="hidden sm:flex items-center gap-5 shrink-0">
        <div className="text-right">
          <div className="t-label">Reality</div>
          <div className="t-tech mt-1" style={{ color: 'var(--rd-text-2)' }}>v{version}</div>
        </div>
        <div className="text-right">
          <div className="t-label">Replans</div>
          <div className="t-tech mt-1" style={{ color: 'var(--rd-text-2)' }}>{replanCount}</div>
        </div>
      </div>
    </div>
  );
};
