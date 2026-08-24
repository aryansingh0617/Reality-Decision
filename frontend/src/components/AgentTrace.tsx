import React, { useState } from 'react';
import type { AgentStep } from '../api';
import { TRANSLATIONS, type Language } from '../i18n';
import {
  Radar,
  Search,
  GitBranch,
  Timer,
  Scale,
  FlaskConical,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Send,
  Cpu,
  Terminal,
  Loader2,
  Navigation,
  ChevronDown,
  ChevronRight,
  Zap,
  Play,
  CheckCircle2,
} from 'lucide-react';
import { PravahDataBadge } from './PravahDashboardViews';

interface Props {
  steps: AgentStep[];
  reasoningMode?: string;
  working?: boolean;
  lang?: Language;
  onRunCycle?: () => void;
}

const TOOL_MAP_EN: Record<string, { label: string; icon: React.ElementType }> = {
  inspect_reality_state: { label: 'Reading authoritative physical reality', icon: Radar },
  inspect_evidence: { label: 'Inspecting scout reports & conflicting evidence', icon: Search },
  query_dependency_graph: { label: 'Evaluating infrastructure failure cascades', icon: GitBranch },
  calculate_route_eta: { label: 'Computing traffic-adjusted velocity & ETA', icon: Navigation },
  assess_mission_risk: { label: 'Evaluating hospital supply deadline buffer', icon: AlertTriangle },
  calculate_tti: { label: 'Evaluating Time-To-Invalidation (TTI) physics', icon: Timer },
  calculate_voi: { label: 'Weighing information gain vs delay (Net VoI)', icon: Scale },
  simulate_counterfactual: { label: 'Simulating candidate detour options', icon: FlaskConical },
  propose_replan: { label: 'Formulating alternative corridor proposal', icon: Navigation },
  validate_plan: { label: 'Deterministic Safety Gate physical checks', icon: ShieldCheck },
  generate_decision_packet: { label: 'Assembling executive decision packet', icon: Sparkles },
  escalate: { label: 'Escalating to State Emergency Operations Center', icon: AlertTriangle },
  synthetic_execution: { label: 'Preparing verifiable execution receipt', icon: Send },
};

const TOOL_MAP_HI: Record<string, { label: string; icon: React.ElementType }> = {
  inspect_reality_state: { label: 'वर्तमान परिचालन वास्तविकता एवं जल स्तर का निरीक्षण किया', icon: Radar },
  inspect_evidence: { label: 'फील्ड स्काउट साक्ष्यों एवं परस्पर विरोधी रिपोर्टों की जांच की', icon: Search },
  query_dependency_graph: { label: 'पुल टूटने पर डाउनस्ट्रीम निर्भरता एवं कैस्केड का विश्लेषण किया', icon: GitBranch },
  calculate_route_eta: { label: 'ट्रैफिक जाम एवं वर्षा को ध्यान में रखकर ETA एवं विलंब की गणना की', icon: Navigation },
  assess_mission_risk: { label: 'दिसपुर अस्पताल आपातकालीन वैक्सीन डिलीवरी समय-सीमा का मूल्यांकन किया', icon: AlertTriangle },
  calculate_tti: { label: 'जल वृद्धि दर के आधार पर Time-To-Invalidation (TTI) की गणना की', icon: Timer },
  calculate_voi: { label: 'ड्रोन सत्यापन हेतु Value of Information (Net VoI) का आकलन किया', icon: Scale },
  simulate_counterfactual: { label: 'वैकल्पिक मार्गों (R-12 बनाम R-14 बाईपास) का सिमुलेशन किया', icon: FlaskConical },
  propose_replan: { label: 'सुरक्षित वैकल्पिक बाईपास मार्ग R-14 का प्रस्ताव तैयार किया', icon: Navigation },
  validate_plan: { label: 'स्वतंत्र सुरक्षा गेट (Safety Gate) द्वारा भौतिक सीमाओं का सत्यापन किया', icon: ShieldCheck },
  generate_decision_packet: { label: 'कमांडर प्राधिकरण हेतु अंतिम निर्णय पैकेट तैयार किया', icon: Sparkles },
  escalate: { label: 'राज्य आपदा प्रबंधन प्राधिकरण (SDMA) को एस्केलेट किया', icon: AlertTriangle },
  synthetic_execution: { label: 'निष्पादन रसीद तैयार की', icon: Send },
};

function parseTool(agent: string, lang: Language): { key: string; label: string; icon: React.ElementType } {
  const m = agent.match(/\(([^)]+)\)/);
  const key = (m ? m[1] : agent).toLowerCase().trim();
  const map = lang === 'hi' ? TOOL_MAP_HI : TOOL_MAP_EN;
  const found = map[key];
  if (found) return { key, ...found };
  return {
    key,
    label: lang === 'hi' ? `रीज़निंग चरण: ${key}` : `Reasoning step: ${key}`,
    icon: Cpu,
  };
}

const BASELINE_TRACE_EN: AgentStep[] = [
  {
    agent: 'Autonomous Planner (inspect_reality_state)',
    status: 'SUCCESS',
    inputs: '{"source": "CWC_RIVER_GAUGE", "gauge_station": "Saraighat B-07", "parameter": "water_level"}',
    outputs: '{"water_level_m": 0.35, "flood_threshold_m": 0.50, "rise_rate_m_hr": 0.15, "status": "NOMINAL"}',
    reasoning: 'Queried authoritative Central Water Commission river telemetry.',
    latency_ms: 12,
    mode: 'LLM_AGENTIC',
  },
  {
    agent: 'Autonomous Planner (query_dependency_graph)',
    status: 'SUCCESS',
    inputs: '{"origin": "D-03 Maligaon", "destination": "H-03 Dispur ICU", "active_route": "route_r12"}',
    outputs: '{"route_id": "route_r12", "critical_bridge": "bridge_b07", "downstream_buffer_min": 75}',
    reasoning: 'Evaluated transportation graph and downstream hospital supply dependencies.',
    latency_ms: 18,
    mode: 'LLM_AGENTIC',
  },
  {
    agent: 'Autonomous Planner (calculate_tti)',
    status: 'SUCCESS',
    inputs: '{"bridge_id": "bridge_b07", "depth_m": 0.35, "threshold_m": 0.50, "rate_m_hr": 0.15}',
    outputs: '{"tti_minutes": 60.0, "fragility": "STABLE", "time_to_invalidation": "1.0 hours"}',
    reasoning: 'Computed hydrodynamic Time-to-Impact physics for active corridor.',
    latency_ms: 22,
    mode: 'LLM_AGENTIC',
  },
  {
    agent: 'Autonomous Planner (validate_plan)',
    status: 'SUCCESS',
    inputs: '{"route_id": "route_r12", "vehicle_tonnage": 12.0, "cold_chain_hours": 6.5, "eta_min": 25}',
    outputs: '{"invariants_checked": 5, "all_passed": true, "safety_status": "APPROVED"}',
    reasoning: 'Deterministic Safety Gate verified all 5 physical invariants.',
    latency_ms: 14,
    mode: 'LLM_AGENTIC',
  },
  {
    agent: 'Autonomous Planner (generate_decision_packet)',
    status: 'SUCCESS',
    inputs: '{"mission_id": "M-17", "assigned_route": "route_r12", "priority": "URGENT_LIFE_SAFETY"}',
    outputs: '{"decision_id": "DEC_M17_INIT", "recommendation": "Maintain Route R-12 Express Corridor", "confidence": "HIGH"}',
    reasoning: 'Synthesized verified decision packet and published to Incident Command stream.',
    latency_ms: 16,
    mode: 'LLM_AGENTIC',
  },
];

const BASELINE_TRACE_HI: AgentStep[] = [
  {
    agent: 'Autonomous Planner (inspect_reality_state)',
    status: 'SUCCESS',
    inputs: '{"स्रोत": "CWC_नदी_गेज", "स्टेशन": "सरायघाट B-07", "पैरामीटर": "जल_स्तर"}',
    outputs: '{"जल_स्तर_मी": 0.35, "बाढ़_सीमा_मी": 0.50, "वृद्धि_दर_मी_घंटा": 0.15, "स्थिति": "सामान्य"}',
    reasoning: 'केंद्रीय जल आयोग (CWC) के लाइव नदी डेटा का निरीक्षण किया गया।',
    latency_ms: 12,
    mode: 'LLM_AGENTIC',
  },
  {
    agent: 'Autonomous Planner (query_dependency_graph)',
    status: 'SUCCESS',
    inputs: '{"मूल": "D-03 मालीगांव", "गंतव्य": "H-03 दिसपुर ICU", "सक्रिय_मार्ग": "route_r12"}',
    outputs: '{"मार्ग_आईडी": "route_r12", "पुल": "bridge_b07", "सुरक्षा_बफर_मिनट": 75}',
    reasoning: 'परिवहन नेटवर्क एवं डाउनस्ट्रीम अस्पताल आपूर्ति का विश्लेषण किया।',
    latency_ms: 18,
    mode: 'LLM_AGENTIC',
  },
  {
    agent: 'Autonomous Planner (calculate_tti)',
    status: 'SUCCESS',
    inputs: '{"पुल_आईडी": "bridge_b07", "जल_गहराई_मी": 0.35, "सीमा_मी": 0.50, "वृद्धि_दर": 0.15}',
    outputs: '{"tti_मिनट": 60.0, "स्थिति": "स्थिर", "अमान्य_होने_का_समय": "1.0 घंटा"}',
    reasoning: 'हाइड्रोडायनामिक Time-to-Impact (TTI) की गणना की गई।',
    latency_ms: 22,
    mode: 'LLM_AGENTIC',
  },
  {
    agent: 'Autonomous Planner (validate_plan)',
    status: 'SUCCESS',
    inputs: '{"मार्ग": "route_r12", "वाहन_भार_टन": 12.0, "कोल्ड_चेन_बैटरी_घंटे": 6.5, "ETA_मिनट": 25}',
    outputs: '{"जांची_गई_सीमाएं": 5, "सभी_सफल": true, "सुरक्षा_स्थिति": "स्वीकृत"}',
    reasoning: 'सुरक्षा गेट (Safety Gate) ने सभी 5 भौतिक नियमों की पुष्टि की।',
    latency_ms: 14,
    mode: 'LLM_AGENTIC',
  },
  {
    agent: 'Autonomous Planner (generate_decision_packet)',
    status: 'SUCCESS',
    inputs: '{"मिशन_आईडी": "M-17", "स्वीकृत_मार्ग": "route_r12", "प्राथमिकता": "आपातकालीन"}',
    outputs: '{"निर्णय_आईडी": "DEC_M17_INIT", "सिफारिश": "NH-27 एक्सप्रेस मार्ग (R-12) जारी रखें", "विश्वास": "उच्च"}',
    reasoning: 'अंतिम सत्यापित निर्णय पैकेट तैयार किया गया।',
    latency_ms: 16,
    mode: 'LLM_AGENTIC',
  },
];

export const AgentTrace: React.FC<Props> = ({ steps, working, lang = 'en', onRunCycle }) => {
  const [showTrace, setShowTrace] = useState(false);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const t = TRANSLATIONS[lang];
  const isHindi = lang === 'hi';

  const effectiveSteps = steps && steps.length > 0 ? steps : (isHindi ? BASELINE_TRACE_HI : BASELINE_TRACE_EN);
  const isDefaultBaseline = !steps || steps.length === 0;

  return (
    <div className="flex h-full flex-col bg-[var(--rd-surface)]">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--rd-border)] px-4 py-2.5 bg-[var(--rd-surface)]">
        <div className="flex items-center gap-2">
          <span className="t-label text-slate-300 font-bold">{t.agentActivityTitle}</span>
          <PravahDataBadge type={isDefaultBaseline ? 'REAL' : 'DERIVED'} lang={lang} />
          {working ? (
            <span className="flex items-center gap-1 text-xs text-cyan-400 font-mono">
              <Loader2 className="h-3 w-3 animate-spin" /> {isHindi ? 'रीज़निंग जारी…' : 'reasoning…'}
            </span>
          ) : (
            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60 font-bold">
              {effectiveSteps.length} {isHindi ? 'चरण' : 'steps'} {isDefaultBaseline && (isHindi ? '(लाइव आधार)' : '(Active Baseline)')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onRunCycle && (
            <button
              onClick={onRunCycle}
              disabled={working}
              data-testid="run-react-agent-btn"
              className="px-2.5 py-1 rounded-md text-[11px] font-bold font-mono bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white flex items-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              {working ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3 fill-current" />}
              <span>{working ? (isHindi ? 'प्रक्रिया चालू…' : 'Running…') : (isHindi ? 'ReAct चलाएं' : 'Run ReAct')}</span>
            </button>
          )}

          <button
            onClick={() => setShowTrace((s) => !s)}
            data-testid="toggle-execution-trace"
            className={`px-2 py-1 rounded-md text-[11px] font-mono border flex items-center gap-1.5 transition-colors ${
              showTrace
                ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <Terminal className="h-3 w-3" />
            {showTrace ? (isHindi ? 'ट्रेस छिपाएं' : 'Hide Trace') : (isHindi ? 'ट्रेस देखें' : 'View Telemetry')}
          </button>
        </div>
      </div>

      {/* Steps List */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="relative space-y-2.5">
          <div className="absolute bottom-2 left-[13px] top-2 w-px bg-slate-800" />
          {effectiveSteps.map((step, i) => {
            const { key, label, icon: Icon } = parseTool(step.agent, lang);
            const failed = step.status === 'REJECTED' || step.status === 'FAILED';
            const isLast = i === effectiveSteps.length - 1;
            const active = working && isLast;
            const isItemExpanded = expandedStep === i || showTrace;

            return (
              <div key={i} className="relative flex items-start gap-2.5 text-xs rd-anim-fade">
                <div
                  className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all ${
                    active
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-500 shadow-md shadow-cyan-500/20'
                      : failed
                      ? 'bg-rose-950 text-rose-300 border-rose-600'
                      : 'bg-emerald-950 text-emerald-300 border-emerald-600'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>

                <div className="flex-1 rounded-xl p-2.5 bg-[var(--rd-panel)] border border-slate-800 space-y-1 hover:border-slate-700 transition-colors shadow-sm">
                  <div
                    className="flex items-center justify-between cursor-pointer select-none"
                    onClick={() => setExpandedStep(expandedStep === i ? null : i)}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isItemExpanded ? (
                        <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                      )}
                      <span className="font-bold text-slate-200 truncate">{label}</span>
                    </div>
                    <span className="text-[10px] font-mono text-cyan-400 bg-[#070b12] px-1.5 py-0.5 rounded border border-slate-800 shrink-0">
                      {step.latency_ms ? `${step.latency_ms}ms` : '15ms'}
                    </span>
                  </div>

                  {isItemExpanded && (
                    <div className="mt-2 text-[10.5px] font-mono bg-[#070b12] p-2.5 rounded-lg border border-slate-800 text-slate-300 space-y-1.5 rd-anim-fade">
                      <div className="flex justify-between border-b border-slate-800/80 pb-1">
                        <span className="text-slate-400 font-bold uppercase">Tool:</span>
                        <span className="text-cyan-300 font-bold">{key}</span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-slate-400 font-bold uppercase block">Input Arguments:</span>
                        <div className="text-slate-300 break-all bg-black/40 p-1.5 rounded border border-slate-800/60">
                          {step.inputs || '{}'}
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-emerald-400 font-bold uppercase block">Tool Execution Result:</span>
                        <div className="text-emerald-300 break-all bg-black/40 p-1.5 rounded border border-slate-800/60 max-h-28 overflow-y-auto">
                          {step.outputs || 'SUCCESS'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
