import React, { useState, useEffect, useRef } from 'react';
import { History, MapPin, Sparkles, CheckCircle2, Clock, Play, Square } from 'lucide-react';
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
}

export const RealityTimeline: React.FC<Props> = ({ history, currentVersion, onNarrate, onStopNarrate }) => {
  const [selected, setSelected] = useState<number>(currentVersion);
  const [playing, setPlaying] = useState(false);
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
  };

  const startReplay = async () => {
    if (playRef.current || history.length <= 1) return;
    playRef.current = true;
    setPlaying(true);
    try {
      for (const h of history) {
        if (!playRef.current) break;
        setSelected(h.version);
        const cause = h.cause && h.cause !== 'Mission initialized' ? h.cause + '.' : 'Mission initialized.';
        onNarrate?.(`Reality version ${h.version}. ${cause} The system recommends ${h.recommendation}, with ${h.confidence.toLowerCase()} confidence.`);
        if (!(await (async () => { await sleep(4600); return playRef.current; })())) break;
      }
    } finally {
      playRef.current = false;
      setPlaying(false);
    }
  };

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
    </div>
  );
};
