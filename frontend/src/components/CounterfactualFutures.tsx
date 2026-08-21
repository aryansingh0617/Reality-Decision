import React, { useState } from 'react';
import { GitFork, Clock, TrendingUp } from 'lucide-react';
import { Badge, SectionLabel, EmptyState } from './ui';

interface BranchData {
  name: string;
  recommendation: string;
  route_id: string;
  delay_min: number;
  branch_status: string;
  score: number;
}

interface Props {
  branches?: BranchData[];
  packet?: any | null;
  onSelectBranch?: (branch: BranchData) => void;
}

export const CounterfactualFutures: React.FC<Props> = ({ branches: rawBranches, packet, onSelectBranch }) => {
  const branches: BranchData[] = rawBranches || packet?.counterfactual_branches || [];
  const [selected, setSelected] = useState<string | null>(branches[0]?.name || null);
  const active = branches.find((b) => b.name === selected) || branches[0];

  if (!branches.length) {
    return (
      <div className="rd-panel h-full">
        <EmptyState
          icon={<GitFork className="h-7 w-7" />}
          title="No simulations yet"
          body="Run a decision cycle to explore what would happen under different conditions — and see which alternative the system would fall back to."
        />
      </div>
    );
  }

  const tone = (s: string) => (s === 'RECOMMENDED' ? 'success' : s === 'UNCERTAIN' ? 'warn' : 'danger');

  return (
    <div className="rd-panel flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--rd-border)] px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <GitFork className="h-4 w-4" style={{ color: 'var(--rd-accent)' }} />
          <span className="t-h3" style={{ color: 'var(--rd-text)' }}>What if the situation changes?</span>
        </div>
        <span className="t-tech">{branches.length} simulated futures</span>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <div>
          <SectionLabel className="mb-2.5">Simulated conditions</SectionLabel>
          <div className="grid gap-3 md:grid-cols-3 rd-stagger">
            {branches.map((b) => {
              const sel = b.name === (selected || branches[0]?.name);
              return (
                <button
                  key={b.name}
                  onClick={() => {
                    setSelected(b.name);
                    onSelectBranch?.(b);
                  }}
                  className="rd-card relative overflow-hidden p-4 text-left transition-all"
                  style={sel ? { borderColor: 'var(--rd-accent)', boxShadow: '0 0 0 3px var(--rd-accent-soft)' } : undefined}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="t-h3 truncate" style={{ color: 'var(--rd-text)' }}>{b.name}</span>
                    <Badge tone={tone(b.branch_status)}>{b.branch_status}</Badge>
                  </div>
                  <div className="t-body-sm truncate" style={{ color: 'var(--rd-text-2)' }}>{b.recommendation}</div>
                  <div className="mt-3 flex items-center justify-between t-tech">
                    <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> +{b.delay_min}m delay</span>
                    <span>{(b.score * 100).toFixed(0)}% fit</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {active && (
          <div className="rd-card p-5 rd-anim-fade">
            <div className="flex items-center justify-between border-b border-[var(--rd-border)] pb-3.5">
              <div>
                <SectionLabel>Outcome analysis</SectionLabel>
                <div className="t-h2 mt-1.5" style={{ color: 'var(--rd-text)' }}>{active.name}</div>
              </div>
              <div className="text-right">
                <SectionLabel>Stress score</SectionLabel>
                <div className="t-num mt-1.5 flex items-center gap-1.5 text-[20px] font-semibold" style={{ color: 'var(--rd-accent-2)' }}>
                  <TrendingUp className="h-4 w-4" />
                  {(active.score * 100).toFixed(0)}<span className="t-caption">/100</span>
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                ['Target route', active.route_id || 'N/A'],
                ['Estimated delay', `+${active.delay_min} min`],
                ['Status', active.branch_status],
                ['Decision window', 'Feasible < 30m'],
              ].map(([k, v]) => (
                <div key={k}>
                  <div className="t-label">{k}</div>
                  <div className="t-h3 mt-1.5" style={{ color: 'var(--rd-text)' }}>{v}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg px-4 py-3.5" style={{ background: 'var(--rd-bg)', border: '1px solid var(--rd-border)' }}>
              <div className="t-label mb-1.5">Simulated outcome</div>
              <p className="t-body" style={{ color: 'var(--rd-text-2)' }}>
                {active.recommendation}. Evaluated under stress testing for downstream capacity, weather delay, and evidence confidence.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
