import React, { useState, useEffect, useRef } from 'react';
import { History, MapPin, Sparkles, CheckCircle2, Clock, Play, Square, ArrowRight, RefreshCw, X, Flag } from 'lucide-react';
import { Badge, SectionLabel, Confidence } from './ui';

export interface RealitySnapshot {
  version: number;
  at: string;
  cause: string;
  recommendation: string;
  routeId: string | null;
  confidence: string;
  why: string;
  authorization: string;
  replanCount: number;
  decisionId: string;
}

interface Props {
  history: RealitySnapshot[];
  currentVersion: number;
  onNarrate?: (text: string) => void;
  onStopNarrate?: () => void;
  onSelectVersion?: (snap: RealitySnapshot) => void;
  onReplayChange?: (active: boolean) => void;
  onWarmUp?: () => void;
}

export const RealityTimeline: React.FC<Props> = ({ history, currentVersion, onNarrate, onStopNarrate, onSelectVersion, onReplayChange, onWarmUp }) => {
  const [selected, setSelected] = useState<number>(currentVersion);
  const [playing, setPlaying] = useState(false);
  const [showRecap, setShowRecap] = useState(false);
  const playRef = useRef(false);

  // Follow the latest reality version as it advances (unless replaying)
  useEffect(() => {
    if (!playRef.current) setSelected(currentVersion);
  }, [currentVersion]);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const stopReplay = () => {
    playRef.current = false;
    setPlaying(false);
    onStopNarrate?.();
    onReplayChange?.(false);
  };

  const startReplay = async () => {
    if (playRef.current || history.length <= 1) return;
    playRef.current = true;
    setPlaying(true);
    setShowRecap(false);
    onWarmUp?.();
    onReplayChange?.(true);
    await sleep(350);
    let finished = true;
    try {
      for (const h of history) {
        if (!playRef.current) { finished = false; break; }
        setSelected(h.version);
        onSelectVersion?.(h);
        const cause = h.cause && h.cause !== 'Mission initialized' ? h.cause + '.' : 'Mission initialized.';
        onNarrate?.(`Reality version ${h.version}. ${cause} The system recommends ${h.recommendation}, with ${h.confidence.toLowerCase()} confidence.`);
        const ok = await (async () => { await sleep(4600); return playRef.current; })();
        if (!ok) { finished = false; break; }
      }
    } finally {
      playRef.current = false;
      setPlaying(false);
      onReplayChange?.(false);
      if (finished) setShowRecap(true);
    }
  };

  // Recap of what changed across every reality version
  const transitions = history.map((h, i) => {
    if (i === 0) return { version: h.version, changed: false, title: `Mission start · reality v${h.version}`, detail: `${h.recommendation} · ${h.confidence} confidence` };
    const prev = history[i - 1];
    const routeChanged = prev.routeId !== h.routeId;
    return {
      version: h.version,
      changed: routeChanged,
      title: `v${prev.version} → v${h.version} · ${h.cause}`,
      detail: routeChanged ? `Replanned to ${h.recommendation} (${h.confidence})` : `Held ${h.recommendation} (${h.confidence})`,
    };
  });
  const changeCount = transitions.filter((t) => t.changed).length;
  const finalAuth = history.length ? history[history.length - 1].authorization : 'PENDING';

  const snap = history.find((h) => h.version === selected) || history[history.length - 1];

  return (
    <div className="rd-panel p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <History className="h-4 w-4" style={{ color: 'var(--rd-accent)' }} />
          <span className="t-h3" style={{ color: 'var(--rd-text)' }}>Reality timeline</span>
          <span className="t-tech hidden sm:inline">replay how each replan happened</span>
        </div>
        <div className="flex items-center gap-2.5">
          {history.length > 1 && (
            <button
              onClick={playing ? stopReplay : startReplay}
              data-testid="timeline-replay-button"
              className="rd-btn rd-btn-ghost"
              style={playing ? { color: 'var(--rd-accent-2)', borderColor: 'rgba(91,141,239,0.4)' } : undefined}
            >
              {playing ? <><Square className="h-3.5 w-3.5" /> Stop replay</> : <><Play className="h-3.5 w-3.5" /> Replay mission</>}
            </button>
          )}
          <span className="t-tech">{history.length} {history.length === 1 ? 'state' : 'states'}</span>
        </div>
      </div>

      {history.length <= 1 ? (
        <div className="rounded-lg px-4 py-4 t-caption" style={{ background: 'var(--rd-bg)', border: '1px solid var(--rd-border)' }}>
          Only the initial reality has been recorded so far. As reality changes and the system replans, each new version will appear here — click any point to replay its recommendation and why it changed.
        </div>
      ) : (
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <div className="relative flex items-start" style={{ minWidth: Math.max(history.length * 150, 300) }}>
            <div className="absolute left-4 right-4 top-[15px] h-[2px]" style={{ background: 'var(--rd-border-2)' }} />
            {history.map((h) => {
              const active = h.version === selected;
              const authorized = h.authorization === 'AUTHORIZED';
              const tone = authorized ? 'var(--rd-success)' : active ? 'var(--rd-accent)' : 'var(--rd-text-3)';
              return (
                <button
                  key={h.version + h.decisionId}
                  onClick={() => setSelected(h.version)}
                  data-testid={`timeline-v${h.version}`}
                  className="relative z-10 flex flex-1 min-w-[150px] flex-col items-start gap-2 pr-4 text-left"
                >
                  <span
                    className="flex items-center justify-center rounded-full transition-all"
                    style={{
                      width: 32,
                      height: 32,
                      color: tone,
                      background: active ? 'var(--rd-accent-soft)' : authorized ? 'var(--rd-success-soft)' : 'var(--rd-panel)',
                      border: `1px solid ${active ? 'rgba(91,141,239,0.5)' : authorized ? 'rgba(63,185,132,0.4)' : 'var(--rd-border)'}`,
                      boxShadow: active ? '0 0 0 4px var(--rd-accent-soft)' : 'none',
                    }}
                  >
                    {authorized ? <CheckCircle2 className="h-4 w-4" /> : <span className="t-tech" style={{ color: tone }}>v{h.version}</span>}
                  </span>
                  <span className="leading-tight">
                    <span className="block text-[11px] font-semibold" style={{ color: active ? 'var(--rd-text)' : 'var(--rd-text-2)' }}>
                      Reality v{h.version}
                    </span>
                    <span className="block t-caption text-[10.5px] line-clamp-2 max-w-[130px]">{h.cause}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {snap && history.length > 1 && (
        <div className="mt-4 rounded-lg px-4 py-4 rd-anim-fade" style={{ background: 'var(--rd-bg)', border: '1px solid var(--rd-border)' }}>
          <div className="flex items-center justify-between">
            <SectionLabel>At reality v{snap.version}</SectionLabel>
            <span className="flex items-center gap-1.5 t-tech"><Clock className="h-3 w-3" /> {snap.at}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2">
            <div>
              <div className="t-label">Recommended</div>
              <div className="t-h3 mt-1 flex items-center gap-1.5" style={{ color: 'var(--rd-text)' }}>
                <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--rd-accent)' }} /> {snap.recommendation}
              </div>
            </div>
            <div>
              <div className="t-label">Route</div>
              <div className="t-tech mt-1 flex items-center gap-1.5" style={{ color: 'var(--rd-text)' }}>
                <MapPin className="h-3.5 w-3.5" style={{ color: 'var(--rd-text-3)' }} /> {snap.routeId || 'N/A'}
              </div>
            </div>
            <div>
              <div className="t-label">Confidence</div>
              <div className="mt-1"><Confidence level={snap.confidence} /></div>
            </div>
            <div>
              <div className="t-label">Status</div>
              <div className="mt-1">
                <Badge tone={snap.authorization === 'AUTHORIZED' ? 'success' : 'warn'}>
                  {snap.authorization === 'AUTHORIZED' ? 'Authorized' : 'Awaiting review'}
                </Badge>
              </div>
            </div>
          </div>
          {snap.why && (
            <div className="mt-3 border-t border-[var(--rd-border)] pt-3">
              <div className="t-label mb-1">Why this changed</div>
              <div className="t-body-sm" style={{ color: 'var(--rd-text-2)' }}>{snap.cause !== 'Mission initialized' ? `${snap.cause} — ` : ''}{snap.why}</div>
            </div>
          )}
        </div>
      )}

      {/* End-of-replay recap */}
      {showRecap && history.length > 1 && (
        <div className="mt-4 rounded-xl p-5 rd-anim-up" style={{ background: 'linear-gradient(180deg, var(--rd-accent-soft), var(--rd-surface))', border: '1px solid rgba(91,141,239,0.4)' }} data-testid="replay-recap">
          <div className="mb-3.5 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: 'var(--rd-accent-soft)', color: 'var(--rd-accent)' }}>
                <Flag className="h-[18px] w-[18px]" />
              </div>
              <div>
                <div className="t-h3" style={{ color: 'var(--rd-text)' }}>Mission recap</div>
                <div className="t-caption mt-0.5">
                  {history.length} reality states · the plan changed {changeCount} {changeCount === 1 ? 'time' : 'times'}
                </div>
              </div>
            </div>
            <button onClick={() => setShowRecap(false)} data-testid="recap-dismiss" aria-label="Dismiss recap" className="text-[var(--rd-text-3)] hover:text-[var(--rd-text)]"><X className="h-4 w-4" /></button>
          </div>

          <div className="space-y-2">
            {transitions.map((t) => (
              <div key={t.version} className="flex items-start gap-3 rounded-lg px-3.5 py-2.5" style={{ background: 'var(--rd-bg)', border: '1px solid var(--rd-border)' }}>
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md" style={{ background: t.changed ? 'var(--rd-warn-soft)' : 'var(--rd-panel)', color: t.changed ? 'var(--rd-warn)' : 'var(--rd-text-3)' }}>
                  {t.changed ? <RefreshCw className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
                </div>
                <div className="min-w-0">
                  <div className="t-h3 text-[12.5px]" style={{ color: 'var(--rd-text)' }}>{t.title}</div>
                  <div className="t-body-sm mt-0.5" style={{ color: t.changed ? 'var(--rd-warn)' : 'var(--rd-text-2)' }}>{t.detail}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--rd-border)] pt-3.5">
            <div className="flex items-center gap-2 t-body-sm" style={{ color: 'var(--rd-text-2)' }}>
              <CheckCircle2 className="h-4 w-4" style={{ color: finalAuth === 'AUTHORIZED' ? 'var(--rd-success)' : 'var(--rd-warn)' }} />
              {finalAuth === 'AUTHORIZED'
                ? 'Final plan authorized by a human — Sentinel is monitoring.'
                : 'Final plan is awaiting human authorization — Sentinel is monitoring.'}
            </div>
            <button onClick={startReplay} data-testid="recap-replay-again" className="rd-btn rd-btn-ghost">
              <Play className="h-3.5 w-3.5" /> Replay again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
