import React, { useState, useEffect, useRef } from 'react';
import { History, MapPin, Sparkles, CheckCircle2, Clock, Play, Square } from 'lucide-react';
import { Badge, SectionLabel, Confidence } from './ui';
import { TRANSLATIONS, translateDynamicText, type Language } from '../i18n';

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
  lang?: Language;
}

export const RealityTimeline: React.FC<Props> = ({
  history,
  currentVersion,
  onNarrate,
  onStopNarrate,
  onSelectVersion,
  onReplayChange,
  onWarmUp,
  lang = 'en',
}) => {
  const [selected, setSelected] = useState<number>(currentVersion);
  const [playing, setPlaying] = useState(false);
  const playRef = useRef(false);
  const t = TRANSLATIONS[lang];

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
    onWarmUp?.();
    onReplayChange?.(true);
    await sleep(350);
    try {
      for (const h of history) {
        if (!playRef.current) break;
        setSelected(h.version);
        onSelectVersion?.(h);
        const cause = translateDynamicText(h.cause, lang);
        const rec = translateDynamicText(h.recommendation, lang);
        const text = lang === 'hi'
          ? `विश्व स्थिति संस्करण v${h.version}। ${cause}। सिस्टम ने ${rec} की अनुशंसा की।`
          : `Reality version ${h.version}. ${cause}. The system recommends ${h.recommendation}, with ${h.confidence.toLowerCase()} confidence.`;
        onNarrate?.(text);
        if (!(await (async () => { await sleep(4600); return playRef.current; })())) break;
      }
    } finally {
      playRef.current = false;
      setPlaying(false);
      onReplayChange?.(false);
    }
  };

  const snap = history.find((h) => h.version === selected) || history[history.length - 1];

  return (
    <div className="rd-panel p-5 bg-[var(--rd-surface)] border border-[var(--rd-border)] rounded-xl shadow-lg">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <History className="h-4 w-4 text-cyan-400" />
          <span className="t-h3 text-white font-bold">{t.timelineTitle}</span>
          <span className="text-xs font-mono text-slate-400 hidden sm:inline">{t.timelineSubtitle}</span>
        </div>
        <div className="flex items-center gap-2.5">
          {history.length > 1 && (
            <button
              onClick={playing ? stopReplay : startReplay}
              data-testid="timeline-replay-button"
              className="rd-btn rd-btn-ghost text-xs font-bold font-mono"
            >
              {playing ? (
                <><Square className="h-3.5 w-3.5 text-rose-400" /> {t.timelineReplayStop}</>
              ) : (
                <><Play className="h-3.5 w-3.5 text-cyan-400" /> {t.timelineReplayBtn}</>
              )}
            </button>
          )}
          <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
            {history.length} {lang === 'hi' ? 'स्नैपशॉट दर्ज' : (history.length === 1 ? 'state' : 'states')}
          </span>
        </div>
      </div>

      {history.length <= 1 ? (
        <div className="rounded-xl px-4 py-4 text-xs text-slate-300 bg-[var(--rd-panel)] border border-[var(--rd-border)]">
          {lang === 'hi'
            ? 'अभी तक केवल प्रारंभिक परिचालन स्थिति दर्ज की गई है। जैसे ही जमीनी हालात बदलेंगे और सिस्टम पुनर्योजना बनाएगा, प्रत्येक नया संस्करण यहां कालानुक्रमिक रूप से दर्ज होगा।'
            : 'Only initial reality recorded so far. As reality changes and the system replans, each new version will appear here.'}
        </div>
      ) : (
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <div className="relative flex items-start" style={{ minWidth: Math.max(history.length * 160, 320) }}>
            <div className="absolute left-4 right-4 top-[15px] h-[2px] bg-slate-800" />
            {history.map((h) => {
              const active = h.version === selected;
              const authorized = h.authorization === 'AUTHORIZED';
              const tone = authorized ? '#10b981' : active ? '#38bdf8' : '#64748b';
              const translatedCause = translateDynamicText(h.cause, lang);

              return (
                <button
                  key={h.version + h.decisionId}
                  onClick={() => setSelected(h.version)}
                  data-testid={`timeline-v${h.version}`}
                  className="relative z-10 flex flex-1 min-w-[160px] flex-col items-start gap-2 pr-4 text-left"
                >
                  <span
                    className="flex items-center justify-center rounded-full transition-all border"
                    style={{
                      width: 32,
                      height: 32,
                      color: tone,
                      background: active ? '#082f49' : authorized ? '#064e3b' : '#0f172a',
                      borderColor: active ? '#06b6d4' : authorized ? '#10b981' : '#334155',
                      boxShadow: active ? '0 0 0 4px rgba(6,182,212,0.2)' : 'none',
                    }}
                  >
                    {authorized ? <CheckCircle2 className="h-4 w-4" /> : <span className="text-xs font-mono font-bold">v{h.version}</span>}
                  </span>
                  <span className="leading-tight">
                    <span className="block text-[11px] font-bold text-slate-100">
                      {lang === 'hi' ? `विश्व स्थिति v${h.version}` : `Reality v${h.version}`}
                    </span>
                    <span className="block text-[10.5px] text-slate-400 line-clamp-2 max-w-[140px] font-sans">
                      {translatedCause}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {snap && history.length > 1 && (
        <div className="mt-4 rounded-xl px-4 py-4 bg-[var(--rd-panel)] border border-[var(--rd-border)] rd-anim-fade space-y-3">
          <div className="flex items-center justify-between">
            <SectionLabel className="text-slate-300 font-bold">
              {t.timelineAtReality}: v{snap.version}
            </SectionLabel>
            <span className="flex items-center gap-1.5 text-xs font-mono text-cyan-400">
              <Clock className="h-3.5 w-3.5" /> {snap.at}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <div className="t-label text-slate-400">{t.timelineRec}</div>
              <div className="font-bold text-white mt-1 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-cyan-400 flex-shrink-0" />
                <span>{translateDynamicText(snap.recommendation, lang)}</span>
              </div>
            </div>
            <div>
              <div className="t-label text-slate-400">{t.timelineRoute}</div>
              <div className="font-mono text-slate-200 font-bold mt-1 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-cyan-400" />
                {snap.routeId?.toUpperCase() || 'R-14'}
              </div>
            </div>
            <div>
              <div className="t-label text-slate-400">{t.timelineConfidence}</div>
              <div className="mt-1"><Confidence level={snap.confidence} lang={lang} /></div>
            </div>
            <div>
              <div className="t-label text-slate-400">{t.timelineStatus}</div>
              <div className="mt-1">
                <Badge tone={snap.authorization === 'AUTHORIZED' ? 'success' : 'warn'}>
                  {snap.authorization === 'AUTHORIZED'
                    ? (lang === 'hi' ? 'स्वीकृत एवं सक्रिय' : 'Authorized')
                    : (lang === 'hi' ? 'हस्ताक्षर प्रतीक्षित' : 'Awaiting review')}
                </Badge>
              </div>
            </div>
          </div>

          {snap.why && (
            <div className="pt-3 border-t border-slate-800 text-xs">
              <div className="t-label text-slate-400 mb-1">{t.timelineWhyChanged}</div>
              <div className="text-slate-300">
                {translateDynamicText(snap.cause, lang)} — {translateDynamicText(snap.why, lang)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
