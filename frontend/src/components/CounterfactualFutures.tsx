import React, { useState } from 'react';
import { GitBranch, Clock } from 'lucide-react';

interface BranchData {
  name: string;
  recommendation: string;
  route_id: string;
  delay_min: number;
  branch_status: string;
  score: number;
}

interface CounterfactualFuturesProps {
  branches?: BranchData[];
  packet?: any | null;
  onSelectBranch?: (branch: BranchData) => void;
}

export const CounterfactualFutures: React.FC<CounterfactualFuturesProps> = ({
  branches: rawBranches,
  packet,
  onSelectBranch,
}) => {
  const branches = rawBranches || (packet?.counterfactual_branches || []);
  const [selectedBranchName, setSelectedBranchName] = useState<string | null>(
    branches[0]?.name || null
  );

  const activeBranch = branches.find((b: any) => b.name === selectedBranchName) || branches[0];

  return (
    <div className="panel font-mono text-left flex flex-col h-full">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <GitBranch className="w-3.5 h-3.5 text-[#6fa8dc]" />
          <span className="panel-title">Counterfactual Candidate Futures</span>
        </div>
        <span className="panel-tag">{branches.length} SIMULATED BRANCHES</span>
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Branch Selection List */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {branches.map((b: any) => {
            const isSelected = b.name === (selectedBranchName || branches[0]?.name);
            const isRec = b.branch_status === 'RECOMMENDED';
            const isUncertain = b.branch_status === 'UNCERTAIN';

            return (
              <button
                key={b.name}
                onClick={() => {
                  setSelectedBranchName(b.name);
                  if (onSelectBranch) onSelectBranch(b);
                }}
                className={`border rounded-lg p-3 text-left transition-all relative overflow-hidden ${
                  isSelected
                    ? 'border-[#6fa8dc] bg-[#111a1f] ring-1 ring-[#6fa8dc]/40'
                    : 'border-[#253139] bg-[#0a0f12] hover:border-[#3b4d56]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-[#f1f3f0] truncate">{b.name}</span>
                  <span
                    className={`text-[8px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${
                      isRec
                        ? 'bg-[#65c89a]/20 text-[#65c89a]'
                        : isUncertain
                        ? 'bg-[#e7a23b]/20 text-[#e7a23b]'
                        : 'bg-[#e45b55]/20 text-[#e45b55]'
                    }`}
                  >
                    {b.branch_status}
                  </span>
                </div>

                <div className="text-[10px] text-[#aab5b8] truncate">{b.recommendation}</div>
                
                <div className="mt-2 flex items-center justify-between text-[9px] text-[#718086]">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#718086]" /> +{b.delay_min}m Delay
                  </span>
                  <span>Score: {(b.score * 100).toFixed(0)}%</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Branch Detailed Stress-Test Inspection Card */}
        {activeBranch && (
          <div className="border border-[#253139] bg-[#0a0f12] rounded-lg p-4 mt-1 flex flex-col gap-2.5">
            <div className="flex items-center justify-between border-b border-[#253139] pb-2">
              <div>
                <span className="text-[9px] text-[#718086] uppercase tracking-wider">Candidate Future Analysis</span>
                <h4 className="text-sm font-bold text-[#f1f3f0]">{activeBranch.name}</h4>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-[#718086] uppercase">Stress Score</span>
                <div className="text-sm font-bold text-[#6fa8dc]">{(activeBranch.score * 100).toFixed(0)} / 100</div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[9px] text-[#718086] block uppercase">Target Route</span>
                <strong className="text-[#f1f3f0]">{activeBranch.route_id || 'N/A'}</strong>
              </div>
              <div>
                <span className="text-[9px] text-[#718086] block uppercase">Estimated Latency</span>
                <strong className="text-[#f1f3f0]">+{activeBranch.delay_min} min</strong>
              </div>
              <div>
                <span className="text-[9px] text-[#718086] block uppercase">Branch Status</span>
                <strong className={activeBranch.branch_status === 'RECOMMENDED' ? 'text-[#65c89a]' : 'text-[#e7a23b]'}>
                  {activeBranch.branch_status}
                </strong>
              </div>
              <div>
                <span className="text-[9px] text-[#718086] block uppercase">Decision Window</span>
                <strong className="text-[#65c89a]">Feasible (Within 30m)</strong>
              </div>
            </div>

            <p className="text-xs text-[#aab5b8] bg-[#0d1418] border border-[#253139] rounded p-2.5 leading-relaxed">
              <strong>Simulated Outcome:</strong> {activeBranch.recommendation}. Evaluated under synthetic stress testing for downstream asset capacity, weather delays, and evidence confidence.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
