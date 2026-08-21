import { useState, useEffect } from 'react';
import {
  fetchState,
  injectEvent,
  authorizeDecision,
  streamAutonomousMission,
  toggleSimulatedFallback,
  fetchHealthStatus,
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
  const [state, setState] = useState<RealityState | null>(null);
  const [localSteps, setLocalSteps] = useState<AgentStep[]>([]);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walkthroughOpen, setWalkthroughOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [fallbackForced, setFallbackForced] = useState(false);

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
      setFallbackForced(!!health.simulated_fallback_forced);
      setState(await fetchState());
    } catch (err: any) {
      setError(err.message || 'Failed to reach the decision engine');
    }
  };
  useEffect(() => {
    loadAll();
  }, []);

  const runCycle = () => {
    setWorking(true);
    setError(null);
    setLocalSteps([]);
    streamAutonomousMission(
      (eventName, data) => {
        if (eventName === 'complete') fetchState().then(setState);
        else if (data && typeof data === 'object' && 'agent' in data) setLocalSteps((p) => [...p, data as AgentStep]);
      },
      () => {
        setWorking(false);
        fetchState().then(setState);
      },
      () => setWorking(false)
    );
  };

  const handleAuthorize = async (action: string) => {
    try {
      setState(await authorizeDecision(action, state?.world_state_version));
    } catch (err: any) {
      setError(err.message || 'Authorization failed');
    }
  };

  const injectDisruption = async (eventId: string) => {
    try {
      setState(await injectEvent(eventId));
      runCycle();
    } catch (err: any) {
      setError(err.message || 'Failed to inject event');
    }
  };

  const toggleFallback = async () => {
    try {
      const res = await toggleSimulatedFallback(!fallbackForced);
      setFallbackForced(res.simulated_fallback_forced);
      await loadAll();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle mode');
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
    <div className="flex h-screen w-screen flex-col overflow-hidden" style={{ background: 'var(--rd-bg)', color: 'var(--rd-text)' }}>
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

        <div className="flex items-center gap-2.5">
          <button onClick={() => setWalkthroughOpen(true)} data-testid="walkthrough-button" className="rd-btn rd-btn-ghost hidden sm:inline-flex">
            <SparklesIcon className="h-3.5 w-3.5" /> How it works
          </button>
          <button onClick={() => setVerifyOpen(true)} data-testid="verify-autonomy-button" className="rd-btn rd-btn-ghost hidden md:inline-flex">
            <ShieldCheck className="h-3.5 w-3.5" /> Verify autonomy
          </button>
          <button
            onClick={toggleFallback}
            data-testid="simulate-outage-button"
            title="Simulate a model outage to demonstrate deterministic fallback"
            className="rd-btn rd-btn-ghost"
            style={fallbackForced ? { color: 'var(--rd-warn)', borderColor: 'rgba(224,168,61,0.4)', background: 'var(--rd-warn-soft)' } : undefined}
          >
            <Zap className="h-3.5 w-3.5" /> {fallbackForced ? 'Outage: on' : 'Simulate outage'}
          </button>
          <div className="hidden items-center gap-2.5 rounded-lg px-3 py-1.5 lg:flex" style={{ background: 'var(--rd-panel)', border: '1px solid var(--rd-border)' }}>
            <span className="rd-dot" style={{ background: isFallback ? 'var(--rd-warn)' : 'var(--rd-success)' }} />
            <span className="t-tech" style={{ color: isFallback ? 'var(--rd-warn)' : 'var(--rd-success)' }}>{isFallback ? 'Fallback mode' : 'Live model'}</span>
          </div>
          <span className="t-tech hidden xl:inline" style={{ color: 'var(--rd-text-3)' }}>{ist} IST</span>
        </div>
      </header>

      {/* Nav */}
      <nav className="flex shrink-0 items-center gap-1 border-b border-[var(--rd-border)] px-5 py-2" style={{ background: 'var(--rd-surface)' }}>
        {NAV.map((n) => {
          const Icon = n.icon;
          const active = section === n.key;
          return (
            <button
              key={n.key}
              onClick={() => setSection(n.key)}
              data-testid={`nav-${n.key}`}
              className="flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors"
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
                  <button onClick={runCycle} disabled={working} data-testid="run-cycle-button" className="rd-btn rd-btn-primary">
                    {working ? <RefreshCw className="h-4 w-4 rd-spin-slow" /> : <Play className="h-4 w-4" />}
                    {working ? 'Running decision cycle…' : 'Run decision cycle'}
                  </button>
                  <button onClick={() => injectDisruption('bridge_fails')} disabled={working} data-testid="inject-bridge-button" className="rd-btn rd-btn-ghost" style={{ color: 'var(--rd-danger)', borderColor: 'rgba(229,100,94,0.4)' }}>
                    <AlertTriangle className="h-4 w-4" /> Simulate: Bridge B-07 fails
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
                <div className="h-[440px]"><SpatialMapCanvas state={state} activePlanRouteId={packet?.route_id} /></div>
                <div className="rd-panel h-[360px] overflow-hidden"><AgentTrace steps={steps} working={working} /></div>
              </div>
              <div className="rd-panel overflow-hidden lg:h-[816px]">
                <DecisionPacketView packet={packet} onAuthorize={handleAuthorize} routes={state?.routes} />
              </div>
            </div>

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
