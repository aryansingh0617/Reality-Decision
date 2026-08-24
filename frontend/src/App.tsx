import { useState, useEffect, useRef } from 'react';
import {
  fetchState,
  injectEvent,
  authorizeDecision,
  streamAutonomousMission,
  toggleSimulatedFallback,
  fetchHealthStatus,
  DEFAULT_STATE,
  type RealityState,
  type AgentStep,
} from './api';

import { SpatialMapCanvas } from './components/SpatialMapCanvas';
import { DecisionPacketView } from './components/DecisionPacketView';
import { AgentTrace } from './components/AgentTrace';
import { DependencyGraph } from './components/DependencyGraph';
import { CounterfactualFutures } from './components/CounterfactualFutures';
import { W3CProvView } from './components/W3CProvView';
import { VerifyAutonomyPanel } from './components/VerifyAutonomyPanel';
import { GuidedWalkthrough } from './components/GuidedWalkthrough';
import { WorkflowStepper } from './components/WorkflowStepper';
import { SentinelBar } from './components/SentinelBar';
import { RealityTimeline, type RealitySnapshot } from './components/RealityTimeline';
import { Metric } from './components/ui';
import { PravahDashboardViews, PravahDataBadge, type DashboardMode } from './components/PravahDashboardViews';
import { PSComplianceModal } from './components/PSComplianceModal';
import { DispatchSlipModal } from './components/DispatchSlipModal';
import { TRANSLATIONS, type Language } from './i18n';

import {
  LayoutDashboard,
  Sparkles as SparklesIcon,
  Activity,
  MapPin,
  GitBranch,
  ShieldCheck,
  Play,
  Zap,
  AlertTriangle,
  X,
  GitFork,
  FileJson,
  RefreshCw,
  PlayCircle,
  Square,
  Volume2,
  VolumeX,
  Network,
  Settings2,
  Languages,
  FileText,
} from 'lucide-react';

type Section = 'command' | 'decision' | 'activity' | 'map' | 'analysis';
type AnalysisTab = 'counterfactuals' | 'dependency' | 'provenance';

export function App() {
  const [section, setSection] = useState<Section>('command');
  const [analysisTab, setAnalysisTab] = useState<AnalysisTab>('counterfactuals');
  const [state, setState] = useState<RealityState>(DEFAULT_STATE);
  const [localSteps, setLocalSteps] = useState<AgentStep[]>([]);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walkthroughOpen, setWalkthroughOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [complianceOpen, setComplianceOpen] = useState(false);
  const [dispatchSlipOpen, setDispatchSlipOpen] = useState(false);
  const [fallbackForced, setFallbackForced] = useState(false);
  const [demo, setDemo] = useState<{ active: boolean; caption: string; step: number }>({ active: false, caption: '', step: 0 });
  const demoRef = useRef(false);
  const [narrate, setNarrate] = useState(true);
  const narrateRef = useRef(true);
  const [rate, setRate] = useState(0.92);
  const rateRef = useRef(0.92);
  const [lang, setLang] = useState('en-US');
  const langRef = useRef('en-US');
  const [voiceURI, setVoiceURI] = useState<string | null>(null);
  const voiceRef = useRef<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [mapMode, setMapMode] = useState<'operational' | 'network'>('operational');
  const [replayRouteId, setReplayRouteId] = useState<string | null>(null);
  const [replaying, setReplaying] = useState(false);
  const [history, setHistory] = useState<RealitySnapshot[]>([]);
  const [pravahMode, setPravahMode] = useState<DashboardMode>('DISTRICT_CONNECTIVITY');
  const [appLang, setAppLang] = useState<Language>('en');

  const t = TRANSLATIONS[appLang];
  const isHindi = appLang === 'hi';

  const WORKING_MSGS = isHindi ? [
    'वास्तविक डेटा पढ़ा जा रहा है…',
    'साक्ष्यों की जांच हो रही है…',
    'उपलब्ध गलियारों की तुलना हो रही है…',
    'बाढ़ सिमुलेशन चल रहा है…',
    'सुरक्षा गेट द्वारा योजना सत्यापित…',
    'अनुशंसा पैकेट तैयार हो रहा है…',
  ] : [
    'Reading current reality…',
    'Inspecting evidence…',
    'Comparing available options…',
    'Running simulation…',
    'Validating the plan…',
    'Generating recommendation…',
  ];

  const NAV: { key: Section; label: string; icon: React.ElementType }[] = [
    { key: 'command', label: t.navCommand, icon: LayoutDashboard },
    { key: 'decision', label: t.navDecision, icon: SparklesIcon },
    { key: 'activity', label: t.navActivity, icon: Activity },
    { key: 'map', label: t.navMap, icon: MapPin },
    { key: 'analysis', label: t.navAnalysis, icon: GitBranch },
  ];

  // Load available speech voices
  useEffect(() => {
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    if (!synth) return;
    const load = () => {
      const vs = synth.getVoices();
      if (!vs.length) return;
      setVoices(vs);
      voicesRef.current = vs;
      if (!voiceRef.current) {
        const pref =
          vs.find((v) => (isHindi ? /hi(-|_)IN/i.test(v.lang) : /en(-|_)US/i.test(v.lang))) ||
          vs.find((v) => v.lang.startsWith(isHindi ? 'hi' : 'en'));
        if (pref) {
          setVoiceURI(pref.voiceURI);
          voiceRef.current = pref.voiceURI;
          setLang(pref.lang);
          langRef.current = pref.lang;
        }
      }
    };
    load();
    synth.onvoiceschanged = load;
    return () => {
      if (synth) synth.onvoiceschanged = null;
    };
  }, [appLang]);

  const speak = (text: string) => {
    if (!narrateRef.current || typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      const synth = window.speechSynthesis;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = rateRef.current;
      u.pitch = 1.0;
      u.lang = isHindi ? 'hi-IN' : 'en-US';
      const v = voicesRef.current.find((vv) => vv.lang.startsWith(isHindi ? 'hi' : 'en'));
      if (v) u.voice = v;
      synth.speak(u);
    } catch {}
  };

  const stopSpeaking = () => {
    try {
      window.speechSynthesis?.cancel();
    } catch {}
  };

  const warmedRef = useRef(false);
  const warmUp = () => {
    if (warmedRef.current || typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      window.speechSynthesis.speak(u);
      warmedRef.current = true;
    } catch {}
  };

  // Poll state on mount with automatic background reconnect
  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      try {
        const s = await fetchState();
        if (mounted && s) {
          setState(s);
          setError(null);
        }
      } catch (_err) {
        if (mounted) {
          setState((prev) => prev || DEFAULT_STATE);
        }
      }
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Track state history for timeline replay
  const lastRecordedVersion = useRef<number | null>(null);
  useEffect(() => {
    if (!state || state.world_state_version == null) return;
    if (lastRecordedVersion.current === state.world_state_version) return;
    lastRecordedVersion.current = state.world_state_version;
    const snap: RealitySnapshot = {
      version: state.world_state_version,
      at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      cause: state.last_state_change || `State v${state.world_state_version}`,
      recommendation: state.current_packet?.recommendation || 'No recommendation',
      routeId: state.current_packet?.route_id || null,
      confidence: state.current_packet?.confidence || 'HIGH',
      why: (state.current_packet?.why && state.current_packet.why[0]) || 'Operational evaluation',
      authorization: state.current_packet?.authorization_status || 'PENDING',
      replanCount: state.replan_count || 0,
      decisionId: state.current_packet?.decision_id || 'dec_0',
    };
    setHistory((h) => {
      if (h.some((x) => x.version === snap.version)) {
        return h.map((x) => (x.version === snap.version ? snap : x));
      }
      return [...h, snap];
    });
  }, [state]);

  const runCycle = async () => {
    setWorking(true);
    setLocalSteps([]);
    setError(null);
    try {
      streamAutonomousMission(
        (stepName: string, data: any) => {
          setLocalSteps((prev: AgentStep[]) => [
            ...prev,
            {
              agent: `Autonomous Planner (${stepName})`,
              status: 'SUCCESS',
              inputs: JSON.stringify(data),
              outputs: typeof data === 'string' ? data : JSON.stringify(data),
              reasoning: `Executed tool '${stepName}'`,
              latency_ms: 15,
              mode: 'LLM_AGENTIC',
            },
          ]);
        },
        async () => {
          const s = await fetchState();
          setState(s);
          setWorking(false);
        },
        (err: any) => {
          setError(err.message || 'Decision cycle failed');
          setWorking(false);
        }
      );
    } catch (err: any) {
      setError(err.message || 'Cycle failed');
      setWorking(false);
    }
  };

  const handleAuthorize = async (action: string) => {
    try {
      const s = await authorizeDecision(action, state?.world_state_version);
      setState(s);
    } catch (err: any) {
      setError(err.message || 'Authorization failed');
    }
  };

  const injectDisruption = async (eventId: string) => {
    setWorking(true);
    setError(null);
    try {
      const next = await injectEvent(eventId);
      if (next) setState(next);
      runCycle();
    } catch (_err: any) {
      runCycle();
    } finally {
      setWorking(false);
    }
  };

  const toggleFallback = async () => {
    const nextForced = !fallbackForced;
    setFallbackForced(nextForced);
    setState((prev) => {
      const next = JSON.parse(JSON.stringify(prev || DEFAULT_STATE));
      next.reasoning_mode = nextForced ? 'DETERMINISTIC_FALLBACK' : 'LLM_AGENTIC';
      next.llm_mode_active = !nextForced;
      if (next.current_packet) {
        next.current_packet.reasoning_mode = nextForced ? 'DETERMINISTIC_FALLBACK' : 'LLM_AGENTIC';
      }
      return next;
    });
    try {
      await toggleSimulatedFallback(nextForced);
    } catch (_err: any) {}
  };

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const stopDemo = () => {
    demoRef.current = false;
    stopSpeaking();
    setDemo({ active: false, caption: '', step: 0 });
  };

  const runAutoDemo = async () => {
    if (demoRef.current) return;
    demoRef.current = true;
    setSection('command');
    setError(null);
    const say = (caption: string, step: number) => {
      setDemo({ active: true, caption, step });
      speak(caption);
    };
    const alive = async (ms: number) => {
      await sleep(ms);
      return demoRef.current;
    };

    const captions = isHindi ? [
      'परिचालन स्थिति स्थिर है — सिस्टम के पास मार्ग R-12 के लिए अनुशंसित योजना है।',
      'निर्णय चक्र चलाया जा रहा है — जल स्तर और मार्ग जोखिमों का विश्लेषण जारी है…',
      'वास्तविक व्यवधान: सरायघाट पुल B-07 जलमग्न हो गया — मार्ग R-12 अवरुद्ध हो चुका है।',
      'स्वायत्त पुनर्योजना पूर्ण: प्रवाह ने सुरक्षित वैकल्पिक मार्ग R-14 (NH-6 बाईपास) की अनुशंसा की।',
      'इंसिडेंट कमांडर साक्ष्यों की पुष्टि करते हुए नई बाईपास योजना को अधिकृत करते हैं।',
      'प्रहरी (Sentinel) मिशन की लगातार निगरानी कर रहा है — बदलाव होते ही तत्काल पुनर्योजना बनेगी।',
    ] : [
      'Reality is stable — the system holds a current recommendation for Route R-12.',
      'Running a decision cycle — reading reality and weighing every corridor…',
      'Disruption alert: Saraighat Bridge B-07 is submerged — Route R-12 is compromised.',
      'Autonomous replan complete: PRAVAH recommends Route R-14, the safe bypass.',
      'Incident Commander validates the evidence and authorizes the new plan.',
      'Continuous Sentinel keeps monitoring reality — it will replan the moment things change.',
    ];

    try {
      warmUp();
      await sleep(350);
      say(captions[0], 1);
      if (!(await alive(3200))) return;
      say(captions[1], 2);
      runCycle();
      if (!(await alive(7000))) return;
      say(captions[2], 3);
      try {
        setState(await injectEvent('bridge_fails'));
      } catch {}
      runCycle();
      if (!(await alive(7500))) return;
      say(captions[3], 4);
      if (!(await alive(3500))) return;
      say(captions[4], 5);
      try {
        const s = await fetchState();
        setState(await authorizeDecision('AUTHORIZE', s.world_state_version));
      } catch {}
      if (!(await alive(2800))) return;
      say(captions[5], 6);
      if (!(await alive(4000))) return;
    } finally {
      demoRef.current = false;
      stopSpeaking();
      setDemo({ active: false, caption: '', step: 0 });
    }
  };

  const packet = state?.current_packet || null;
  const steps = state?.agent_steps?.length ? state.agent_steps : localSteps;
  const authorized = packet?.authorization_status === 'AUTHORIZED';

  let stageIndex = 0;
  if (working) stageIndex = Math.min(1 + localSteps.length, 5);
  else if (authorized) stageIndex = 7;
  else if (packet?.authorization_status === 'PENDING') stageIndex = 6;
  else if (packet) stageIndex = 5;
  const workingLabel = WORKING_MSGS[Math.min(localSteps.length, WORKING_MSGS.length - 1)];

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#07090e] text-[#f8fafc]">
      {/* Error banner */}
      {error && (
        <div className="flex items-center justify-between px-4 py-2 bg-rose-950/80 border-b border-rose-600 text-rose-200 rd-anim-fade text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
            <span>{t.engineUnreachable} ({error})</span>
          </div>
          <button onClick={() => setError(null)} aria-label="Dismiss" className="text-rose-300 hover:text-white font-bold">
            ✕ {t.dismiss}
          </button>
        </div>
      )}

      {/* Unified Tactical Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--rd-border)] px-5 bg-[var(--rd-surface)]/90 backdrop-blur-xl shadow-lg sticky top-0 z-40">
        <div className="flex items-center gap-3.5">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 via-sky-600 to-blue-700 font-bold text-white shadow-lg shadow-cyan-500/25 border border-cyan-400/30 text-sm">
            प्र
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#070c14] shadow-sm animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm tracking-tight text-white font-bold font-sans">
                {t.appName} <span className="text-cyan-400 font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/50">{t.psTag}</span>
              </span>
              <PravahDataBadge type="REAL" lang={appLang} />
            </div>
            <div className="text-[10.5px] text-slate-400 font-sans truncate max-w-sm hidden sm:block">{t.appSubtitle}</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Language Switcher */}
          <button
            onClick={() => setAppLang((l) => (l === 'en' ? 'hi' : 'en'))}
            data-testid="language-toggle-button"
            className="flex items-center gap-1.5 text-xs bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/60 px-3 py-1.5 rounded-lg font-bold transition-all shadow-sm hover:shadow-cyan-500/20"
          >
            <Languages className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isHindi ? 'English' : 'हिन्दी (Hindi)'}</span>
          </button>

          <button onClick={() => setDispatchSlipOpen(true)} data-testid="dispatch-slip-button" className="rd-btn rd-btn-ghost hidden sm:inline-flex text-xs text-emerald-300 border-emerald-800/60 bg-emerald-950/40 hover:bg-emerald-900/60 shadow-sm">
            <FileText className="h-3.5 w-3.5 text-emerald-400" /> {isHindi ? 'NDMA आदेश (IAP)' : 'NDMA Order (IAP)'}
          </button>
          <button onClick={() => setComplianceOpen(true)} data-testid="compliance-matrix-button" className="rd-btn rd-btn-ghost hidden sm:inline-flex text-xs text-cyan-300 border-cyan-800/60 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-sm">
            <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" /> {isHindi ? 'PS 26002 अनुपालन' : 'PS 26002 Matrix'}
          </button>
          <button onClick={() => setWalkthroughOpen(true)} data-testid="walkthrough-button" className="rd-btn rd-btn-ghost hidden md:inline-flex text-xs text-slate-300 hover:text-white">
            <SparklesIcon className="h-3.5 w-3.5 text-cyan-400" /> {t.howItWorks}
          </button>
          <button onClick={() => setVerifyOpen(true)} data-testid="verify-autonomy-button" className="rd-btn rd-btn-ghost hidden lg:inline-flex text-xs text-emerald-300 hover:text-emerald-200 border-emerald-900/40 bg-emerald-950/20">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> {t.verifyAutonomy}
          </button>
          <button
            onClick={toggleFallback}
            data-testid="simulate-outage-button"
            title="Simulate model outage to verify deterministic fallback"
            className="rd-btn rd-btn-ghost hidden sm:inline-flex text-xs"
            style={fallbackForced ? { color: '#fbbf24', borderColor: 'rgba(245,158,11,0.5)', background: 'rgba(245,158,11,0.15)' } : undefined}
          >
            <Zap className="h-3.5 w-3.5 text-amber-400" /> <span>{fallbackForced ? t.outageOn : t.simulateOutage}</span>
          </button>

          {/* Narration settings */}
          <div className="relative">
            <button
              onClick={() => setVoiceOpen((o) => !o)}
              data-testid="narration-settings-button"
              title="Voice narration settings"
              className="rd-btn rd-btn-ghost text-xs"
              style={narrate ? { color: '#38bdf8', borderColor: 'rgba(6,182,212,0.4)' } : undefined}
            >
              {narrate ? <Volume2 className="h-3.5 w-3.5 text-cyan-400" /> : <VolumeX className="h-3.5 w-3.5 text-slate-400" />}
              <span className="hidden lg:inline">{t.narration}</span>
            </button>
            {voiceOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setVoiceOpen(false)} />
                <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-64 rounded-xl p-3 bg-[var(--rd-elevated)] border border-slate-700 shadow-2xl space-y-2.5 rd-anim-up">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                    <span className="font-bold text-[11px] text-white uppercase tracking-wider">{t.narration}</span>
                    <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={narrate}
                        onChange={(e) => {
                          setNarrate(e.target.checked);
                          narrateRef.current = e.target.checked;
                          if (!e.target.checked) stopSpeaking();
                        }}
                        className="rounded accent-cyan-500"
                      />
                      <span>{t.voiceOver}</span>
                    </label>
                  </div>
                  <div>
                    <div className="text-[10.5px] font-bold text-slate-400 mb-1">{t.langSelect}</div>
                    <select
                      value={lang}
                      onChange={(e) => {
                        setLang(e.target.value);
                        langRef.current = e.target.value;
                      }}
                      className="w-full rounded-md px-2 py-1 text-xs bg-[var(--rd-panel)] border border-slate-700 text-white font-mono"
                    >
                      {[...new Set(voices.map((v) => v.lang))].sort().map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Sentinel Alert Bar */}
      <SentinelBar
        status={state?.sentinel_status || 'MONITORING'}
        replanCount={state?.replan_count || 0}
        version={state?.world_state_version || 1}
        authorized={authorized}
        replanning={working}
        lang={appLang}
      />

      {/* Unified Luxury Navigation Bar */}
      <nav className="flex shrink-0 items-center gap-1.5 border-b border-[var(--rd-border)] px-5 py-2 overflow-x-auto bg-[var(--rd-surface)]/80 backdrop-blur-md sticky top-14 z-30">
        {NAV.map((n) => {
          const Icon = n.icon;
          const active = section === n.key;
          return (
            <button
              key={n.key}
              onClick={() => setSection(n.key)}
              data-testid={`nav-${n.key}`}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all border ${
                active
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 shadow-md shadow-cyan-500/10'
                  : 'bg-[var(--rd-panel)] text-slate-400 border-[var(--rd-border)] hover:bg-[var(--rd-elevated)] hover:text-white'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${active ? 'text-cyan-400' : 'text-slate-400'}`} />
              {n.label}
            </button>
          );
        })}
      </nav>

      {/* Guided Walkthrough Banner */}
      {demo.active && (
        <div className="sticky top-[102px] z-30 flex items-center justify-between border-b border-cyan-500/40 bg-gradient-to-r from-cyan-950/90 via-sky-950/90 to-blue-950/90 px-6 py-2.5 text-xs text-cyan-200 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-mono font-bold uppercase tracking-wider text-cyan-300">
              {t.guidedDemo} [{demo.step}/4]:
            </span>
            <span className="font-medium text-white">{demo.caption}</span>
          </div>
          <button
            onClick={stopDemo}
            className="flex items-center gap-1 font-mono font-bold text-cyan-300 hover:text-white px-2 py-0.5 rounded bg-cyan-900/60 border border-cyan-700/60 transition-colors"
          >
            <X className="h-3 w-3" /> {t.stopDemo}
          </button>
        </div>
      )}

      {/* Main Tactical Workspace */}
      <main className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8 space-y-4">
        {section === 'command' && (
          <div className="mx-auto max-w-[1600px] space-y-4 rd-anim-fade">
            {/* Top Operational Reality Strip */}
            <div className="space-y-3">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-stretch">
                <div className="rd-panel rd-shimmer flex flex-1 flex-col justify-between p-5 bg-[var(--rd-surface)] border border-[var(--rd-border)] rounded-2xl shadow-xl">
                  <div>
                    <div className="t-label text-cyan-400 font-bold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      <span>{t.currentSituation}</span>
                    </div>
                    <div className="t-h1 mt-1.5 text-white font-bold text-lg tracking-tight font-sans">
                      {isHindi ? 'कामरूप मेट्रोपॉलिटन / गुवाहाटी NH-27 आपातकालीन लॉजिस्टिक्स गलियारा' : (state?.mission || 'Emergency Logistics Mission')}
                    </div>
                    <div className="t-body mt-1.5 text-slate-300 text-xs leading-relaxed max-w-3xl">
                      {isHindi
                        ? 'ब्रह्मपुत्र नदी के जल स्तर और सरायघाट पुल B-07 की वास्तविक समय में निगरानी जारी है। निर्णय चक्र चलाकर सिस्टम वास्तविकता की जांच करेगा और सुरक्षित मार्ग की अनुशंसा करेगा।'
                        : (state?.last_state_change || 'Monitoring live conditions. Run a decision cycle to let the system investigate reality and recommend the safest action.')}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2.5">
                    <button
                      onClick={runCycle}
                      disabled={working || demo.active}
                      data-testid="run-cycle-button"
                      className="rd-btn rd-btn-primary rd-shimmer shadow-lg shadow-cyan-500/25"
                    >
                      {working ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-white" />}
                      {working ? t.runningCycle : t.runDecisionCycle}
                    </button>
                    <button
                      onClick={() => injectDisruption('bridge_fails')}
                      disabled={working || demo.active}
                      data-testid="inject-bridge-button"
                      className="rd-btn bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-600/70 font-bold shadow-lg shadow-rose-950/30 hover:border-rose-500"
                    >
                      <AlertTriangle className="h-4 w-4 text-rose-400" /> {t.simulateBridgeFail}
                    </button>
                    <button
                      onClick={demo.active ? stopDemo : runAutoDemo}
                      data-testid="auto-demo-button"
                      className="rd-btn rd-btn-ghost font-bold border-cyan-800/40 hover:border-cyan-500/60"
                    >
                      {demo.active ? (
                        <><Square className="h-3.5 w-3.5 text-rose-400" /> {t.stopDemo}</>
                      ) : (
                        <><PlayCircle className="h-3.5 w-3.5 text-cyan-400" /> {t.guidedDemo}</>
                      )}
                    </button>
                  </div>
                </div>

                {/* Top Summary Metrics */}
                <div className="grid grid-cols-2 gap-3 xl:w-[440px]">
                  <Metric
                    label={t.metricWaterLevel}
                    value={`${state?.current_water_depth_m ?? 0.35}m`}
                    hint={isHindi ? 'सीमा: 0.50m' : 'Limit: 0.50m'}
                    tone={(state?.current_water_depth_m ?? 0) > 0.5 ? 'danger' : 'neutral'}
                  />
                  <Metric
                    label={t.metricRiseRate}
                    value={`+${state?.water_rise_rate_m_hr ?? 0.15}m/h`}
                    hint={isHindi ? 'CWC गेज डेटा' : 'CWC Gauge'}
                    tone="warn"
                  />
                  <Metric
                    label={t.metricTimeToImpact}
                    value={
                      packet?.tti_minutes !== undefined && packet.tti_minutes > 0 && packet.tti_minutes < 900
                        ? `${Math.round(packet.tti_minutes)} min`
                        : packet?.tti_minutes === 0
                        ? (isHindi ? '0 min (जलमग्न)' : '0 min (Submerged)')
                        : packet?.route_id === 'route_r14'
                        ? (isHindi ? '340 min (सुरक्षित)' : '340 min (Safe)')
                        : (isHindi ? '60 min (सक्रिय)' : '60 min (Active)')
                    }
                    hint={
                      packet?.tti_minutes === 0
                        ? (isHindi ? 'सरायघाट पुल जलमग्न' : 'Bridge B-07 Submerged')
                        : packet?.route_id === 'route_r14'
                        ? (isHindi ? 'NH-6 दक्षिण बाईपास सुरक्षित' : 'NH-6 Bypass Clear')
                        : (isHindi ? 'पुल जलमग्नता गणना' : 'Submergence TTI')
                    }
                    tone={packet?.tti_minutes === 0 ? 'danger' : (packet?.tti_minutes ?? 60) < 45 ? 'warn' : 'accent'}
                  />
                  <Metric
                    label={t.metricPlanStatus}
                    value={authorized ? t.statusAuthorized : packet ? t.statusAwaiting : t.statusNone}
                    hint={`v${state?.world_state_version ?? 1}`}
                    tone={authorized ? 'success' : 'warn'}
                  />
                </div>
              </div>
            </div>

            {/* PS 26002: Regional Connectivity & Logistics Deck */}
            <PravahDashboardViews
              currentMode={pravahMode}
              onSelectMode={setPravahMode}
              lang={appLang}
              onToggleLang={() => setAppLang((l) => (l === 'en' ? 'hi' : 'en'))}
              worldVersion={state?.world_state_version ?? 1}
              onInjectDisruption={(entityId, status) => {
                injectEvent(entityId === 'bridge_b07' && status === 'FAILED' ? 'bridge_fails' : 'weather_clears')
                  .then((newState) => setState(newState))
                  .catch(() => {});
              }}
            />

            {/* Workflow Stepper Story */}
            <WorkflowStepper
              currentIndex={stageIndex}
              working={working}
              workingLabel={workingLabel}
              lang={appLang}
            />

            {/* Core Tactical Workspace: 2-Column Grid */}
            <div className="grid gap-3.5 lg:grid-cols-[1fr_420px]">
              <div className="flex flex-col gap-3.5">
                <div className="flex w-max items-center gap-1 rounded-lg p-1 bg-[var(--rd-panel)] border border-[var(--rd-border)]">
                  {([['operational', t.mapOperational, MapPin], ['network', t.mapNetwork, Network]] as const).map(([k, label, Icon]) => {
                    const active = mapMode === k;
                    return (
                      <button
                        key={k}
                        onClick={() => setMapMode(k)}
                        data-testid={`map-mode-${k}`}
                        className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-bold transition-all ${
                          active
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/60 shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Icon className={`h-3 w-3 ${active ? 'text-cyan-400' : 'text-slate-400'}`} /> {label}
                      </button>
                    );
                  })}
                </div>

                <div className="h-[480px] rd-anim-fade">
                  {mapMode === 'operational' ? (
                    <SpatialMapCanvas
                      state={state}
                      activePlanRouteId={packet?.route_id}
                      replayRouteId={replaying ? replayRouteId : null}
                      lang={appLang}
                      onSimulateScenario={(sc) => {
                        if (sc === 'submerge') injectDisruption('bridge_fails');
                        else if (sc === 'nominal') injectDisruption('weather_clears');
                        else runCycle();
                      }}
                    />
                  ) : (
                    <DependencyGraph state={state} lang={appLang} />
                  )}
                </div>

                <div className="rd-panel h-[360px] overflow-hidden bg-[var(--rd-surface)] border border-[var(--rd-border)] rounded-xl shadow-lg">
                  <AgentTrace steps={steps} working={working} lang={appLang} />
                </div>
              </div>

              {/* Decision Packet View Panel */}
              <div className="rd-panel h-[720px] overflow-hidden lg:h-[880px] bg-[var(--rd-surface)] border border-[var(--rd-border)] rounded-xl shadow-2xl">
                <DecisionPacketView
                  packet={packet}
                  onAuthorize={handleAuthorize}
                  onExportSlip={() => setDispatchSlipOpen(true)}
                  routes={state?.routes}
                  lang={appLang}
                />
              </div>
            </div>

            {/* Reality Timeline */}
            <RealityTimeline
              history={history}
              currentVersion={state?.world_state_version ?? 1}
              onNarrate={speak}
              onStopNarrate={stopSpeaking}
              onWarmUp={warmUp}
              onReplayChange={(active) => {
                setReplaying(active);
                if (active) setMapMode('operational');
              }}
              lang={appLang}
            />
          </div>
        )}

        {/* DECISION VIEW */}
        {section === 'decision' && (
          <div className="mx-auto max-w-[1200px] p-4 rd-anim-fade">
            <div className="rd-panel min-h-[750px] overflow-hidden bg-[var(--rd-surface)] border border-[var(--rd-border)] rounded-xl shadow-2xl">
              <DecisionPacketView
                packet={packet}
                onAuthorize={handleAuthorize}
                routes={state?.routes}
                lang={appLang}
              />
            </div>
          </div>
        )}

        {/* AGENT ACTIVITY VIEW */}
        {section === 'activity' && (
          <div className="mx-auto max-w-[1400px] p-4 rd-anim-fade">
            <div className="rd-panel min-h-[700px] overflow-hidden bg-[var(--rd-surface)] border border-[var(--rd-border)] rounded-xl shadow-2xl">
              <AgentTrace steps={steps} working={working} lang={appLang} />
            </div>
          </div>
        )}

        {/* SPATIAL MAP VIEW */}
        {section === 'map' && (
          <div className="mx-auto max-w-[1600px] p-4 rd-anim-fade">
            <div className="rd-panel h-[800px] overflow-hidden bg-[var(--rd-surface)] border border-[var(--rd-border)] rounded-xl shadow-2xl">
              <SpatialMapCanvas
                state={state}
                activePlanRouteId={packet?.route_id}
                replayRouteId={replaying ? replayRouteId : null}
                lang={appLang}
                onSimulateScenario={(sc) => {
                  if (sc === 'submerge') injectDisruption('bridge_fails');
                  else if (sc === 'nominal') injectDisruption('weather_clears');
                  else runCycle();
                }}
              />
            </div>
          </div>
        )}

        {/* ANALYSIS & PROVENANCE VIEW */}
        {section === 'analysis' && (
          <div className="mx-auto max-w-[1600px] space-y-3.5 p-4 rd-anim-fade">
            <div className="flex items-center gap-1.5 border-b border-[var(--rd-border)] pb-2.5">
              {[
                ['counterfactuals', t.tabCounterfactuals, GitFork],
                ['dependency', t.tabDependencyGraph, Network],
                ['provenance', t.tabW3CProv, FileJson],
              ].map(([key, label, Icon]: any) => (
                <button
                  key={key}
                  onClick={() => setAnalysisTab(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    analysisTab === key
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 shadow-sm'
                      : 'bg-[var(--rd-panel)] text-slate-400 border-[var(--rd-border)] hover:bg-[var(--rd-elevated)] hover:text-white'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${analysisTab === key ? 'text-cyan-400' : 'text-slate-400'}`} />
                  {label}
                </button>
              ))}
            </div>

            <div className="rd-panel min-h-[650px] p-4 bg-[var(--rd-surface)] border border-[var(--rd-border)] rounded-xl shadow-2xl">
              {analysisTab === 'counterfactuals' && <CounterfactualFutures packet={packet} lang={appLang} />}
              {analysisTab === 'dependency' && <DependencyGraph state={state} lang={appLang} />}
              {analysisTab === 'provenance' && <W3CProvView lang={appLang} />}
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <GuidedWalkthrough isOpen={walkthroughOpen} onClose={() => setWalkthroughOpen(false)} />
      <VerifyAutonomyPanel isOpen={verifyOpen} onClose={() => setVerifyOpen(false)} />
      <PSComplianceModal isOpen={complianceOpen} onClose={() => setComplianceOpen(false)} lang={appLang} />
      <DispatchSlipModal isOpen={dispatchSlipOpen} onClose={() => setDispatchSlipOpen(false)} state={state} lang={appLang} />
    </div>
  );
}

export default App;
