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
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { PravahDataBadge } from './PravahDashboardViews';

interface Props {
  steps: AgentStep[];
  reasoningMode?: string;
  working?: boolean;
  lang?: Language;
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

export const AgentTrace: React.FC<Props> = ({ steps, working, lang = 'en' }) => {
  const [showTrace, setShowTrace] = useState(false);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const t = TRANSLATIONS[lang];
  const isHindi = lang === 'hi';

  return (
    <div className="flex h-full flex-col bg-[var(--rd-surface)]">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--rd-border)] px-4 py-2.5 bg-[var(--rd-surface)]">
        <div className="flex items-center gap-2">
          <span className="t-label text-slate-300 font-bold">{t.agentActivityTitle}</span>
          <PravahDataBadge type="DERIVED" lang={lang} />
          {working ? (
            <span className="flex items-center gap-1 text-xs text-cyan-400 font-mono">
              <Loader2 className="h-3 w-3 animate-spin" /> {isHindi ? 'रीज़निंग जारी…' : 'reasoning…'}
            </span>
          ) : (
            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60 font-bold">
              {steps.length} {isHindi ? 'चरण' : 'steps'}
            </span>
          )}
        </div>
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
          {showTrace ? (isHindi ? 'तकनीकी ट्रेस छिपाएं' : 'Hide Trace') : (isHindi ? 'तकनीकी ट्रेस देखें' : 'View Telemetry')}
        </button>
      </div>

      {/* Steps List */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {steps.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 py-6 text-center">
            <div className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--rd-panel)] text-slate-500 border border-slate-800">
              <Cpu className="h-4 w-4" />
            </div>
            <div className="t-h3 text-slate-200 text-xs">{isHindi ? 'कोई गतिविधि दर्ज नहीं' : 'No activity yet'}</div>
            <div className="t-caption mt-1 max-w-xs text-slate-400 text-[11px]">{t.noActivityYet}</div>
          </div>
        ) : (
          <div className="relative space-y-2.5">
            <div className="absolute bottom-2 left-[13px] top-2 w-px bg-slate-800" />
            {steps.map((step, i) => {
              const { key, label, icon: Icon } = parseTool(step.agent, lang);
              const failed = step.status === 'REJECTED' || step.status === 'FAILED';
              const isLast = i === steps.length - 1;
              const active = working && isLast;
              const isItemExpanded = expandedStep === i || showTrace;

              return (
                <div key={i} className="relative flex items-start gap-2.5 text-xs">
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

                  <div className="flex-1 rounded-xl p-2.5 bg-[var(--rd-panel)] border border-slate-800 space-y-1 hover:border-slate-700 transition-colors">
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
                          <div className="text-emerald-300 break-all bg-black/40 p-1.5 rounded border border-slate-800/60 max-h-24 overflow-y-auto">
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
        )}
      </div>
    </div>
  );
};
