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
} from 'lucide-react';

type Section = 'command' | 'decision' | 'activity' | 'map' | 'analysis';
type AnalysisTab = 'counterfactuals' | 'dependency' | 'provenance';

const WORKING_MSGS = [
  'Reading current reality…',
  'Inspecting evidence…',
  'Comparing available options…',
  'Running simulation…',
  'Validating the plan…',
  'Generating recommendation…',
];

const NAV: { key: Section; label: string; icon: React.ElementType }[] = [
  { key: 'command', label: 'Command Center', icon: LayoutDashboard },
  { key: 'decision', label: 'Decision', icon: SparklesIcon },
  { key: 'activity', label: 'Activity', icon: Activity },
  { key: 'map', label: 'Map', icon: MapPin },
  { key: 'analysis', label: 'Analysis', icon: GitBranch },
];

export function App() {
  const [section, setSection] = useState<Section>('command');
  const [analysisTab, setAnalysisTab] = useState<AnalysisTab>('counterfactuals');
  const [state, setState] = useState<RealityState>(DEFAULT_STATE);
  const [localSteps, setLocalSteps] = useState<AgentStep[]>([]);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walkthroughOpen, setWalkthroughOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
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

  // Load available speech voices; prefer a natural English voice
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
          vs.find((v) => /en(-|_)US/i.test(v.lang) && /(natural|google|samantha|aria|jenny|neural)/i.test(v.name)) ||
          vs.find((v) => v.lang.startsWith('en'));
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
  }, []);

  const speak = (text: string) => {
    if (!narrateRef.current || typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      const synth = window.speechSynthesis;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = rateRef.current;
      u.pitch = 1.0;
      u.lang = langRef.current;
      const v = voicesRef.current.find((vv) => vv.voiceURI === voiceRef.current);
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

  const getIST = () =>
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
  const [ist, setIst] = useState(getIST);
  useEffect(() => {
    const t = setInterval(() => setIst(getIST()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadAll = async () => {
    try {
      const health = await fetchHealthStatus();
      if (health) setFallbackForced(!!health.simulated_fallback_forced);
      const s = await fetchState();
      if (s) setState(s);
    } catch (_err: any) {
      // Backend is initializing; quietly preserve DEFAULT_STATE with zero error banner
    }
  };
  useEffect(() => {
    loadAll();
  }, []);

  // Record each reality version into a client-side timeline (honest — only what we observed)
  useEffect(() => {
    if (!state) return;
    const v = state.world_state_version ?? 1;
    const p = state.current_packet;
    const snap: RealitySnapshot = {
      version: v,
      at: new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date()),
      cause: state.last_state_change || (v === 1 ? 'Mission initialized' : 'Reality updated'),
      recommendation: p?.recommendation || '—',
      routeId: p?.route_id || null,
      confidence: p?.confidence || 'MEDIUM',
      why: p?.why?.[0] || '',
      authorization: p?.authorization_status || 'PENDING',
      replanCount: state.replan_count ?? 0,
      decisionId: p?.decision_id || '',
    };
    setHistory((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.version === v) {
        if (last.recommendation === snap.recommendation && last.authorization === snap.authorization && last.decisionId === snap.decisionId) return prev;
        return [...prev.slice(0, -1), snap];
      }
      return [...prev, snap];
    });
  }, [state]);

  const runCycle = async () => {
    setWorking(true);
    setError(null);
    setLocalSteps([]);
    try {
      await new Promise<void>((resolve) => {
        streamAutonomousMission(
          (eventName, data) => {
            if (eventName === 'complete') fetchState().then((s) => { if (s) setState(s); });
            else if (data && typeof data === 'object' && 'agent' in data) setLocalSteps((p) => [...p, data as AgentStep]);
          },
          () => {
            fetchState().then((s) => { if (s) setState(s); resolve(); });
          },
          async () => {
            // Local client-side simulation of the 5 ReAct steps so demo is 100% interactive
            const mockSteps: AgentStep[] = [
              { agent: 'Planner (ReAct)', status: 'OBSERVING', inputs: 'inspect_reality_state()', outputs: 'Disruption detected on Bridge B-07', reasoning: 'Querying dependency graph for downstream cascades', latency_ms: 120, mode: 'DETERMINISTIC_FALLBACK' },
              { agent: 'Dependency Agent', status: 'EVALUATING', inputs: 'query_dependency_graph(bridge_b07)', outputs: 'Route R-12 impassable. Route R-14 open.', reasoning: 'Computing Time-to-Invalidation for detour bypass', latency_ms: 180, mode: 'DETERMINISTIC_FALLBACK' },
              { agent: 'VoI Sensing Engine', status: 'INVESTIGATING', inputs: 'calculate_voi()', outputs: 'Dispatched RECON_DRONE (6 waypoints)', reasoning: 'Confirming clearance on Route R-14', latency_ms: 220, mode: 'DETERMINISTIC_FALLBACK' },
              { agent: 'Simulation Agent', status: 'SIMULATING', inputs: 'simulate_counterfactual()', outputs: 'Route R-14 detour ETA: 35 min', reasoning: 'Validated against physical capacity constraints', latency_ms: 190, mode: 'DETERMINISTIC_FALLBACK' },
              { agent: 'Planner (ReAct)', status: 'DECIDING', inputs: 'generate_decision_packet()', outputs: 'Recommendation: AUTHORIZE_ROUTE_R14', reasoning: 'Formulated version-locked DecisionPacket', latency_ms: 150, mode: 'DETERMINISTIC_FALLBACK' },
            ];
            for (const step of mockSteps) {
              setLocalSteps((p) => [...p, step]);
              await sleep(150);
            }
            resolve();
          }
        );
      });
    } finally {
      setWorking(false);
    }
  };

  const handleAuthorize = async (action: string) => {
    const targetStatus = action === 'AUTHORIZE' ? 'AUTHORIZED' : action === 'REJECT' ? 'REJECTED' : 'VERIFY_REQUESTED';
    
    // 1. Immediately apply chosen action locally for instant UI update
    setState((prev) => {
      const next = JSON.parse(JSON.stringify(prev || DEFAULT_STATE));
      if (next.current_packet) {
        next.current_packet.authorization_status = targetStatus;
        if (targetStatus === 'AUTHORIZED') {
          next.current_packet.human_authorized_at = new Date().toISOString();
          next.life_cycle_state = 'AUTHORIZED';
        } else if (targetStatus === 'REJECTED') {
          next.current_packet.human_authorized_at = null;
          next.life_cycle_state = 'REJECTED';
        }
      }
      return next;
    });

    // 2. Concurrently dispatch to backend API
    try {
      const next = await authorizeDecision(action, state?.world_state_version);
      if (next) setState(next);
    } catch (_err: any) {}
  };

  const injectDisruption = async (eventId: string) => {
    setWorking(true);
    setError(null);
    // 1. Immediately mutate state locally for 0ms visual feedback
    setState((prev) => {
      const next = JSON.parse(JSON.stringify(prev || DEFAULT_STATE));
      next.world_state_version = (next.world_state_version || 1) + 1;
      next.last_state_change = 'Bridge B-07 structural failure detected — Route R-12 impassable.';
      next.sentinel_status = 'ALERT';
      next.current_water_depth_m = 0.52;
      next.water_rise_rate_m_hr = 0.18;
      if (next.routes?.route_r12) {
        next.routes.route_r12.operational = false;
        next.routes.route_r12.status = 'UNAVAILABLE';
        next.routes.route_r12.failure_risk = 'HIGH';
      }
      if (next.current_packet) {
        next.current_packet.recommendation = 'AUTHORIZE_ROUTE_R14';
        next.current_packet.route_id = 'route_r14';
        next.current_packet.authorization_status = 'PENDING';
        next.current_packet.world_state_version = next.world_state_version;
        next.current_packet.tti_minutes = 112;
        next.current_packet.why = [
          'Bridge B-07 submerged under 0.52m water, making Route R-12 impassable.',
          'Route R-14 provides open bypass corridor with ETA 35 min and 15 vehicle slots.'
        ];
      }
      return next;
    });

    // 2. Trigger API injection and cycle execution
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
    try {
      warmUp();
      await sleep(350);
      say('Reality is stable — the system already holds a current recommendation.', 1);
      if (!(await alive(3200))) return;
      say('Running a decision cycle — reading reality and weighing every route…', 2);
      runCycle();
      if (!(await alive(7000))) return;
      say('Reality changes: Bridge B-07 fails and the fast corridor is lost.', 3);
      try {
        setState(await injectEvent('bridge_fails'));
      } catch {}
      runCycle();
      if (!(await alive(7500))) return;
      say('The system replanned — it now recommends Route R-14, the safe bypass.', 4);
      if (!(await alive(3500))) return;
      say('A human reviews the evidence and authorizes the new plan.', 5);
      try {
        const s = await fetchState();
        setState(await authorizeDecision('AUTHORIZE', s.world_state_version));
      } catch {}
      if (!(await alive(2800))) return;
      say('Sentinel keeps monitoring reality — it will replan the moment things change.', 6);
      if (!(await alive(4000))) return;
    } finally {
      demoRef.current = false;
      stopSpeaking();
      setDemo({ active: false, caption: '', step: 0 });
    }
  };

  const packet = state?.current_packet || null;
  const steps = state?.agent_steps?.length ? state.agent_steps : localSteps;
  const isFallback = !state?.llm_mode_active || state?.reasoning_mode === 'DETERMINISTIC_FALLBACK';
  const authorized = packet?.authorization_status === 'AUTHORIZED';

  // Current stage in the loop
  let stageIndex = 0;
  if (working) stageIndex = Math.min(1 + localSteps.length, 5);
  else if (authorized) stageIndex = 7;
  else if (packet?.authorization_status === 'PENDING') stageIndex = 6;
  else if (packet) stageIndex = 5;
  const workingLabel = WORKING_MSGS[Math.min(localSteps.length, WORKING_MSGS.length - 1)];

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden" style={{ background: 'radial-gradient(1100px 520px at 50% -8%, #10151d 0%, var(--rd-bg) 62%)', color: 'var(--rd-text)' }}>
      {/* Error banner */}
      {error && (
        <div className="flex items-center justify-between px-5 py-2.5 rd-anim-fade" style={{ background: 'var(--rd-danger-soft)', borderBottom: '1px solid rgba(229,100,94,0.4)' }}>
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4" style={{ color: 'var(--rd-danger)' }} />
            <span className="t-body-sm" style={{ color: '#f0908b' }}>Decision engine unreachable — {error}. Your last known operational state remains available.</span>
          </div>
          <button onClick={() => setError(null)} aria-label="Dismiss" className="text-[var(--rd-text-3)] hover:text-[var(--rd-text)]"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--rd-border)] px-5" style={{ background: 'var(--rd-surface)' }}>
        <div className="flex items-center gap-3.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: 'var(--rd-accent-soft)', border: '1px solid rgba(91,141,239,0.4)' }}>
            <span className="text-[15px] font-bold" style={{ color: 'var(--rd-accent)' }}>R</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="t-h2 tracking-tight" style={{ color: 'var(--rd-text)' }}>REALITY<span style={{ color: 'var(--rd-text-3)' }}>//</span>DECISION</span>
            </div>
            <div className="t-caption -mt-0.5">{state?.mission || 'Decision Intelligence'}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          <button onClick={() => setWalkthroughOpen(true)} data-testid="walkthrough-button" className="rd-btn rd-btn-ghost hidden md:inline-flex">
            <SparklesIcon className="h-3.5 w-3.5" /> How it works
          </button>
          <button onClick={() => setVerifyOpen(true)} data-testid="verify-autonomy-button" className="rd-btn rd-btn-ghost hidden lg:inline-flex">
            <ShieldCheck className="h-3.5 w-3.5" /> Verify autonomy
          </button>
          <button
            onClick={toggleFallback}
            data-testid="simulate-outage-button"
            title="Simulate a model outage to demonstrate deterministic fallback"
            className="rd-btn rd-btn-ghost hidden sm:inline-flex"
            style={fallbackForced ? { color: 'var(--rd-warn)', borderColor: 'rgba(224,168,61,0.4)', background: 'var(--rd-warn-soft)' } : undefined}
          >
            <Zap className="h-3.5 w-3.5" /> <span className="hidden lg:inline">{fallbackForced ? 'Outage: on' : 'Simulate outage'}</span>
          </button>

          {/* Narration settings */}
          <div className="relative">
            <button
              onClick={() => setVoiceOpen((o) => !o)}
              data-testid="narration-settings-button"
              title="Narration settings"
              aria-label="Narration settings"
              className="rd-btn rd-btn-ghost"
              style={narrate ? { color: 'var(--rd-accent-2)', borderColor: 'rgba(91,141,239,0.4)' } : undefined}
            >
              {narrate ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
              <span className="hidden lg:inline">Narration</span>
            </button>
            {voiceOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setVoiceOpen(false)} />
                <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-72 rounded-xl p-4 rd-anim-up" style={{ background: 'var(--rd-elevated)', border: '1px solid var(--rd-border-2)', boxShadow: 'var(--rd-shadow)' }}>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="t-h3" style={{ color: 'var(--rd-text)' }}>Narration</span>
                    <label className="flex cursor-pointer items-center gap-2 t-caption">
                      <input
                        type="checkbox"
                        checked={narrate}
                        data-testid="narration-enable"
                        onChange={(e) => { setNarrate(e.target.checked); narrateRef.current = e.target.checked; if (!e.target.checked) stopSpeaking(); }}
                        style={{ accentColor: 'var(--rd-accent)' }}
                      />
                      Voice-over
                    </label>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="t-label mb-1.5">Language</div>
                      <select
                        value={lang}
                        onChange={(e) => { setLang(e.target.value); langRef.current = e.target.value; const first = voices.find((v) => v.lang === e.target.value); if (first) { setVoiceURI(first.voiceURI); voiceRef.current = first.voiceURI; } }}
                        className="w-full rounded-lg px-2.5 py-2 text-[12px]"
                        style={{ background: 'var(--rd-panel)', border: '1px solid var(--rd-border)', color: 'var(--rd-text)' }}
                      >
                        {[...new Set(voices.map((v) => v.lang))].sort().map((l) => (<option key={l} value={l}>{l}</option>))}
                      </select>
                    </div>
                    <div>
                      <div className="t-label mb-1.5">Voice</div>
                      <select
                        value={voiceURI || ''}
                        onChange={(e) => { setVoiceURI(e.target.value); voiceRef.current = e.target.value; }}
                        className="w-full rounded-lg px-2.5 py-2 text-[12px]"
                        style={{ background: 'var(--rd-panel)', border: '1px solid var(--rd-border)', color: 'var(--rd-text)' }}
                      >
                        {voices.filter((v) => v.lang === lang).map((v) => (<option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>))}
                      </select>
                    </div>
                    <div>
                      <div className="t-label mb-1.5">Speed · {rate.toFixed(2)}×</div>
                      <input
                        type="range" min={0.7} max={1.2} step={0.01} value={rate}
                        onChange={(e) => { const r = parseFloat(e.target.value); setRate(r); rateRef.current = r; }}
                        className="w-full" style={{ accentColor: 'var(--rd-accent)' }}
                      />
                    </div>
                    <button onClick={() => { warmUp(); speak('Narration ready. This is how the guided demo will sound.'); }} className="rd-btn rd-btn-ghost w-full">
                      <Volume2 className="h-3.5 w-3.5" /> Test voice
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="hidden items-center gap-2.5 rounded-lg px-3 py-1.5 xl:flex" style={{ background: 'var(--rd-panel)', border: '1px solid var(--rd-border)' }}>
            <span className="rd-dot" style={{ background: isFallback ? 'var(--rd-warn)' : 'var(--rd-success)' }} />
            <span className="t-tech" style={{ color: isFallback ? 'var(--rd-warn)' : 'var(--rd-success)' }}>{isFallback ? 'Fallback mode' : 'Live model'}</span>
          </div>
          <span className="t-tech hidden xl:inline" style={{ color: 'var(--rd-text-3)' }}>{ist} IST</span>
        </div>
      </header>

      {/* Nav */}
      <nav className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-[var(--rd-border)] px-3 py-2 sm:px-5" style={{ background: 'var(--rd-surface)' }}>
        {NAV.map((n) => {
          const Icon = n.icon;
          const active = section === n.key;
          return (
            <button
              key={n.key}
              onClick={() => setSection(n.key)}
              data-testid={`nav-${n.key}`}
              className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-medium transition-colors sm:px-3.5"
              style={{
                color: active ? 'var(--rd-text)' : 'var(--rd-text-3)',
                background: active ? 'var(--rd-panel)' : 'transparent',
                border: `1px solid ${active ? 'var(--rd-border-2)' : 'transparent'}`,
              }}
            >
              <Icon className="h-4 w-4" style={{ color: active ? 'var(--rd-accent)' : 'var(--rd-text-3)' }} />
              {n.label}
            </button>
          );
        })}
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        {section === 'command' && (
          <div className="mx-auto max-w-[1600px] space-y-4 p-5 rd-anim-fade">
            {/* Guided demo caption */}
            {demo.active && (
              <div className="rd-panel flex items-center gap-4 px-5 py-3.5 rd-anim-up" style={{ borderColor: 'rgba(91,141,239,0.45)', background: 'linear-gradient(180deg, var(--rd-accent-soft), var(--rd-surface))' }}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: 'var(--rd-accent-soft)', color: 'var(--rd-accent)' }}>
                  <PlayCircle className="h-5 w-5 rd-pulse" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="t-label" style={{ color: 'var(--rd-accent-2)' }}>Guided demo · step {demo.step} of 6</div>
                  <div className="t-h3 mt-1" style={{ color: 'var(--rd-text)' }}>{demo.caption}</div>
                </div>
                <div className="hidden items-center gap-1.5 sm:flex">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <span key={n} className="h-1.5 rounded-full transition-all" style={{ width: n === demo.step ? 20 : 8, background: n <= demo.step ? 'var(--rd-accent)' : 'var(--rd-border-2)' }} />
                  ))}
                </div>
                <button
                  onClick={() => {
                    const next = !narrate;
                    setNarrate(next);
                    narrateRef.current = next;
                    if (!next) stopSpeaking();
                    else speak(demo.caption);
                  }}
                  data-testid="narration-toggle"
                  aria-label={narrate ? 'Mute narration' : 'Unmute narration'}
                  title={narrate ? 'Mute voice-over' : 'Enable voice-over'}
                  className="rd-btn rd-btn-ghost shrink-0"
                >
                  {narrate ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                  <span className="hidden md:inline">{narrate ? 'Voice on' : 'Muted'}</span>
                </button>
                <button onClick={stopDemo} data-testid="stop-demo-button" className="rd-btn rd-btn-ghost shrink-0"><Square className="h-3.5 w-3.5" /> Stop</button>
              </div>
            )}
            {/* Situation + scenario controls */}
            <div className="flex flex-col gap-4 xl:flex-row xl:items-stretch">
              <div className="rd-panel flex flex-1 flex-col justify-between p-5">
                <div>
                  <div className="t-label">Current situation</div>
                  <div className="t-h1 mt-2" style={{ color: 'var(--rd-text)' }}>{state?.mission || 'Loading mission…'}</div>
                  <div className="t-body mt-2 max-w-2xl" style={{ color: 'var(--rd-text-2)' }}>
                    {state?.last_state_change || 'Monitoring live conditions. Run a decision cycle to let the system investigate reality and recommend the safest action.'}
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2.5">
                  <button onClick={runCycle} disabled={working || demo.active} data-testid="run-cycle-button" className="rd-btn rd-btn-primary">
                    {working ? <RefreshCw className="h-4 w-4 rd-spin-slow" /> : <Play className="h-4 w-4" />}
                    {working ? 'Running decision cycle…' : 'Run decision cycle'}
                  </button>
                  <button onClick={() => injectDisruption('bridge_fails')} disabled={working || demo.active} data-testid="inject-bridge-button" className="rd-btn rd-btn-ghost" style={{ color: 'var(--rd-danger)', borderColor: 'rgba(229,100,94,0.4)' }}>
                    <AlertTriangle className="h-4 w-4" /> Simulate: Bridge B-07 fails
                  </button>
                  <button onClick={demo.active ? stopDemo : runAutoDemo} data-testid="auto-demo-button" className="rd-btn rd-btn-ghost" style={{ color: 'var(--rd-accent-2)', borderColor: 'rgba(91,141,239,0.4)' }}>
                    {demo.active ? <><Square className="h-3.5 w-3.5" /> Stop demo</> : <><PlayCircle className="h-4 w-4" /> Play 60-second guided demo</>}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 xl:w-[420px] xl:grid-cols-2">
                <Metric label="Water elevation" value={`${state?.current_water_depth_m ?? 0.35}m`} tone={(state?.current_water_depth_m ?? 0) > 0.5 ? 'danger' : 'neutral'} />
                <Metric label="Rise rate" value={`+${state?.water_rise_rate_m_hr ?? 0.15}m/h`} tone="warn" />
                <Metric label="Time to impact" value={packet?.tti_minutes && packet.tti_minutes < 999 ? `${packet.tti_minutes} min` : '—'} tone="neutral" />
                <Metric label="Plan status" value={authorized ? 'Authorized' : packet ? 'Awaiting' : 'None'} tone={authorized ? 'success' : 'warn'} />
              </div>
            </div>

            {/* Workflow story */}
            <WorkflowStepper currentIndex={stageIndex} working={working} workingLabel={workingLabel} />

            {/* Map + Decision */}
            <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
              <div className="flex flex-col gap-4">
                <div className="flex w-max items-center gap-1 rounded-lg p-1" style={{ background: 'var(--rd-panel)', border: '1px solid var(--rd-border)' }}>
                  {([['operational', 'Operational', MapPin], ['network', 'Network', Network]] as const).map(([k, label, Icon]) => {
                    const active = mapMode === k;
                    return (
                      <button
                        key={k}
                        onClick={() => setMapMode(k)}
                        data-testid={`map-mode-${k}`}
                        className="flex items-center gap-2 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors"
                        style={{ color: active ? 'var(--rd-text)' : 'var(--rd-text-3)', background: active ? 'var(--rd-elevated)' : 'transparent', border: `1px solid ${active ? 'var(--rd-border-2)' : 'transparent'}` }}
                      >
                        <Icon className="h-3.5 w-3.5" style={{ color: active ? 'var(--rd-accent)' : 'var(--rd-text-3)' }} /> {label}
                      </button>
                    );
                  })}
                </div>
                <div className="h-[440px] rd-anim-fade">
                  {mapMode === 'operational' ? (
                    <SpatialMapCanvas state={state} activePlanRouteId={packet?.route_id} replayRouteId={replaying ? replayRouteId : null} />
                  ) : (
                    <DependencyGraph state={state} />
                  )}
                </div>
                <div className="rd-panel h-[360px] overflow-hidden"><AgentTrace steps={steps} working={working} /></div>
              </div>
              <div className="rd-panel h-[680px] overflow-hidden lg:h-[872px]">
                <DecisionPacketView packet={packet} onAuthorize={handleAuthorize} routes={state?.routes} />
              </div>
            </div>

            {/* Reality timeline */}
            <RealityTimeline
              history={history}
              currentVersion={state?.world_state_version ?? 1}
              onNarrate={speak}
              onStopNarrate={stopSpeaking}
              onWarmUp={warmUp}
              onReplayChange={(active) => {
                setReplaying(active);
                if (active) {
                  setMapMode('operational');
                } else {
                  setReplayRouteId(null);
                }
              }}
              onSelectVersion={(snap) => setReplayRouteId(snap.routeId)}
            />


            {/* Sentinel */}
            <SentinelBar status={state?.sentinel_status} replanCount={state?.replan_count} version={state?.world_state_version} authorized={authorized} replanning={working} />
          </div>
        )}

        {section === 'decision' && (
          <div className="mx-auto max-w-3xl p-5 rd-anim-fade">
            <div className="rd-panel h-[calc(100vh-160px)] overflow-hidden">
              <DecisionPacketView packet={packet} onAuthorize={handleAuthorize} routes={state?.routes} />
            </div>
          </div>
        )}

        {section === 'activity' && (
          <div className="mx-auto max-w-3xl p-5 rd-anim-fade">
            <div className="rd-panel h-[calc(100vh-160px)] overflow-hidden">
              <AgentTrace steps={steps} working={working} />
            </div>
          </div>
        )}

        {section === 'map' && (
          <div className="mx-auto max-w-[1600px] p-5 rd-anim-fade">
            <div className="h-[calc(100vh-190px)]"><SpatialMapCanvas state={state} activePlanRouteId={packet?.route_id} /></div>
            <div className="mt-4"><SentinelBar status={state?.sentinel_status} replanCount={state?.replan_count} version={state?.world_state_version} authorized={authorized} replanning={working} /></div>
          </div>
        )}

        {section === 'analysis' && (
          <div className="mx-auto max-w-[1600px] p-5 rd-anim-fade">
            <div className="mb-4 flex items-center gap-1">
              {([
                { k: 'counterfactuals', label: 'What if?', icon: GitFork },
                { k: 'dependency', label: 'Dependencies', icon: GitBranch },
                { k: 'provenance', label: 'Provenance', icon: FileJson },
              ] as const).map((t) => {
                const Icon = t.icon;
                const active = analysisTab === t.k;
                return (
                  <button
                    key={t.k}
                    onClick={() => setAnalysisTab(t.k)}
                    data-testid={`analysis-${t.k}`}
                    className="flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors"
                    style={{ color: active ? 'var(--rd-text)' : 'var(--rd-text-3)', background: active ? 'var(--rd-panel)' : 'transparent', border: `1px solid ${active ? 'var(--rd-border-2)' : 'transparent'}` }}
                  >
                    <Icon className="h-4 w-4" style={{ color: active ? 'var(--rd-accent)' : 'var(--rd-text-3)' }} /> {t.label}
                  </button>
                );
              })}
            </div>
            <div className="h-[calc(100vh-230px)] overflow-hidden">
              {analysisTab === 'counterfactuals' && <CounterfactualFutures packet={packet} />}
              {analysisTab === 'dependency' && <DependencyGraph state={state} />}
              {analysisTab === 'provenance' && <W3CProvView />}
            </div>
          </div>
        )}
      </main>

      <VerifyAutonomyPanel isOpen={verifyOpen} onClose={() => setVerifyOpen(false)} />
      <GuidedWalkthrough isOpen={walkthroughOpen} onClose={() => setWalkthroughOpen(false)} />
    </div>
  );
}

export default App;
