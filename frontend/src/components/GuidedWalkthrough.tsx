import React, { useState } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Compass,
  CheckCircle2,
  BookOpen,
  ShieldAlert,
  BrainCircuit,
  Activity,
  GitBranch,
  Check,
  Sparkles,
} from 'lucide-react';

interface GuidedWalkthroughProps {
  isOpen: boolean;
  onClose: () => void;
  role?: 'GUEST' | 'OPERATOR' | 'COMMAND' | 'ADMIN';
  onRoleChange?: (r: 'GUEST' | 'OPERATOR' | 'COMMAND' | 'ADMIN') => void;
}

export interface WalkthroughStep {
  id: string;
  number: string;
  title: string;
  targetElementId?: string;
  icon: React.ElementType;
  guest: {
    whatIsThis: string;
    whatDoesItDo: string;
    whyUseIt: string;
    whatHappensOnClick: string;
    whatWillISee: string;
    whatNext: string;
  };
  user: {
    whatIsThis: string;
    whatDoesItDo: string;
    whyUseIt: string;
    whatHappensOnClick: string;
    whatWillISee: string;
    whatNext: string;
  };
  admin: {
    whatIsThis: string;
    whatDoesItDo: string;
    whyUseIt: string;
    whatHappensOnClick: string;
    whatWillISee: string;
    whatNext: string;
  };
}

const STEPS: WalkthroughStep[] = [
  {
    id: 'orientation',
    number: '01',
    title: 'Orientation & Command Dashboard',
    targetElementId: 'topbar-container',
    icon: Compass,
    guest: {
      whatIsThis: 'Tactical Command Dashboard overview.',
      whatDoesItDo: 'Displays real-time crisis status, local time in IST, and system connection mode.',
      whyUseIt: 'To immediately understand system health and current mission parameters.',
      whatHappensOnClick: 'Navigates top-level telemetry and switches explanation density.',
      whatWillISee: 'Live ticking IST clock and reasoning status badge.',
      whatNext: 'Inspect the Incident Mission Objectives below.',
    },
    user: {
      whatIsThis: 'Operational Incident Command Topbar & Telemetry Monitor.',
      whatDoesItDo: 'Tracks system time (Asia/Kolkata), environmental stability, and model mode.',
      whyUseIt: 'Ensures the operator knows if LLM multi-turn agentic or offline fallback is active.',
      whatHappensOnClick: 'Updates active session metadata and triggers role views.',
      whatWillISee: 'REASONING: LLM-ENHANCED (Blue) or OFFLINE DETERMINISTIC (Green).',
      whatNext: 'Review Mission Parameters for Operation Assam Flood.',
    },
    admin: {
      whatIsThis: 'System Status & Reasoning Environment Header.',
      whatDoesItDo: 'Renders system clock, API backend socket status, and LLM mode flag.',
      whyUseIt: 'Monitors runtime state consistency and API availability.',
      whatHappensOnClick: 'Triggers GET /api/state and GET /api/health.',
      whatWillISee: 'HTTP status codes and active LLM configuration in .env.',
      whatNext: 'Inspect Evidence and Dependency Graph state structures.',
    },
  },
  {
    id: 'mission',
    number: '02',
    title: 'Mission & Incident Objectives',
    targetElementId: 'mission-briefing-panel',
    icon: BookOpen,
    guest: {
      whatIsThis: 'Emergency Evacuation Mission Briefing.',
      whatDoesItDo: 'Defines what the AI and humans are trying to achieve (evacuating 25 citizens).',
      whyUseIt: 'Gives clear purpose to the operational decision system.',
      whatHappensOnClick: 'Displays mission parameters and target shelter capacity.',
      whatWillISee: 'Shelter S-04, Depot D-03, and total vehicle capacity metrics.',
      whatNext: 'Observe the current real-world status on the map graph.',
    },
    user: {
      whatIsThis: 'Operation Assam Flood Evacuation Logistics Specification.',
      whatDoesItDo: 'Establishes primary constraints: Shelter S-04 capacity, Depot D-03 supply, Vehicle V-02 availability.',
      whyUseIt: 'Loglogistics planners use this to verify resource allocation limits.',
      whatHappensOnClick: 'Loads baseline constraints into memory.',
      whatWillISee: '25 evacuation slots across active vehicle inventory.',
      whatNext: 'Inspect Bridge B-07 status in the Dependency Graph.',
    },
    admin: {
      whatIsThis: 'Mission State Record (RealityState.mission).',
      whatDoesItDo: 'Stores mission parameters in Python memory (CoreOrchestrator).',
      whyUseIt: 'Used by deterministic validators to evaluate capacity gaps.',
      whatHappensOnClick: 'Evaluates state.vehicles and state.shelters.',
      whatWillISee: 'Structured dict payload containing vehicle capacities and shelter limits.',
      whatNext: 'Examine node dependency graph structure.',
    },
  },
  {
    id: 'reality',
    number: '03',
    title: 'Reality State & Infrastructure Map',
    targetElementId: 'dependency-graph-panel',
    icon: Activity,
    guest: {
      whatIsThis: 'Real-World Infrastructure Map & Node Inspector.',
      whatDoesItDo: 'Shows physical locations: Bridge B-07, Route R-12, Depot D-03, Shelter S-04.',
      whyUseIt: 'To see which roads and bridges are working and which are broken.',
      whatHappensOnClick: 'Clicking any node displays its details on the right panel.',
      whatWillISee: 'Green nodes mean accessible; red flashing nodes mean flooded/submerged.',
      whatNext: 'Inject a reality disruption (Bridge B-07 Failure) to test the system.',
    },
    user: {
      whatIsThis: 'Interactive GIS & Operational Entity Dependency Network.',
      whatDoesItDo: 'Maps physical infrastructure dependencies and flood risk vectors.',
      whyUseIt: 'Allows planners to trace route availability and physical bottlenecks.',
      whatHappensOnClick: 'Highlights selected entity and updates inspector card.',
      whatWillISee: 'Bridge B-07 status (AVAILABLE / UNAVAILABLE), capacity, and coordinates.',
      whatNext: 'Click [INJECT B-07 FAILURE] in top control panel.',
    },
    admin: {
      whatIsThis: 'Network Graph Visualizer (DependencyGraph Component).',
      whatDoesItDo: 'Renders Canvas/SVG node topology driven by state.graph adjacency matrix.',
      whyUseIt: 'Visualizes topological failure cascades and edge weights.',
      whatHappensOnClick: 'Dispatches setSelectedEntity(nodeId).',
      whatWillISee: 'Entity state dict: { id, name, status, capacity, coordinates }.',
      whatNext: 'Trigger POST /api/inject with event_id: "bridge_b07_failure".',
    },
  },
  {
    id: 'disruption',
    number: '04',
    title: 'Reality Disruption Injection',
    targetElementId: 'inject-b07-btn',
    icon: ShieldAlert,
    guest: {
      whatIsThis: 'Reality Event Simulation Trigger.',
      whatDoesItDo: 'Simulates a real-world flood emergency (Bridge B-07 submerged by water).',
      whyUseIt: 'To see how the AI reacts when the real world changes unexpectedly.',
      whatHappensOnClick: 'Bridge B-07 turns red, Route R-12 is blocked, and AI begins re-planning.',
      whatWillISee: 'Alert banner: DISRUPTION DETECTED — B-07 SUBMERGED.',
      whatNext: 'Watch the Multi-Agent Grid start investigating solutions.',
    },
    user: {
      whatIsThis: 'Event Stream Injection Interface.',
      whatDoesItDo: 'Posts a disruption event payload to the backend engine.',
      whyUseIt: 'Tests operational readiness and autonomous replanning performance.',
      whatHappensOnClick: 'Triggers POST /api/inject with { event_id: "bridge_b07_failure" }.',
      whatWillISee: 'Immediate dependency cascade from B-07 failure to Route R-12 blockage.',
      whatNext: 'Observe Multi-Agent Execution Grid tool execution.',
    },
    admin: {
      whatIsThis: 'Disruption Event Ingestion Endpoint Handler.',
      whatDoesItDo: 'Invokes EvidenceAgent.ingest_event() and sets B-07.status = UNAVAILABLE.',
      whyUseIt: 'Updates system state and flags state.sentinel_status = REPLAN_REQUIRED.',
      whatHappensOnClick: 'Executes Python state mutation and returns updated RealityState.',
      whatWillISee: 'State change payload: { b07: UNAVAILABLE, r12: BLOCKED, replan_count: N+1 }.',
      whatNext: 'Inspect AutonomousPlannerAgent LLM tool invocation loop.',
    },
  },
  {
    id: 'agents',
    number: '05',
    title: 'Multi-Agent Autonomous Execution Grid',
    targetElementId: 'agent-trace-panel',
    icon: BrainCircuit,
    guest: {
      whatIsThis: '7 AI Agents Working Together.',
      whatDoesItDo: 'Shows each AI agent performing its specialized task in plain English.',
      whyUseIt: 'To see how the AI investigates the problem instead of giving a random guess.',
      whatHappensOnClick: 'Clicking [SHOW RAW TELEMETRY] reveals technical LLM logs.',
      whatWillISee: 'Status indicators changing from STANDBY to EXECUTING... to COMPLETED.',
      whatNext: 'Examine the "Why the System Changed Its Mind" adaptation flow.',
    },
    user: {
      whatIsThis: 'Multi-Agent Execution & Tool Telemetry Grid.',
      whatDoesItDo: 'Tracks Evidence, Dependency, Counterfactual, Critic, VOI, and Decision agents.',
      whyUseIt: 'Provides full transparency into AI investigation steps.',
      whatHappensOnClick: 'Toggles between plain-English descriptions and raw model telemetry.',
      whatWillISee: 'Agent latencies in milliseconds and mode (LLM_AGENTIC or DETERMINISTIC).',
      whatNext: 'Inspect the Causal Adaptation Trace.',
    },
    admin: {
      whatIsThis: 'Autonomous Agent Telemetry Grid (AgentTrace Component).',
      whatDoesItDo: 'Renders agent_steps array emitted by AutonomousPlannerAgent generator.',
      whyUseIt: 'Verifies model function calls, latency_ms, and prompt token turns.',
      whatHappensOnClick: 'Expands inputs/outputs dicts for each step.',
      whatWillISee: 'Typed tool execution records with execution IDs and mode tags.',
      whatNext: 'Review Causal Adaptation Trace delta.',
    },
  },
  {
    id: 'causal',
    number: '06',
    title: 'Why the System Changed Its Mind',
    targetElementId: 'causal-trace-panel',
    icon: GitBranch,
    guest: {
      whatIsThis: 'Visual Adaptation Flow (Before vs After).',
      whatDoesItDo: 'Shows step-by-step why the AI abandoned Route R-12 and chose Route R-14.',
      whyUseIt: 'To easily explain the AI recommendation to non-technical stakeholders.',
      whatHappensOnClick: 'Clicking any step opens a detailed modal with observations & reasoning.',
      whatWillISee: 'Clear banner: BEFORE (R-12) → DISRUPTION (B-07) → CASCADE → AFTER (R-14).',
      whatNext: 'Compare alternative candidate branches in Counterfactual Futures.',
    },
    user: {
      whatIsThis: 'Causal Trace & Decision Lineage Analyzer.',
      whatDoesItDo: 'Maps causal chain from reality change to final decision formulation.',
      whyUseIt: 'Essential for post-incident auditability and legal compliance.',
      whatHappensOnClick: 'Opens step detail modal displaying input, reasoning, and output.',
      whatWillISee: 'Step payload details for REALITY, FAILURE, CASCADE, SIMULATE, and REPLAN.',
      whatNext: 'Check evaluated counterfactual branches below.',
    },
    admin: {
      whatIsThis: 'Causal Trace Component (CausalTrace.tsx).',
      whatDoesItDo: 'Synthesizes state audit trail and packet provenance into sequential timeline.',
      whyUseIt: 'Verifies causal dependency lineage and decision packet origin.',
      whatHappensOnClick: 'Populates selectedStep state for modal overlay.',
      whatWillISee: 'Raw step dict: { label, agent, input, reasoning, output, time }.',
      whatNext: 'Inspect Counterfactual Futures simulation results.',
    },
  },
  {
    id: 'simulation',
    number: '07',
    title: 'Counterfactual Futures Simulation',
    targetElementId: 'counterfactual-panel',
    icon: Sparkles,
    guest: {
      whatIsThis: 'Parallel Scenario Simulator.',
      whatDoesItDo: 'Tests 3 possible futures at once: Direct Corridor, Safe Bypass, Reconnaissance Delay.',
      whyUseIt: 'To evaluate risk before committing actual vehicles.',
      whatHappensOnClick: 'Displays confidence ratings and risk warnings for each option.',
      whatWillISee: 'Branch A (0% Safety), Branch B (88% Confidence RECOMMENDED), Branch C (Disqualified).',
      whatNext: 'Review the synthesized Decision Packet.',
    },
    user: {
      whatIsThis: 'Counterfactual Simulation Engine (SimulationAgent).',
      whatDoesItDo: 'Clones world state into deepcopies to stress-test candidate routes.',
      whyUseIt: 'Quantifies ETA, capacity gap, and flood risk across parallel branches.',
      whatHappensOnClick: 'Triggers simulation evaluation over candidate policies.',
      whatWillISee: 'Branch status badges (RECOMMENDED, REJECTED, DISQUALIFIED).',
      whatNext: 'Examine the Decision Intelligence Packet.',
    },
    admin: {
      whatIsThis: 'Simulation Engine Evaluator (SimulationAgent.stress_test).',
      whatDoesItDo: 'Executes copy.deepcopy(state) and evaluates candidate route paths.',
      whyUseIt: 'Prevents state mutation during experimental scenario evaluation.',
      whatHappensOnClick: 'Invokes GET /api/counterfactuals or runs inline simulation.',
      whatWillISee: 'SimReport dict with base_case and counterfactuals list.',
      whatNext: 'Inspect DecisionPacket fields.',
    },
  },
  {
    id: 'decision',
    number: '08',
    title: 'Decision Intelligence Packet',
    targetElementId: 'decision-packet-panel',
    icon: CheckCircle2,
    guest: {
      whatIsThis: 'The AI Recommendation Card.',
      whatDoesItDo: 'Presents the final AI recommendation: ROUTE R-14 — SAFE BYPASS DETOUR.',
      whyUseIt: 'Gives the mission commander a clear, complete, actionable proposal.',
      whatHappensOnClick: 'Displays rationale, assumptions, risks, and human authorization buttons.',
      whatWillISee: 'Recommended Action, Mission, Policy, Rationale, and Assumptions.',
      whatNext: 'Review the Human Authorization Boundary.',
    },
    user: {
      whatIsThis: 'Structured Operational Decision Packet (DecisionPacketView).',
      whatDoesItDo: 'Consolidates recommendation, route ID, critical assumptions, and failure risk.',
      whyUseIt: 'Provides all necessary context for commander decision authorization.',
      whatHappensOnClick: 'Renders packet details and enables AUTHORIZE / REJECT controls.',
      whatWillISee: 'Full decision packet metadata with authorization status badge.',
      whatNext: 'Click [AUTHORIZE PLAN] to approve the plan.',
    },
    admin: {
      whatIsThis: 'DecisionPacket Data Model (core.models.DecisionPacket).',
      whatDoesItDo: 'Pydantic model generated by Gemini function call generate_decision_packet.',
      whyUseIt: 'Enforces strict schema validation over LLM outputs.',
      whatHappensOnClick: 'Renders state.current_packet fields.',
      whatWillISee: 'DecisionPacket JSON payload with provenance and confidence.',
      whatNext: 'Execute human authorization POST /api/authorize.',
    },
  },
  {
    id: 'authorization',
    number: '09',
    title: 'Human Authorization Gate',
    targetElementId: 'authorize-btn',
    icon: Check,
    guest: {
      whatIsThis: 'Human-in-the-Loop Control Gate.',
      whatDoesItDo: 'Puts human commanders in total control. The AI recommends; the human decides.',
      whyUseIt: 'To ensure AI never dispatches real resources without human permission.',
      whatHappensOnClick: 'Approves the plan and dispatches vehicles. Status turns green AUTHORIZED.',
      whatWillISee: 'Authorization status changes to AUTHORIZED.',
      whatNext: 'Observe the Continuous Sentinel monitoring system taking over.',
    },
    user: {
      whatIsThis: 'Commander Authorization Control Boundary.',
      whatDoesItDo: 'Executes physical dispatch authorization for the active Decision Packet.',
      whyUseIt: 'Enforces legal and operational accountability.',
      whatHappensOnClick: 'Triggers POST /api/authorize with { action: "AUTHORIZE" }.',
      whatWillISee: 'Status updates to AUTHORIZED and Sentinel monitoring activates.',
      whatNext: 'Monitor Sentinel status in top header.',
    },
    admin: {
      whatIsThis: 'Authorization Endpoint Handler (app.main.authorize_decision).',
      whatDoesItDo: 'Sets state.current_packet.authorization_status = "AUTHORIZED".',
      whyUseIt: 'Activates state.sentinel_status = "MONITORING".',
      whatHappensOnClick: 'Mutates state in memory and appends to audit trail.',
      whatWillISee: 'Updated state payload with AUTHORIZED status.',
      whatNext: 'Inspect Sentinel monitoring loop.',
    },
  },
  {
    id: 'sentinel',
    number: '10',
    title: 'Continuous Sentinel Monitoring',
    targetElementId: 'sentinel-badge',
    icon: ShieldAlert,
    guest: {
      whatIsThis: 'Post-Authorization Safety Safeguard.',
      whatDoesItDo: 'Monitors the environment continuously after a plan is authorized.',
      whyUseIt: 'If another road breaks later, Sentinel wakes the AI to adapt again immediately.',
      whatHappensOnClick: 'Displays live Sentinel status (MONITORING or PLAN_AT_RISK).',
      whatWillISee: 'Green pulsating SENTINEL ACTIVE badge in top header.',
      whatNext: 'You have completed the full operational tour!',
    },
    user: {
      whatIsThis: 'Continuous Telemetry & Post-Authorization Monitor (SentinelEngine).',
      whatDoesItDo: 'Evaluates incoming streams against active authorized plan constraints.',
      whyUseIt: 'Detects post-authorization disruptions and triggers automated re-planning.',
      whatHappensOnClick: 'Checks stream telemetry for risk violations.',
      whatWillISee: 'Sentinel status: SENTINEL ACTIVE (Nominal) or PLAN AT RISK (Alert).',
      whatNext: 'Click [RESET MISSION] to reset or test another scenario.',
    },
    admin: {
      whatIsThis: 'Sentinel Monitoring Engine (SentinelEngine.evaluate).',
      whatDoesItDo: 'Background daemon checking state.stream against current_packet assumptions.',
      whyUseIt: 'Triggers AutonomousPlannerAgent when sentinel_status == "PLAN_AT_RISK".',
      whatHappensOnClick: 'Returns boolean risk assessment.',
      whatWillISee: 'Sentinel state logs: { active_plan, monitored_nodes, risk_score }.',
      whatNext: 'Walkthrough complete! You can restart anytime.',
    },
  },
];

export const GuidedWalkthrough: React.FC<GuidedWalkthroughProps> = ({
  isOpen,
  onClose,
  role,
  onRoleChange,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  if (!isOpen) return null;

  const currentStep = STEPS[currentStepIndex];
  const Icon = currentStep.icon;

  const roleContent =
    role === 'GUEST'
      ? currentStep.guest
      : role === 'ADMIN'
      ? currentStep.admin
      : currentStep.user;

  const handleNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-mono selection:bg-[#6fa8dc]/30">
      <div className="max-w-2xl w-full bg-[#0d1418] border border-[#6fa8dc]/40 rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#14181a] border-b border-[#242a2e] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#6fa8dc] animate-pulse" />
            <span className="font-bold text-sm text-[#e8edf2] tracking-wider uppercase">
              INTERACTIVE GUIDED WALKTHROUGH
            </span>
            <span className="text-[10px] bg-[#6fa8dc]/10 text-[#6fa8dc] border border-[#6fa8dc]/30 px-2 py-0.5 rounded font-mono">
              STEP {currentStep.number} / {STEPS.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[#718086] hover:text-[#e8edf2] transition-colors p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Density / Explanation Level Tabs */}
        <div className="bg-[#0a0f12] border-b border-[#242a2e] px-4 py-2 flex items-center justify-between text-xs">
          <span className="text-[#8a9aaa] text-[10px] uppercase font-bold tracking-wider">
            EXPLANATION LEVEL:
          </span>
          <div className="flex items-center gap-1">
            {(['GUEST', 'OPERATOR', 'ADMIN'] as const).map((r) => (
              <button
                key={r}
                onClick={() => onRoleChange?.(r === 'OPERATOR' ? 'OPERATOR' : r)}
                className={`px-2.5 py-1 text-[10px] font-bold rounded cursor-pointer transition-colors ${
                  (role === 'OPERATOR' && r === 'OPERATOR') || role === r
                    ? 'bg-[#6fa8dc] text-[#07090b]'
                    : 'bg-[#182229] text-[#aab5b8] hover:text-[#e8edf2]'
                }`}
              >
                {r === 'GUEST' ? 'SIMPLE (GUEST)' : r === 'OPERATOR' ? 'PRACTICAL (OPERATOR)' : 'TECHNICAL (ADMIN)'}
              </button>
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-left">
          {/* Step Title Banner */}
          <div className="flex items-center gap-3 border-b border-[#242a2e] pb-3">
            <div className="w-10 h-10 rounded-lg bg-[#6fa8dc]/10 border border-[#6fa8dc]/30 flex items-center justify-center text-[#6fa8dc]">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-[#6fa8dc] uppercase tracking-widest font-bold">
                STAGE {currentStep.number} // {currentStep.id.toUpperCase()}
              </div>
              <h3 className="text-lg font-bold text-[#e8edf2] leading-tight">
                {currentStep.title}
              </h3>
            </div>
          </div>

          {/* Structured 6-Question Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="border border-[#253139] bg-[#07090b] p-3 rounded">
              <span className="text-[10px] text-[#6fa8dc] font-bold uppercase block mb-1">
                ❓ WHAT IS THIS?
              </span>
              <p className="text-[#e8edf2] text-[11px] leading-relaxed">
                {roleContent.whatIsThis}
              </p>
            </div>

            <div className="border border-[#253139] bg-[#07090b] p-3 rounded">
              <span className="text-[10px] text-[#65c89a] font-bold uppercase block mb-1">
                ⚡ WHAT DOES IT DO?
              </span>
              <p className="text-[#e8edf2] text-[11px] leading-relaxed">
                {roleContent.whatDoesItDo}
              </p>
            </div>

            <div className="border border-[#253139] bg-[#07090b] p-3 rounded">
              <span className="text-[10px] text-[#f5c86e] font-bold uppercase block mb-1">
                🎯 WHY WOULD I USE IT?
              </span>
              <p className="text-[#e8edf2] text-[11px] leading-relaxed">
                {roleContent.whyUseIt}
              </p>
            </div>

            <div className="border border-[#253139] bg-[#07090b] p-3 rounded">
              <span className="text-[10px] text-[#e45b55] font-bold uppercase block mb-1">
                🖱️ WHAT HAPPENS WHEN I CLICK IT?
              </span>
              <p className="text-[#e8edf2] text-[11px] leading-relaxed">
                {roleContent.whatHappensOnClick}
              </p>
            </div>

            <div className="border border-[#253139] bg-[#07090b] p-3 rounded">
              <span className="text-[10px] text-[#9cc7ed] font-bold uppercase block mb-1">
                👁️ WHAT WILL I SEE AFTERWARD?
              </span>
              <p className="text-[#e8edf2] text-[11px] leading-relaxed">
                {roleContent.whatWillISee}
              </p>
            </div>

            <div className="border border-[#253139] bg-[#07090b] p-3 rounded">
              <span className="text-[10px] text-[#c984d8] font-bold uppercase block mb-1">
                👉 WHAT SHOULD I LOOK AT NEXT?
              </span>
              <p className="text-[#e8edf2] text-[11px] leading-relaxed">
                {roleContent.whatNext}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="bg-[#14181a] border-t border-[#242a2e] px-4 py-3 flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-1.5 transition-colors cursor-pointer ${
              currentStepIndex === 0
                ? 'bg-[#182229] text-[#718086] cursor-not-allowed'
                : 'bg-[#182229] text-[#e8edf2] hover:bg-[#253139]'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>PREVIOUS</span>
          </button>

          <div className="flex items-center gap-1.5">
            {STEPS.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setCurrentStepIndex(idx)}
                title={s.title}
                className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
                  idx === currentStepIndex
                    ? 'bg-[#6fa8dc] scale-125'
                    : 'bg-[#253139] hover:bg-[#718086]'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="px-4 py-1.5 text-xs font-bold rounded bg-[#6fa8dc] text-[#07090b] hover:bg-[#9cc7ed] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>{currentStepIndex === STEPS.length - 1 ? 'FINISH TOUR' : 'NEXT STEP'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
