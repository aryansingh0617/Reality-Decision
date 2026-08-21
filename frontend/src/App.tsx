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

import {
  Compass,
  Play,
  AlertTriangle,
  GitBranch,
  ShieldCheck,
  Zap,
  Sparkles,
  MapPin,
  FileText,
  Activity,
  Layers,
  FileJson,
} from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<
    'mission_control' | 'spatial_map' | 'decision_intelligence' | 'agent_telemetry' | 'counterfactuals' | 'dependency_graph' | 'w3c_prov'
  >('mission_control');

  const [state, setState] = useState<RealityState | null>(null);
  const [localSteps, setLocalSteps] = useState<AgentStep[]>([]);
  const [isReplanning, setIsReplanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWalkthroughOpen, setIsWalkthroughOpen] = useState(false);
  const [isVerifyAutonomyOpen, setIsVerifyAutonomyOpen] = useState(false);
  const [isSimulatedFallbackForced, setIsSimulatedFallbackForced] = useState(false);

  const getISTTime = () => {
    return (
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(new Date()) + ' IST'
    );
  };

  const [istTime, setIstTime] = useState(getISTTime);

  useEffect(() => {
    const interval = setInterval(() => setIstTime(getISTTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  const loadHealthAndState = async () => {
    try {
      const health = await fetchHealthStatus();
      setIsSimulatedFallbackForced(!!health.simulated_fallback_forced);
      const data = await fetchState();
      setState(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch state');
    }
  };

  useEffect(() => {
    loadHealthAndState();
  }, []);

  const handleToggleFallback = async () => {
    try {
      const res = await toggleSimulatedFallback(!isSimulatedFallbackForced);
      setIsSimulatedFallbackForced(res.simulated_fallback_forced);
      await loadHealthAndState();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle simulated fallback');
    }
  };

  const handleStartMission = () => {
    setIsReplanning(true);
    setError(null);
    setLocalSteps([]);

    streamAutonomousMission(
      (eventName, data) => {
        if (eventName === 'complete') {
          fetchState().then(setState);
        } else if (typeof data === 'object' && data !== null && 'agent' in data) {
          setLocalSteps((prev) => [...prev, data as AgentStep]);
        }
      },
      () => {
        setIsReplanning(false);
        fetchState().then(setState);
      },
      (_err) => {
        setIsReplanning(false);
      }
    );
  };

  const handleAuthorize = async (action: string) => {
    try {
      const targetVersion = state?.world_state_version;
      const updatedState = await authorizeDecision(action, targetVersion);
      setState(updatedState);
    } catch (err: any) {
      setError(err.message || 'Failed to authorize');
    }
  };

  const handleInjectEvent = async (eventId: string) => {
    try {
      const updatedState = await injectEvent(eventId);
      setState(updatedState);
      handleStartMission();
    } catch (err: any) {
      setError(err.message || 'Failed to inject event');
    }
  };

  const isDeterministicFallback = !state?.llm_mode_active || state?.reasoning_mode === 'DETERMINISTIC_FALLBACK';

  return (
    <div className="flex flex-col h-screen w-screen bg-[#07090b] text-[#e8edf2] font-sans overflow-hidden select-none">
      {error && (
        <div className="bg-[#ef4444] text-[#07090b] px-4 py-1.5 font-mono text-xs font-extrabold flex items-center justify-between z-50">
          <span>SYSTEM ERROR: {error}</span>
          <button onClick={() => setError(null)} className="cursor-pointer underline">DISMISS</button>
        </div>
      )}
      {/* 1. TOP EXECUTIVE HEADER */}
      <header className="h-14 bg-[#0d1117] border-b border-[#222b34] px-5 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#00f2fe]/10 border border-[#00f2fe]/40 flex items-center justify-center text-[#00f2fe]">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-extrabold tracking-wider text-[#e8edf2] flex items-center gap-2 font-mono">
              <span>REALITY//DECISION 2.0</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#00f2fe]/20 text-[#00f2fe] border border-[#00f2fe]/40">
                v{state?.world_state_version || 1}
              </span>
            </div>
            <div className="text-[10px] text-[#8a9aaa] font-mono">AUTONOMOUS DECISION-INTELLIGENCE PLATFORM</div>
          </div>
        </div>

        {/* Top Header Controls */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <button
            onClick={() => setIsVerifyAutonomyOpen(true)}
            className="px-3 py-1.5 bg-[#2ecc71] text-[#07090b] font-extrabold rounded flex items-center gap-1.5 hover:bg-[#26b863] transition-all cursor-pointer shadow-md text-xs"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>VERIFY AUTONOMY</span>
          </button>

          <button
            onClick={() => setIsWalkthroughOpen(true)}
            className="px-3 py-1.5 bg-[#38bdf8] text-[#07090b] font-extrabold rounded flex items-center gap-1.5 hover:bg-[#7dd3fc] transition-all cursor-pointer shadow-md text-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>WALKTHROUGH</span>
          </button>

          <button
            onClick={handleToggleFallback}
            className={`px-3 py-1.5 rounded text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              isSimulatedFallbackForced
                ? 'bg-[#ef4444]/20 border-[#ef4444] text-[#ef4444]'
                : 'bg-[#14191e] border-[#222b34] text-[#8a9aaa] hover:text-[#e8edf2]'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{isSimulatedFallbackForced ? 'SIMULATED FAIL: ON' : 'SIMULATE API FAIL'}</span>
          </button>

          <div className="bg-[#07090b] border border-[#222b34] px-2.5 py-1 rounded text-[#00f2fe] text-[11px] font-bold">
            {istTime}
          </div>

          <div
            className={`flex items-center gap-2 border px-3 py-1 rounded font-mono text-xs ${
              isDeterministicFallback
                ? 'border-[#f59e0b]/60 bg-[#f59e0b]/15 text-[#fbbf24]'
                : 'border-[#2ecc71]/60 bg-[#2ecc71]/15 text-[#2ecc71]'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isDeterministicFallback ? 'bg-[#f59e0b] animate-pulse' : 'bg-[#2ecc71]'}`} />
            <span className="font-extrabold uppercase">{isDeterministicFallback ? 'DETERMINISTIC FALLBACK' : 'LIVE MODEL'}</span>
          </div>
        </div>
      </header>

      {/* 2. MAIN 3-COLUMN APP SHELL */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT NAVIGATION RAIL (Inspired by Reference Image) */}
        <aside className="w-64 bg-[#0d1117] border-r border-[#222b34] flex flex-col justify-between shrink-0 font-mono text-xs z-20">
          <div className="p-3 space-y-1">
            <div className="text-[10px] font-bold text-[#8a9aaa] px-3 py-2 uppercase tracking-wider">COMMAND NAVIGATION</div>

            <button
              onClick={() => setActiveTab('mission_control')}
              className={`w-full px-3 py-2.5 rounded flex items-center gap-2.5 transition-all cursor-pointer font-bold ${
                activeTab === 'mission_control' ? 'bg-[#00f2fe]/15 text-[#00f2fe] border border-[#00f2fe]/40' : 'text-[#8a9aaa] hover:text-[#e8edf2] hover:bg-[#14191e]'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Mission Control</span>
            </button>

            <button
              onClick={() => setActiveTab('spatial_map')}
              className={`w-full px-3 py-2.5 rounded flex items-center gap-2.5 transition-all cursor-pointer font-bold ${
                activeTab === 'spatial_map' ? 'bg-[#00f2fe]/15 text-[#00f2fe] border border-[#00f2fe]/40' : 'text-[#8a9aaa] hover:text-[#e8edf2] hover:bg-[#14191e]'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>Spatial Map</span>
            </button>

            <button
              onClick={() => setActiveTab('decision_intelligence')}
              className={`w-full px-3 py-2.5 rounded flex items-center gap-2.5 transition-all cursor-pointer font-bold ${
                activeTab === 'decision_intelligence' ? 'bg-[#00f2fe]/15 text-[#00f2fe] border border-[#00f2fe]/40' : 'text-[#8a9aaa] hover:text-[#e8edf2] hover:bg-[#14191e]'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Decision Intelligence</span>
            </button>

            <button
              onClick={() => setActiveTab('agent_telemetry')}
              className={`w-full px-3 py-2.5 rounded flex items-center gap-2.5 transition-all cursor-pointer font-bold ${
                activeTab === 'agent_telemetry' ? 'bg-[#00f2fe]/15 text-[#00f2fe] border border-[#00f2fe]/40' : 'text-[#8a9aaa] hover:text-[#e8edf2] hover:bg-[#14191e]'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Agent Telemetry</span>
            </button>

            <button
              onClick={() => setActiveTab('counterfactuals')}
              className={`w-full px-3 py-2.5 rounded flex items-center gap-2.5 transition-all cursor-pointer font-bold ${
                activeTab === 'counterfactuals' ? 'bg-[#00f2fe]/15 text-[#00f2fe] border border-[#00f2fe]/40' : 'text-[#8a9aaa] hover:text-[#e8edf2] hover:bg-[#14191e]'
              }`}
            >
              <GitBranch className="w-4 h-4" />
              <span>Counterfactuals</span>
            </button>

            <button
              onClick={() => setActiveTab('dependency_graph')}
              className={`w-full px-3 py-2.5 rounded flex items-center gap-2.5 transition-all cursor-pointer font-bold ${
                activeTab === 'dependency_graph' ? 'bg-[#00f2fe]/15 text-[#00f2fe] border border-[#00f2fe]/40' : 'text-[#8a9aaa] hover:text-[#e8edf2] hover:bg-[#14191e]'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Dependency Graph</span>
            </button>

            <button
              onClick={() => setActiveTab('w3c_prov')}
              className={`w-full px-3 py-2.5 rounded flex items-center gap-2.5 transition-all cursor-pointer font-bold ${
                activeTab === 'w3c_prov' ? 'bg-[#00f2fe]/15 text-[#00f2fe] border border-[#00f2fe]/40' : 'text-[#8a9aaa] hover:text-[#e8edf2] hover:bg-[#14191e]'
              }`}
            >
              <FileJson className="w-4 h-4" />
              <span>W3C Provenance</span>
            </button>
          </div>

          {/* Quick Trigger Buttons */}
          <div className="p-3 border-t border-[#222b34] space-y-2">
            <div className="text-[10px] font-bold text-[#8a9aaa] uppercase tracking-wider">SCENARIO CONTROLS</div>

            <button
              onClick={handleStartMission}
              disabled={isReplanning}
              className="w-full py-2 bg-[#00f2fe] hover:bg-[#38bdf8] text-[#07090b] font-extrabold rounded flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isReplanning ? 'REPLANNING...' : 'START MISSION'}</span>
            </button>

            <button
              onClick={() => handleInjectEvent('bridge_fails')}
              className="w-full py-2 bg-[#ef4444]/20 border border-[#ef4444] text-[#f87171] hover:bg-[#ef4444]/30 font-bold rounded flex items-center justify-center gap-1.5 transition-all cursor-pointer text-[11px]"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>INJECT B-07 COLLAPSE</span>
            </button>
          </div>
        </aside>

        {/* CENTER WORKSPACE CANVAS */}
        <main className="flex-1 bg-[#07090b] p-4 flex flex-col overflow-hidden relative">
          {/* Top Quick Operational Bar */}
          <div className="grid grid-cols-5 gap-3 mb-3 shrink-0 font-mono text-xs">
            <div className="p-3 bg-[#0d1117] border border-[#222b34] rounded-lg">
              <div className="text-[10px] text-[#8a9aaa]">WATER ELEVATION</div>
              <div className="text-base font-bold text-[#00f2fe] mt-0.5">{state?.current_water_depth_m ?? 0.35}m</div>
            </div>
            <div className="p-3 bg-[#0d1117] border border-[#222b34] rounded-lg">
              <div className="text-[10px] text-[#8a9aaa]">WATER RISE RATE</div>
              <div className="text-base font-bold text-[#f59e0b] mt-0.5">+{state?.water_rise_rate_m_hr ?? 0.15}m/h</div>
            </div>
            <div className="p-3 bg-[#0d1117] border border-[#222b34] rounded-lg">
              <div className="text-[10px] text-[#8a9aaa]">PREDICTED TTI</div>
              <div className="text-base font-bold text-[#2ecc71] mt-0.5">{state?.current_packet?.tti_minutes ?? 112}m</div>
            </div>
            <div className="p-3 bg-[#0d1117] border border-[#222b34] rounded-lg">
              <div className="text-[10px] text-[#8a9aaa]">ACTIVE PLAN FRAGILITY</div>
              <div className="text-base font-bold text-[#2ecc71] mt-0.5">{state?.current_packet?.fragility ?? 'STABLE'}</div>
            </div>
            <div className="p-3 bg-[#0d1117] border border-[#222b34] rounded-lg">
              <div className="text-[10px] text-[#8a9aaa]">STATE VERSION</div>
              <div className="text-base font-bold text-[#00f2fe] mt-0.5">v{state?.world_state_version ?? 1}</div>
            </div>
          </div>

          {/* Active Tab View Rendering */}
          <div className="flex-1 relative overflow-hidden">
            {activeTab === 'mission_control' && (
              <div className="w-full h-full grid grid-rows-2 gap-3">
                <SpatialMapCanvas state={state} activePlanRouteId={state?.current_packet?.route_id} />
                <div className="grid grid-cols-2 gap-3 min-h-0">
                  <AgentTrace steps={state?.agent_steps || localSteps} reasoningMode={state?.reasoning_mode || 'LLM_AGENTIC'} />
                  <DependencyGraph state={state} />
                </div>
              </div>
            )}

            {activeTab === 'spatial_map' && (
              <SpatialMapCanvas state={state} activePlanRouteId={state?.current_packet?.route_id} />
            )}

            {activeTab === 'decision_intelligence' && (
              <DecisionPacketView packet={state?.current_packet || null} onAuthorize={handleAuthorize} />
            )}

            {activeTab === 'agent_telemetry' && (
              <AgentTrace steps={state?.agent_steps || localSteps} reasoningMode={state?.reasoning_mode || 'LLM_AGENTIC'} />
            )}

            {activeTab === 'counterfactuals' && (
              <CounterfactualFutures packet={state?.current_packet || null} />
            )}

            {activeTab === 'dependency_graph' && (
              <DependencyGraph state={state} />
            )}

            {activeTab === 'w3c_prov' && (
              <W3CProvView />
            )}
          </div>
        </main>

        {/* RIGHT CONTEXTUAL INTELLIGENCE DRAWER */}
        <aside className="w-96 bg-[#0d1117] border-l border-[#222b34] flex flex-col shrink-0 z-20 overflow-hidden">
          <DecisionPacketView packet={state?.current_packet || null} onAuthorize={handleAuthorize} />
        </aside>
      </div>

      {/* Proof-of-Agency Modal */}
      <VerifyAutonomyPanel isOpen={isVerifyAutonomyOpen} onClose={() => setIsVerifyAutonomyOpen(false)} />

      {/* Guided Walkthrough Tour */}
      <GuidedWalkthrough isOpen={isWalkthroughOpen} onClose={() => setIsWalkthroughOpen(false)} />
    </div>
  );
}

export default App;
