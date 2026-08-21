import React, { useState } from 'react';
import type { DecisionPacket, Route } from '../api';
import {
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Sparkles,
  Lock,
  ChevronDown,
  ChevronRight,
  Route as RouteIcon,
  CircleCheck,
  CircleHelp,
  TriangleAlert,
  UserCheck,
} from 'lucide-react';
import { Badge, SectionLabel, Confidence } from './ui';

interface Props {
  packet: DecisionPacket | null;
  onAuthorize: (action: string) => void;
  routes?: Record<string, Route>;
}

const Disclosure: React.FC<{ title: string; count?: number; defaultOpen?: boolean; children: React.ReactNode; icon?: React.ReactNode }> = ({
  title,
  count,
  defaultOpen = false,
  children,
  icon,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rd-card overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        data-testid={`disclosure-${title.toLowerCase().replace(/[^a-z]+/g, '-')}`}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-[var(--rd-hover)]"
      >
        <span className="flex items-center gap-2.5">
          {icon}
          <span className="t-h3" style={{ color: 'var(--rd-text)' }}>{title}</span>
          {count != null && (
            <span className="t-tech" style={{ color: 'var(--rd-text-3)' }}>{count}</span>
          )}
        </span>
        {open ? (
          <ChevronDown className="h-4 w-4" style={{ color: 'var(--rd-text-3)' }} />
        ) : (
          <ChevronRight className="h-4 w-4" style={{ color: 'var(--rd-text-3)' }} />
        )}
      </button>
      {open && <div className="border-t border-[var(--rd-border)] px-4 py-3.5 rd-anim-fade">{children}</div>}
    </div>
  );
};

export const DecisionPacketView: React.FC<Props> = ({ packet, onAuthorize, routes }) => {
  if (!packet) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 py-12 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: 'var(--rd-accent-soft)', color: 'var(--rd-accent)' }}>
          <ShieldAlert className="h-6 w-6" />
        </div>
        <div className="t-h2" style={{ color: 'var(--rd-text)' }}>No active recommendation yet</div>
        <div className="t-caption mt-2 max-w-xs">
          Run a decision cycle and the system will investigate reality, weigh the options, and recommend an action here.
        </div>
      </div>
    );
  }

  const isLlmMode = packet.reasoning_mode === 'LLM_AGENTIC';
  const isPending = packet.authorization_status === 'PENDING';
  const isAuthorized = packet.authorization_status === 'AUTHORIZED';
  const isStaleRejected = packet.authorization_status === 'STALE_REJECTED';
  const critical = packet.capacity_gap || packet.escalation_required;
  const heroTone = critical ? 'var(--rd-danger)' : 'var(--rd-success)';
  const heroBg = critical ? 'var(--rd-danger-soft)' : 'var(--rd-success-soft)';

  const known = packet.known || [];
  const unknown = packet.unknown || [];
  const evidence = packet.evidence_list || [];

  // Derive honest alternatives from real route state
  const routeList = routes ? Object.values(routes) : [];
  const recId = packet.route_id;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--rd-border)] px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="t-label">Current Recommendation</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="t-tech">v{packet.world_state_version || 1}</span>
          <Badge tone={isLlmMode ? 'accent' : 'warn'}>
            {isLlmMode ? <Sparkles className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
            {isLlmMode ? 'Live AI reasoning' : 'Fallback mode'}
          </Badge>
        </div>
      </div>

      <div className="flex-1 space-y-3.5 overflow-y-auto px-5 py-4">
        {isStaleRejected && (
          <div className="flex items-start gap-2.5 rounded-lg px-4 py-3" style={{ background: 'var(--rd-danger-soft)', border: '1px solid rgba(229,100,94,0.4)' }}>
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--rd-danger)' }} />
            <div>
              <div className="t-h3" style={{ color: '#f0908b' }}>Authorization blocked</div>
              <div className="t-caption mt-1">Reality changed while this decision was under review. The system revalidated before allowing action.</div>
            </div>
          </div>
        )}

        {/* HERO — the decision */}
        <div className="rounded-xl px-5 py-4 rd-anim-up" style={{ background: heroBg, border: `1px solid ${critical ? 'rgba(229,100,94,0.45)' : 'rgba(63,185,132,0.4)'}` }}>
          <div className="flex items-center justify-between">
            <SectionLabel>Recommended action</SectionLabel>
            <Badge tone={critical ? 'danger' : 'success'} dot>
              {critical ? 'Escalation' : 'Ready to authorize'}
            </Badge>
          </div>
          <div className="t-h1 mt-2" style={{ color: 'var(--rd-text)' }}>{packet.recommendation}</div>
          <div className="mt-3.5 flex flex-wrap items-center gap-x-6 gap-y-2.5">
            <div>
              <div className="t-label">Route</div>
              <div className="t-tech mt-1 flex items-center gap-1.5" style={{ color: 'var(--rd-text)' }}>
                <RouteIcon className="h-3.5 w-3.5" style={{ color: heroTone }} />
                {packet.route_id || 'N/A'}
              </div>
            </div>
            <div>
              <div className="t-label">Confidence</div>
              <div className="mt-1"><Confidence level={packet.confidence} /></div>
            </div>
            <div>
              <div className="t-label">Time to impact</div>
              <div className="t-num t-tech mt-1" style={{ color: 'var(--rd-text)' }}>{packet.tti_minutes && packet.tti_minutes < 999 ? `${packet.tti_minutes} min` : '—'}</div>
            </div>
            <div>
              <div className="t-label">Stability</div>
              <div className="t-tech mt-1" style={{ color: packet.fragility === 'STABLE' ? 'var(--rd-success)' : 'var(--rd-warn)' }}>
                {packet.fragility || 'STABLE'}
              </div>
            </div>
          </div>
        </div>

        {/* WHY */}
        <Disclosure title="Why this decision?" defaultOpen icon={<Sparkles className="h-4 w-4" style={{ color: 'var(--rd-accent)' }} />}>
          <ul className="space-y-2.5">
            {(packet.why && packet.why.length ? packet.why : ['No rationale recorded for this cycle.']).map((w, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="mt-1.5 rd-dot shrink-0" style={{ background: 'var(--rd-accent)' }} />
                <span className="t-body" style={{ color: 'var(--rd-text)' }}>{w}</span>
              </li>
            ))}
          </ul>
          {packet.critical_assumption && (
            <div className="mt-3.5 rounded-lg px-3.5 py-2.5" style={{ background: 'var(--rd-bg)', border: '1px solid var(--rd-border)' }}>
              <div className="t-label">Key assumption</div>
              <div className="t-body-sm mt-1" style={{ color: 'var(--rd-text-2)' }}>{packet.critical_assumption}</div>
            </div>
          )}
        </Disclosure>

        {/* EVIDENCE */}
        <Disclosure title="Evidence" count={known.length + unknown.length + evidence.length} icon={<CircleCheck className="h-4 w-4" style={{ color: 'var(--rd-success)' }} />}>
          {known.length > 0 && (
            <div className="mb-3">
              <div className="mb-2 flex items-center gap-2"><span className="rd-dot" style={{ background: 'var(--rd-success)' }} /><span className="t-label" style={{ color: 'var(--rd-success)' }}>Verified</span></div>
              <ul className="space-y-1.5">
                {known.map((k, i) => (
                  <li key={i} className="flex gap-2 t-body-sm" style={{ color: 'var(--rd-text)' }}>
                    <CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: 'var(--rd-success)' }} />{k}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {unknown.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2"><span className="rd-dot" style={{ background: 'var(--rd-warn)' }} /><span className="t-label" style={{ color: 'var(--rd-warn)' }}>Uncertain</span></div>
              <ul className="space-y-1.5">
                {unknown.map((u, i) => (
                  <li key={i} className="flex gap-2 t-body-sm" style={{ color: 'var(--rd-text-2)' }}>
                    <CircleHelp className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: 'var(--rd-warn)' }} />{u}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {known.length === 0 && unknown.length === 0 && (
            <div className="t-caption">No evidence recorded for this cycle.</div>
          )}
        </Disclosure>

        {/* RISK */}
        {(packet.consequence_if_wrong || (packet.risks && packet.risks.length > 0)) && (
          <Disclosure title="Risk if wrong" icon={<TriangleAlert className="h-4 w-4" style={{ color: 'var(--rd-warn)' }} />}>
            {packet.consequence_if_wrong && <div className="t-body" style={{ color: 'var(--rd-text)' }}>{packet.consequence_if_wrong}</div>}
            {packet.risks && packet.risks.length > 0 && (
              <ul className="mt-2.5 space-y-1.5">
                {packet.risks.map((r: any, i: number) => (
                  <li key={i} className="t-body-sm" style={{ color: 'var(--rd-text-2)' }}>• {typeof r === 'string' ? r : r.description || JSON.stringify(r)}</li>
                ))}
              </ul>
            )}
          </Disclosure>
        )}

        {/* ALTERNATIVES */}
        <Disclosure title="Alternatives considered" count={routeList.length || undefined} icon={<RouteIcon className="h-4 w-4" style={{ color: 'var(--rd-text-2)' }} />}>
          {routeList.length > 0 ? (
            <div className="space-y-2">
              {routeList.map((r) => {
                const isRec = r.id === recId;
                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-lg px-3.5 py-2.5"
                    style={{ background: isRec ? 'var(--rd-success-soft)' : 'var(--rd-bg)', border: `1px solid ${isRec ? 'rgba(63,185,132,0.4)' : 'var(--rd-border)'}` }}
                  >
                    <div className="min-w-0">
                      <div className="t-h3 truncate" style={{ color: 'var(--rd-text)' }}>{r.name} — {r.label}</div>
                      <div className="t-tech mt-1">ETA {r.eta_minutes}m · Cap {r.people_capacity} · Risk {r.failure_risk}</div>
                    </div>
                    <Badge tone={isRec ? 'success' : r.operational ? 'neutral' : 'danger'}>
                      {isRec ? 'Recommended' : r.operational ? 'Feasible' : 'Blocked'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          ) : packet.alternative ? (
            <div className="t-body" style={{ color: 'var(--rd-text-2)' }}>{packet.alternative}</div>
          ) : (
            <div className="t-caption">No alternatives recorded.</div>
          )}
        </Disclosure>
      </div>

      {/* ACTION — human in the loop */}
      <div className="shrink-0 border-t border-[var(--rd-border)] px-5 py-4">
        <div className="mb-3 flex items-center gap-2">
          <UserCheck className="h-3.5 w-3.5" style={{ color: 'var(--rd-text-3)' }} />
          <span className="t-caption">AI recommends · a human authorizes · Sentinel monitors</span>
        </div>
        {isPending ? (
          <div className="flex gap-2.5">
            <button
              onClick={() => onAuthorize('AUTHORIZE')}
              data-testid="authorize-decision-button"
              className="rd-btn rd-btn-success flex-1"
            >
              <CheckCircle2 className="h-4 w-4" /> Authorize decision
            </button>
            <button
              onClick={() => onAuthorize('REJECT')}
              data-testid="reject-decision-button"
              className="rd-btn rd-btn-danger"
            >
              <XCircle className="h-4 w-4" /> Reject
            </button>
          </div>
        ) : (
          <div
            className="flex items-center justify-center gap-2 rounded-lg px-4 py-3 t-h3"
            style={{
              background: isAuthorized ? 'var(--rd-success-soft)' : 'var(--rd-danger-soft)',
              border: `1px solid ${isAuthorized ? 'rgba(63,185,132,0.4)' : 'rgba(229,100,94,0.4)'}`,
              color: isAuthorized ? 'var(--rd-success)' : '#f0908b',
            }}
            data-testid="decision-status"
          >
            {isAuthorized ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {isAuthorized ? 'Decision authorized' : `Decision ${packet.authorization_status.toLowerCase().replace(/_/g, ' ')}`}
          </div>
        )}
      </div>
    </div>
  );
};
