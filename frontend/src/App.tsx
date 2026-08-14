import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  fetchState,
  initializeMission,
  injectEvent,
  changePolicy,
  authorizeDecision,
  resetMission,
  streamAutonomousMission,
  fetchCounterfactuals,
  challengePlan,
  type RealityState,
  type AgentStep,
} from './api';
import { CinematicOpening } from './components/CinematicOpening';
import { DependencyGraph } from './components/DependencyGraph';
import { AgentTrace } from './components/AgentTrace';
import { DecisionPacketView } from './components/DecisionPacketView';
import { CausalTrace } from './components/CausalTrace';
import { CounterfactualFutures } from './components/CounterfactualFutures';
import { DecisionBoundaryGauge } from './components/DecisionBoundaryGauge';
import { RoleViews } from './components/RoleViews';
import { GuidedWalkthrough } from './components/GuidedWalkthrough';
import { ControlInfoModal, WhatJustHappenedPanel } from './components/ContextualHelp';
import {
  Play,
  RotateCcw,
  PlusCircle,
  AlertTriangle,
  GitBranch,
  ShieldAlert,
  Search,
  Command,
  Activity,
  Sparkles,
  Info,
} from 'lucide-react';

const SPRING = {
  BUTTER: { type: 'spring' as const, stiffness: 100, damping: 20, mass: 0.8 },
  SILKY: { type: 'spring' as const, stiffness: 150, damping: 25, mass: 0.6 },
  CINEMATIC: { type: 'spring' as const, stiffness: 80, damping: 30, mass: 1.2 },
};

function App() {
  const [showOpening, setShowOpening] = useState(true);
  const [state, setState] = useState<RealityState | null>(null);
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [localSteps, setLocalSteps] = useState<AgentStep[]>([]);
  const [isReplanning, setIsReplanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [counterfactualInfo, setCounterfactualInfo] = useState<string | null>(null);
  const [role, setRole] = useState<'GUEST' | 'OPERATOR' | 'COMMAND' | 'ADMIN'>('OPERATOR');
  const [isWalkthroughOpen, setIsWalkthroughOpen] = useState(false);
  const [activeInfoControl, setActiveInfoControl] = useState<string | null>(null);

  const getISTTime = () => {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date()) + ' IST';
  };

  const [istTime, setIstTime] = useState(getISTTime);

  useEffect(() => {
    const interval = setInterval(() => setIstTime(getISTTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchState()
      .then(setState)
      .catch((err) => {
        console.error(err);
        setError('Connection to REALITY//DECISION backend failed. Ensure API server is running on port 8000.');
      });
  }, []);

  const handleInitialize = async () => {
    try {
      setError(null);
      setCounterfactualInfo(null);
      const newState = await initializeMission();
      setState(newState);
      setLocalSteps([]);
    } catch (err) {
      setError('Failed to initialize mission.');
    }
  };

  const handleInject = async (eventId: string) => {
    try {
      setError(null);
      setCounterfactualInfo(null);
      const newState = await injectEvent(eventId);
      setState(newState);
    } catch (err) {
      setError(`Failed to inject event: ${eventId}`);
    }
  };

  const handlePolicyChange = async (policy: string) => {
    try {
      setError(null);
      const newState = await changePolicy(policy);
      setState(newState);
    } catch (err) {
      setError('Failed to update policy mode.');
    }
  };

  const handleAuthorize = async (action: string) => {
    try {
      setError(null);
      const newState = await authorizeDecision(action);
      setState(newState);
    } catch (err) {
      setError('Failed to record authorization action.');
    }
  };

  const handleReset = async () => {
    try {
      setError(null);
      setCounterfactualInfo(null);
      const newState = await resetMission();
      setState(newState);
      setLocalSteps([]);
    } catch (err) {
      setError('Failed to reset simulation.');
    }
  };

  const handleRunCounterfactuals = async () => {
    try {
      setError(null);
      const data = await fetchCounterfactuals();
      setCounterfactualInfo(
        `Generated ${data.counterfactuals.length} candidate branches. Recommended: ${data.base_case.name}`
      );
    } catch (err) {
      setError('Failed to execute counterfactual branch analysis.');
    }
  };

  const handleChallengePlan = async () => {
    try {
      setError(null);
      const data = await challengePlan();
      setCounterfactualInfo(
        `Critic Challenge Result: ${data.approved ? 'APPROVED' : 'REJECTED'} — ${data.critique}`
      );
    } catch (err) {
      setError('Failed to challenge current plan.');
    }
  };

  const handleStartAutonomousMission = () => {
    if (isReplanning) return;
    setIsReplanning(true);
    setLocalSteps([]);
    setActiveStep('evidence');
    setError(null);
    setCounterfactualInfo(null);

    const closeStream = streamAutonomousMission(
      (stepName, payload) => {
        if (stepName === 'synthetic_execution') {
          fetchState().then(setState);
        } else if (payload && payload.agent) {
          setLocalSteps((prev) => {
            const filtered = prev.filter((s) => s.agent !== payload.agent);
            return [...filtered, payload];
          });

          const stepOrder = ['evidence', 'dependency', 'verification', 'simulation', 'information', 'decision', 'critic'];
          const idx = stepOrder.indexOf(stepName);
          if (idx !== -1 && idx < stepOrder.length - 1) {
            setActiveStep(stepOrder[idx + 1]);
          } else {
            setActiveStep(null);
          }
        }
      },
      () => {
        setIsReplanning(false);
        setActiveStep(null);
        fetchState().then(setState);
      },
      (_err) => {
        setIsReplanning(false);
        setActiveStep(null);
        fetchState().then(setState);
      }
    );

    return () => closeStream();
  };

  if (!state) {
    return (
      <div className="app-shell flex flex-col items-center justify-center min-h-screen bg-[#0a0d0f] text-[#e8edf2] font-mono p-4">
        {error ? (
          <div className="border border-[#e74c3c]/40 bg-[#e74c3c]/10 text-[#e74c3c] p-6 rounded-lg max-w-md text-center">
            <AlertTriangle className="w-10 h-10 mx-auto mb-3" />
            <h3 className="font-bold text-sm mb-1">Operational Error</h3>
            <p className="text-xs text-[#8a9aaa] mb-4">{error}</p>
            <button onClick={handleInitialize} className="primary-btn">
              Retry Connection
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#f39c12] border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs text-[#8a9aaa] animate-pulse uppercase tracking-wider">
              CONNECTING TACTICAL COMMAND CORRIDOR...
            </span>
          </div>
        )}
      </div>
    );
  }

  const stepsToShow = localSteps.length > 0 ? localSteps : state.agent_steps;
  const availableVehicleCount = Object.values(state.vehicles).filter((v) => v.available).length;
  const totalVehicleCapacity = Object.values(state.vehicles)
    .filter((v) => v.available)
    .reduce((acc, v) => acc + v.capacity, 0);

  const counterfactualBranches = state.current_packet?.counterfactual_branches || [];
  const isSentinelAlert = state.sentinel_status === 'PLAN_AT_RISK';
  const isAuthorized = state.current_packet?.authorization_status === 'AUTHORIZED';

  const currentConfidence = state.current_packet?.confidence === 'HIGH' ? 88 : state.current_packet?.confidence === 'MEDIUM' ? 72 : 55;

  return (
    <div className="app-shell flex flex-col min-h-screen bg-[#0a0d0f] text-[#e8edf2] font-sans selection:bg-[#f39c12]/30">
      {/* Cinematic Opening Overlay */}
      {showOpening && <CinematicOpening onDismiss={() => setShowOpening(false)} />}

      {/* Topbar Command Branding */}
      <header className="topbar bg-[#14181a] border-b border-[#242a2e] px-6 py-3 flex items-center justify-between" id="topbar-container">
        <div className="brand flex items-center gap-3">
          <div className="brand-mark w-8 h-8 bg-[#1e2428] border border-[#242a2e] rounded flex items-center justify-center text-[#2ecc71]">
            <Command className="w-4 h-4" />
          </div>
          <div className="brand-copy text-left">
            <div className="brand-name text-sm font-bold text-[#e8edf2] tracking-wider">REALITY//DECISION</div>
            <div className="brand-sub text-[10px] text-[#8a9aaa] font-mono">AUTONOMOUS MULTI-AGENT COMMAND PLATFORM v0.3</div>
          </div>
        </div>

        <div className="topbar-meta flex items-center gap-4 font-mono text-xs">
          {/* Guided Walkthrough Button */}
          <button
            onClick={() => setIsWalkthroughOpen(true)}
            className="px-3 py-1.5 bg-[#6fa8dc] text-[#07090b] font-bold rounded flex items-center gap-1.5 hover:bg-[#9cc7ed] transition-all cursor-pointer shadow-md text-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>GUIDED WALKTHROUGH</span>
          </button>

          <div className="demo-chip bg-[#0a0d0f] border border-[#242a2e] px-3 py-1 rounded text-[#8a9aaa] text-[10px] flex items-center gap-2">
            <span className="text-[#3498db] font-bold">{istTime}</span>
            <span className="text-[#242a2e]">│</span>
            <span>SYNTHETIC SCENARIO</span>
          </div>

          <div className="flex items-center gap-2 border border-[#242a2e] bg-[#0a0d0f] px-2.5 py-1 rounded">
            <span className={`w-2 h-2 rounded-full ${state.llm_mode_active ? 'bg-[#3498db]' : 'bg-[#2ecc71]'}`}></span>
            <span className={state.llm_mode_active ? 'text-[#3498db] font-bold' : 'text-[#2ecc71] font-bold'}>
              REASONING: {state.reasoning_mode || (state.llm_mode_active ? 'LLM-ENHANCED' : 'OFFLINE DETERMINISTIC')}
            </span>
            <button
              onClick={() => setActiveInfoControl('reasoning_mode')}
              className="text-[#718086] hover:text-[#6fa8dc] ml-1 cursor-pointer"
              title="Inspect Reasoning Mode"
            >
              <Info className="w-3 h-3" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Command Wrap */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING.CINEMATIC}
        className="max-w-[1440px] w-full mx-auto px-6 py-6 flex flex-col gap-6"
      >
        {/* Role Selector & Narrative Panel Component */}
        <RoleViews state={state} role={role} onRoleChange={setRole} onAuthorize={handleAuthorize} />

        {/* Hero Mission Statement Banner */}
        <section className="briefing bg-[#14181a] border border-[rgba(255,255,255,0.1)] rounded-xl p-6 text-left backdrop-blur-md shadow-lg" id="mission-briefing-panel">
          <div className="text-[10px] font-mono text-[#94a3b8] uppercase tracking-widest mb-1.5 font-bold">
            OPERATION ASSAM FLOOD <span className="text-[#64748b]">/</span> INCIDENT COMMAND 04
          </div>
          <h2 className="text-xl font-bold text-[#f8fafc] mb-2 leading-tight">
            Evacuation Logistics & Counterfactual Re-planning
          </h2>
          <p className="text-xs text-[#94a3b8] leading-relaxed max-w-3xl font-sans">
            Autonomous multi-agent decision support for environments where reality changes faster than humans can manually re-plan. Real-world disruptions trigger independent agent investigation, dependency cascades, counterfactual simulations, and autonomous replanning.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 pt-4 border-t border-[#334155] text-xs font-mono">
            <div>
              <span className="text-[#64748b] block text-[9px] uppercase font-bold tracking-wider">TARGET SHELTER</span>
              <strong className="text-[#f8fafc] font-semibold">Shelter S-04</strong>
            </div>
            <div>
              <span className="text-[#64748b] block text-[9px] uppercase font-bold tracking-wider">PRIMARY DEPOT</span>
              <strong className="text-[#f8fafc] font-semibold">Depot D-03</strong>
            </div>
            <div>
              <span className="text-[#64748b] block text-[9px] uppercase font-bold tracking-wider">VEHICLE CAPACITY</span>
              <strong className="text-[#f8fafc] font-semibold">{totalVehicleCapacity} Slots ({availableVehicleCount} Trucks)</strong>
            </div>
            <div>
              <span className="text-[#64748b] block text-[9px] uppercase font-bold tracking-wider">ENVIRONMENT</span>
              <strong className="text-[#f59e0b] uppercase font-bold">{state.weather}</strong>
            </div>
          </div>
        </section>

        {/* Live Context Panel: What Just Happened? */}
        <WhatJustHappenedPanel state={state} />

        {/* Continuous Sentinel Status Banner */}
        <motion.section
          transition={SPRING.BUTTER}
          className={`p-4 rounded-xl border font-mono text-xs flex flex-wrap items-center justify-between gap-3 transition-all backdrop-blur-md ${
            isSentinelAlert
              ? 'border-[#ff453a] bg-[#ff453a]/15 text-[#ff453a] shadow-lg shadow-[#ff453a]/25'
              : isAuthorized
              ? 'border-[#30d158]/50 bg-[#30d158]/10 text-[#30d158]'
              : 'border-[rgba(255,255,255,0.1)] bg-[#0d1418]/80 text-[#9eb0c0]'
          }`}
        >
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            <Activity className={`w-4 h-4 flex-shrink-0 ${isSentinelAlert ? 'animate-spin text-[#ff453a]' : 'text-[#0a84ff]'}`} />
            <span className="font-bold uppercase tracking-wider text-[#f5f7fa]">CONTINUOUS SENTINEL STATUS:</span>
            <span className="text-[#a0b2c6] font-medium leading-relaxed">
              {isSentinelAlert
                ? '⚠ AUTHORIZED PLAN AT RISK — Post-authorization reality shift detected! Autonomously replanning...'
                : isAuthorized
                ? 'AUTHORIZED PLAN MONITORING — Active Sentinel scanning environment for violations'
                : 'STANDBY — Awaiting initial plan authorization'}
            </span>
          </div>
          <div className="text-[10px] font-bold tracking-widest uppercase bg-[#070a0e] px-3 py-1 rounded-md border border-[rgba(255,255,255,0.1)]">
            {isSentinelAlert ? 'ALERT: REPLAN ACTIVE' : isAuthorized ? 'SENTINEL ACTIVE' : 'SENTINEL IDLE'}
          </div>
        </motion.section>

        {/* Scenario Controls & Action Rail */}
        <section className="flex flex-wrap items-center justify-between gap-4 border-y border-[rgba(255,255,255,0.1)] py-4">
          <div className="action-rail flex items-center gap-3 flex-wrap">
            <button
              onClick={handleStartAutonomousMission}
              disabled={isReplanning}
              className="px-4 py-2.5 bg-[#30d158] text-[#070a0e] font-bold rounded-lg text-xs hover:bg-[#28c04d] transition-all flex items-center gap-2 disabled:opacity-50 shadow-md cursor-pointer"
            >
              <Play className={`w-4 h-4 ${isReplanning ? 'animate-spin' : ''}`} />
              {isReplanning ? 'AUTONOMOUS LOOP ACTIVE...' : 'START AUTONOMOUS MISSION'}
            </button>

            <button
              onClick={() => handleInject('bridge_fails')}
              className="px-4 py-2.5 bg-[#0d1418] border border-[rgba(255,255,255,0.12)] hover:border-[#ff453a] text-[#f5f7fa] rounded-lg text-xs flex items-center gap-2 transition-all cursor-pointer hover:bg-[#ff453a]/10"
            >
              <PlusCircle className="w-4 h-4 text-[#ff453a]" /> INJECT B-07 COLLAPSE (EVENT 1)
            </button>

            <button
              onClick={() => handleInject('weather_escalates')}
              className="px-4 py-2.5 bg-[#0d1418] border border-[rgba(255,255,255,0.12)] hover:border-[#ff9f0a] text-[#f5f7fa] rounded-lg text-xs flex items-center gap-2 transition-all cursor-pointer hover:bg-[#ff9f0a]/10"
            >
              <ShieldAlert className="w-4 h-4 text-[#ff9f0a]" /> INJECT SECOND FAILURE (EVENT 2)
            </button>

            <button
              onClick={() => handleInject('conflict_occurs')}
              className="px-4 py-2.5 bg-[#0d1418] border border-[rgba(255,255,255,0.12)] hover:border-[#ffab00] text-[#f5f7fa] rounded-lg text-xs flex items-center gap-2 transition-all cursor-pointer hover:bg-[#ffab00]/10"
            >
              <AlertTriangle className="w-4 h-4 text-[#ffab00]" /> SATELLITE CONFLICT
            </button>

            <button
              onClick={handleRunCounterfactuals}
              className="px-4 py-2.5 bg-[#0d1418] border border-[rgba(255,255,255,0.12)] hover:border-[#0a84ff] text-[#f5f7fa] rounded-lg text-xs flex items-center gap-2 transition-all cursor-pointer hover:bg-[#0a84ff]/10"
            >
              <GitBranch className="w-4 h-4 text-[#0a84ff]" /> RUN COUNTERFACTUALS
            </button>

            <button
              onClick={handleChallengePlan}
              className="px-4 py-2.5 bg-[#0d1418] border border-[rgba(255,255,255,0.12)] hover:border-[#ff9f0a] text-[#f5f7fa] rounded-lg text-xs flex items-center gap-2 transition-all cursor-pointer hover:bg-[#ff9f0a]/10"
            >
              <ShieldAlert className="w-4 h-4 text-[#ff9f0a]" /> CHALLENGE PLAN
            </button>

            <button
              onClick={handleReset}
              className="px-4 py-2.5 bg-[#0d1418] border border-[rgba(255,255,255,0.12)] hover:border-[#a0b2c6] text-[#a0b2c6] hover:text-[#f5f7fa] rounded-lg text-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" /> RESET MISSION
            </button>
          </div>

          {/* Mission Policy Selector */}
          <div className="flex items-center gap-2 font-mono text-xs bg-[#0d1418] border border-[rgba(255,255,255,0.12)] px-3 py-1.5 rounded-lg backdrop-blur-md">
            <span className="text-[#a0b2c6] font-bold uppercase tracking-wider text-[10px]">POLICY MODE:</span>
            <div className="bg-[#070a0e] p-0.5 rounded-md border border-[rgba(255,255,255,0.1)] flex gap-1">
              {['SAFE', 'BALANCED', 'URGENT'].map((policyOption) => (
                <button
                  key={policyOption}
                  onClick={() => handlePolicyChange(policyOption)}
                  className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                    state.policy === policyOption
                      ? 'bg-[#0a84ff] text-[#070a0e] shadow-sm font-extrabold'
                      : 'text-[#a0b2c6] hover:text-[#f5f7fa] hover:bg-white/5'
                  }`}
                >
                  {policyOption}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Counterfactual Info Banner */}
        {counterfactualInfo && (
          <div className="border border-[#3498db]/40 bg-[#3498db]/10 text-[#3498db] p-3 rounded text-xs flex items-center gap-2 font-mono text-left">
            <Search className="w-4 h-4 flex-shrink-0" />
            <span>{counterfactualInfo}</span>
          </div>
        )}

        {/* Cockpit Grid (Top Row) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Column: Live Map & Counterfactual Graph (7 cols) */}
          <div className="lg:col-span-7 flex flex-col">
            <DependencyGraph state={state} />
          </div>

          {/* Right Column: Multi-Agent Execution Grid (5 cols) */}
          <div className="lg:col-span-5 flex flex-col">
            <AgentTrace steps={stepsToShow} activeStep={activeStep} />
          </div>
        </section>

        {/* Decision Boundary Gauge Widget Row */}
        <section className="w-full">
          <DecisionBoundaryGauge confidence={currentConfidence} isReversalTriggered={isSentinelAlert} />
        </section>

        {/* Candidate Futures Visualization Row */}
        {counterfactualBranches.length > 0 && (
          <section className="w-full">
            <CounterfactualFutures branches={counterfactualBranches} />
          </section>
        )}

        {/* Lower Grid (Bottom Row) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Column: Decision Packet & Capacity Telemetry (6 cols) */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <DecisionPacketView packet={state.current_packet} onAuthorize={handleAuthorize} />

            {/* Capacity Telemetry Card */}
            <div className={`capacity bg-[#14181a] border border-[#242a2e] rounded-lg p-4 font-mono text-left flex items-center justify-between ${state.current_packet?.capacity_gap ? 'border-[#e74c3c] bg-[#e74c3c]/10' : ''}`}>
              <div>
                <div className="text-xs uppercase text-[#8a9aaa]">Vehicle Capacity Telemetry</div>
                <div className="text-sm font-bold text-[#e8edf2] mt-0.5">Available Evacuation Transport Assets</div>
                <div className="w-48 h-2 bg-[#0a0d0f] rounded-full overflow-hidden border border-[#242a2e] mt-2">
                  <div className="h-full bg-[#2ecc71] rounded-full" style={{ width: `${Math.min(100, (totalVehicleCapacity / 40) * 100)}%` }}></div>
                </div>
              </div>
              <div className="text-2xl font-bold text-[#e8edf2]">
                {totalVehicleCapacity} <span className="text-xs text-[#5a6a7a]">SLOTS</span>
              </div>
            </div>
          </div>

          {/* Right Column: Counterfactual Causal Reasoning Trace (6 cols) */}
          <div className="lg:col-span-6 flex flex-col">
            <CausalTrace packet={state.current_packet} replanCount={state.replan_count} />
          </div>
        </section>

        {/* Audit Log Footer */}
        <footer className="border-t border-[#242a2e] pt-4 mt-2 flex flex-wrap items-center justify-between text-[10px] font-mono text-[#5a6a7a]">
          <div>REALITY//DECISION ENGINE · REPLIT COMMAND CENTER SYSTEM</div>
          <div>MISSION RE-PLAN CYCLES: {state.replan_count} · DECISION HORIZON: {state.decision_horizon_min}M</div>
        </footer>
      </motion.div>

      {/* Interactive Guided Walkthrough Modal */}
      <GuidedWalkthrough
        isOpen={isWalkthroughOpen}
        onClose={() => setIsWalkthroughOpen(false)}
        role={role}
        onRoleChange={setRole}
      />

      {/* Control Info Popover Modal */}
      <ControlInfoModal
        controlKey={activeInfoControl}
        onClose={() => setActiveInfoControl(null)}
      />
    </div>
  );
}

export default App;
