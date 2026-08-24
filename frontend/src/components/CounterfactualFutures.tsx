import React, { useState } from 'react';
import { GitFork, Clock, TrendingUp } from 'lucide-react';
import { Badge, SectionLabel } from './ui';
import { TRANSLATIONS, translateDynamicText, type Language } from '../i18n';

interface BranchData {
  name: string;
  recommendation: string;
  route_id: string;
  delay_min: number;
  branch_status: string;
  score: number;
}

interface Props {
  branches?: BranchData[];
  packet?: any | null;
  onSelectBranch?: (branch: BranchData) => void;
  lang?: Language;
}

const DEFAULT_FALLBACK_BRANCHES_EN: BranchData[] = [
  {
    name: 'Branch A: Direct R-12 Corridor',
    recommendation: 'Fastest evacuation route via Bridge B-07 (15 min ETA)',
    route_id: 'route_r12',
    delay_min: 20,
    branch_status: 'UNCERTAIN',
    score: 0.44,
  },
  {
    name: 'Branch B: Safe Bypass Detour (R-14)',
    recommendation: 'Bypass corridor with 15-passenger truck capacity (35 min ETA)',
    route_id: 'route_r14',
    delay_min: 40,
    branch_status: 'UNCERTAIN',
    score: 0.68,
  },
  {
    name: 'Branch C: Hold & Verification Wait',
    recommendation: 'Hold at Shelter S-04 while dispatching recon drone verification',
    route_id: 'shelter_s04',
    delay_min: 25,
    branch_status: 'UNCERTAIN',
    score: 0.50,
  },
];

const DEFAULT_FALLBACK_BRANCHES_HI: BranchData[] = [
  {
    name: 'शाखा A: सीधा गलियारा (मार्ग R-12)',
    recommendation: 'सरायघाट पुल B-07 द्वारा सबसे तेज मार्ग (15 मिनट ETA)',
    route_id: 'route_r12',
    delay_min: 20,
    branch_status: 'अनिश्चित (UNCERTAIN)',
    score: 0.44,
  },
  {
    name: 'शाखा B: सुरक्षित बाईपास डायवर्जन (मार्ग R-14)',
    recommendation: 'सुरक्षित बाईपास गलियारा 4.5T रीफर वैन क्षमता सहित (35 मिनट ETA)',
    route_id: 'route_r14',
    delay_min: 40,
    branch_status: 'अनिश्चित (UNCERTAIN)',
    score: 0.68,
  },
  {
    name: 'शाखा C: रोकें एवं ड्रोन सत्यापन प्रतीक्षा',
    recommendation: 'राहत आश्रय S-04 पर रोकें और टोही ड्रोन द्वारा साक्ष्य सत्यापित करें',
    route_id: 'shelter_s04',
    delay_min: 25,
    branch_status: 'अनिश्चित (UNCERTAIN)',
    score: 0.50,
  },
];

export const CounterfactualFutures: React.FC<Props> = ({
  branches: rawBranches,
  packet,
  onSelectBranch,
  lang = 'en',
}) => {
  const t = TRANSLATIONS[lang];
  const isHindi = lang === 'hi';

  const defaultBranches = isHindi ? DEFAULT_FALLBACK_BRANCHES_HI : DEFAULT_FALLBACK_BRANCHES_EN;
  const branchList = rawBranches && rawBranches.length > 0
    ? rawBranches
    : packet?.counterfactual_branches && packet.counterfactual_branches.length > 0
    ? packet.counterfactual_branches
    : defaultBranches;

  const branches: BranchData[] = branchList;
  const [selected, setSelected] = useState<string | null>(branches[0]?.name || null);
  const active = branches.find((b) => b.name === selected) || branches[0];

  const tone = (s: string) => {
    if (s.includes('RECOMMENDED') || s.includes('अनुशंसित')) return 'success';
    if (s.includes('UNCERTAIN') || s.includes('अनिश्चित')) return 'warn';
    return 'danger';
  };

  return (
    <div className="rd-panel flex h-full flex-col bg-[var(--rd-surface)] border border-[var(--rd-border)] rounded-xl shadow-lg">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--rd-border)] px-5 py-3.5 bg-[var(--rd-surface)]">
        <div className="flex items-center gap-2.5">
          <GitFork className="h-4 w-4 text-cyan-400" />
          <span className="t-h3 text-white font-bold">{t.counterfactualTitle}</span>
        </div>
        <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
          {branches.length} {t.counterfactualSimCount}
        </span>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <div>
          <SectionLabel className="mb-2.5 text-slate-300 font-bold">{t.counterfactualSimCond}</SectionLabel>
          <div className="grid gap-3 md:grid-cols-3 rd-stagger">
            {branches.map((b) => {
              const sel = b.name === (selected || branches[0]?.name);
              const branchName = translateDynamicText(b.name, lang);
              const branchRec = translateDynamicText(b.recommendation, lang);
              const branchStatus = translateDynamicText(b.branch_status, lang);

              return (
                <button
                  key={b.name}
                  onClick={() => {
                    setSelected(b.name);
                    onSelectBranch?.(b);
                  }}
                  className={`rd-card relative overflow-hidden p-4 text-left transition-all border rounded-xl bg-[var(--rd-panel)] ${
                    sel
                      ? 'border-cyan-500 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500'
                      : 'border-[var(--rd-border)] hover:border-slate-600'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="t-h3 truncate text-white font-bold">{branchName}</span>
                    <Badge tone={tone(b.branch_status)}>{branchStatus}</Badge>
                  </div>
                  <div className="text-xs text-slate-300 truncate font-sans">{branchRec}</div>
                  <div className="mt-3 flex items-center justify-between text-xs font-mono text-cyan-300">
                    <span className="flex items-center gap-1.5 text-amber-300">
                      <Clock className="h-3.5 w-3.5" /> +{b.delay_min} {isHindi ? 'मिनट विलंब' : 'min delay'}
                    </span>
                    <span className="font-bold text-emerald-400">{(b.score * 100).toFixed(0)}% {isHindi ? 'उपयुक्त' : 'fit'}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {active && (
          <div className="rd-card p-5 rd-anim-fade bg-[var(--rd-panel)] border border-[var(--rd-border)] rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
              <div>
                <SectionLabel className="text-slate-400 font-bold">{t.counterfactualOutcome}</SectionLabel>
                <div className="t-h2 mt-1 text-white font-bold">{translateDynamicText(active.name, lang)}</div>
              </div>
              <div className="text-right">
                <SectionLabel className="text-slate-400 font-bold">{t.counterfactualStressScore}</SectionLabel>
                <div className="t-num mt-1 flex items-center gap-1.5 text-[22px] font-bold text-cyan-400">
                  <TrendingUp className="h-5 w-5" />
                  {(active.score * 100).toFixed(0)}
                  <span className="text-xs font-mono text-slate-400">/100</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 bg-[#090d14] p-3.5 rounded-xl border border-slate-800 text-xs">
              <div>
                <div className="t-label text-slate-400">{t.counterfactualTargetRoute}</div>
                <div className="font-mono text-slate-200 font-bold mt-1">{active.route_id.toUpperCase()}</div>
              </div>
              <div>
                <div className="t-label text-slate-400">{t.counterfactualEstDelay}</div>
                <div className="font-mono text-rose-400 font-bold mt-1">+{active.delay_min} min</div>
              </div>
              <div>
                <div className="t-label text-slate-400">{t.counterfactualStatus}</div>
                <div className="font-mono text-amber-400 font-bold mt-1">{translateDynamicText(active.branch_status, lang)}</div>
              </div>
              <div>
                <div className="t-label text-slate-400">{t.counterfactualDecWindow}</div>
                <div className="font-mono text-emerald-400 font-bold mt-1">
                  {isHindi ? 'व्यावहारिक < 30 मिनट' : 'Feasible < 30m'}
                </div>
              </div>
            </div>

            <div className="rounded-xl p-3.5 bg-[#090d14]/70 border border-slate-800">
              <div className="t-label text-slate-400 mb-1">{t.counterfactualSimOutcome}</div>
              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                {translateDynamicText(active.recommendation, lang)}. {isHindi ? 'डाउनस्ट्रीम अस्पताल आपूर्ति बफर, जल वृद्धि दर एवं साक्ष्य विश्वसनीयता के आधार पर तनाव परीक्षण किया गया।' : 'Evaluated under stress testing for downstream capacity, weather delay, and evidence confidence.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
