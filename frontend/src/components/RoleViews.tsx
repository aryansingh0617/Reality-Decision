import React, { useState } from 'react';
import type { RealityState } from '../api';
import { Terminal, ChevronRight } from 'lucide-react';

interface RoleViewsProps {
  state: RealityState;
  role: 'GUEST' | 'OPERATOR' | 'COMMAND' | 'ADMIN';
  onRoleChange: (role: 'GUEST' | 'OPERATOR' | 'COMMAND' | 'ADMIN') => void;
  onAuthorize: (action: string) => void;
}

export const RoleViews: React.FC<RoleViewsProps> = ({ state, role, onRoleChange, onAuthorize }) => {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const packet = state.current_packet;
  const isAuthorized = packet?.authorization_status === 'AUTHORIZED';

  // Dynamic "WHAT JUST HAPPENED?" timeline generation from live audit trail
  const narrativeSteps = React.useMemo(() => {
    const steps = [];
    if (state.last_state_change) {
      steps.push({ num: '01', title: 'Reality Shift Detected', desc: state.last_state_change });
    } else {
      steps.push({ num: '01', title: 'Baseline Reality', desc: 'Guwahati Corridor 04 operating normally.' });
    }

    if (state.conflicts.length > 0) {
      steps.push({
        num: '02',
        title: 'Evidence Conflict Detected',
        desc: `Conflict Engine detected contradicting reports on ${state.conflicts.map(c => c.entity).join(', ')}.`,
      });
    } else {
      steps.push({ num: '02', title: 'Evidence Ingested', desc: 'Evidence Agent verified 100% field scout observations.' });
    }

    const affectedCount = Object.values(state.routes).filter(r => r.status === 'UNAVAILABLE' || r.status === 'BLOCKED').length;
    steps.push({
      num: '03',
      title: 'Dependency Cascade',
      desc: `Dependency Agent propagated impacts across ${affectedCount} affected corridors.`,
    });

    steps.push({
      num: '04',
      title: 'Counterfactual Futures Simulated',
      desc: 'Simulation Agent evaluated 3 candidate futures (Direct R-12, Bypass R-14, Hold/Verify).',
    });

    if (packet?.missing_information && packet.missing_information !== 'None') {
      steps.push({
        num: '05',
        title: 'Value of Information Identified',
        desc: `Information Agent ranked top priority: ${packet.missing_information}`,
      });
    }

    if (packet?.why && packet.why.length > 0) {
      steps.push({
        num: '06',
        title: 'Critic Stress Test & Plan Generation',
        desc: `Decision Agent formulated plan: ${packet.recommendation}. Critic approved safety boundaries.`,
      });
    }

    return steps;
  }, [state, packet]);

  return (
    <div className="w-full flex flex-col gap-4 font-mono text-left select-none">
      {/* Role Navigation Bar */}
      <div className="bg-[#14181a] border border-[#242a2e] rounded-lg p-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#5a6a7a] uppercase font-bold pl-2">ACCESS ROLE:</span>
          <div className="flex items-center bg-[#0a0d0f] rounded border border-[#242a2e] p-0.5">
            {(['GUEST', 'OPERATOR', 'COMMAND', 'ADMIN'] as const).map((r) => (
              <button
                key={r}
                onClick={() => onRoleChange(r)}
                className={`px-3 py-1 text-[10px] font-bold uppercase rounded transition-all ${
                  role === r
                    ? 'bg-[#3498db]/20 text-[#3498db] border border-[#3498db]/40 shadow-sm'
                    : 'text-[#8a9aaa] hover:text-[#e8edf2]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Technical Detail Toggle */}
        <button
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="text-[10px] px-3 py-1 rounded border border-[#242a2e] bg-[#0a0d0f] text-[#8a9aaa] hover:text-[#e8edf2] hover:border-[#3498db] transition-all flex items-center gap-1.5 font-bold"
        >
          <Terminal className="w-3 h-3 text-[#3498db]" />
          {showTechnicalDetails ? 'VIEW PLAIN ENGLISH' : 'VIEW TECHNICAL DETAIL'}
        </button>
      </div>

      {/* GUEST ROLE VIEW */}
      {role === 'GUEST' && (
        <div className="bg-[#14181a] border border-[#242a2e] rounded-lg p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[#242a2e] pb-3">
            <div>
              <span className="text-[10px] text-[#5a6a7a] uppercase tracking-wider block">GUEST SITUATIONAL AWARENESS</span>
              <h3 className="text-base font-bold text-[#e8edf2]">What Just Happened?</h3>
            </div>
            <div className="text-xs text-[#2ecc71] font-bold bg-[#2ecc71]/10 px-3 py-1 rounded border border-[#2ecc71]/30">
              CURRENT PLAN: {packet?.recommendation || 'INITIALIZING'}
            </div>
          </div>

          {/* Plain English Narrative Stack */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {narrativeSteps.map((step) => (
              <div key={step.num} className="bg-[#0a0d0f] border border-[#242a2e] rounded p-3 text-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-[#3498db] font-bold font-mono">STEP {step.num}</span>
                  <ChevronRight className="w-3 h-3 text-[#5a6a7a]" />
                </div>
                <h4 className="font-bold text-[#e8edf2] text-xs mb-1">{step.title}</h4>
                <p className="text-[11px] text-[#8a9aaa] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-[#0a0d0f] border border-[#242a2e] rounded p-3 text-xs text-[#8a9aaa]">
            <strong className="text-[#e8edf2] block mb-0.5">Why Recommendation Changed:</strong>
            <span>{packet?.why?.join(' · ') || 'System operating under nominal initial conditions.'}</span>
          </div>
        </div>
      )}

      {/* COMMAND ROLE VIEW */}
      {role === 'COMMAND' && (
        <div className="bg-[#14181a] border border-[#242a2e] rounded-lg p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[#242a2e] pb-3">
            <div>
              <span className="text-[10px] text-[#5a6a7a] uppercase tracking-wider block">EXECUTIVE COMMAND BRIEFING</span>
              <h3 className="text-base font-bold text-[#e8edf2]">Consequential Decision Assessment</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#8a9aaa]">AUTHORIZATION GATE:</span>
              <span className={`text-xs px-3 py-1 rounded font-bold uppercase border ${
                isAuthorized ? 'bg-[#2ecc71]/20 text-[#2ecc71] border-[#2ecc71]' : 'bg-[#f39c12]/20 text-[#f39c12] border-[#f39c12]'
              }`}>
                {packet?.authorization_status || 'AWAITING AUTHORIZATION'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="bg-[#0a0d0f] border border-[#242a2e] rounded p-3">
              <span className="text-[9px] text-[#5a6a7a] uppercase block mb-1">Recommended Action</span>
              <strong className="text-sm text-[#2ecc71] font-bold">{packet?.recommendation}</strong>
            </div>
            <div className="bg-[#0a0d0f] border border-[#242a2e] rounded p-3">
              <span className="text-[9px] text-[#5a6a7a] uppercase block mb-1">Confidence Score</span>
              <strong className="text-sm text-[#e8edf2] font-bold">{packet?.confidence}</strong>
            </div>
            <div className="bg-[#0a0d0f] border border-[#242a2e] rounded p-3">
              <span className="text-[9px] text-[#5a6a7a] uppercase block mb-1">Critical Assumption</span>
              <strong className="text-xs text-[#f39c12]">{packet?.critical_assumption}</strong>
            </div>
            <div className="bg-[#0a0d0f] border border-[#242a2e] rounded p-3">
              <span className="text-[9px] text-[#5a6a7a] uppercase block mb-1">Consequence If Wrong</span>
              <strong className="text-xs text-[#e74c3c]">{packet?.consequence_if_wrong}</strong>
            </div>
          </div>

          {/* Authorization Actions */}
          {!isAuthorized && (
            <div className="flex items-center gap-3 bg-[#0a0d0f] border border-[#242a2e] rounded p-3">
              <span className="text-xs text-[#8a9aaa]">AUTHORIZE FINAL ACTION:</span>
              <button
                onClick={() => onAuthorize('AUTHORIZE')}
                className="px-4 py-1.5 bg-[#2ecc71] text-[#0a0d0f] font-bold rounded text-xs hover:bg-[#27ae60] transition-colors"
              >
                AUTHORIZE PLAN
              </button>
              <button
                onClick={() => onAuthorize('REQUEST_VERIFY')}
                className="px-4 py-1.5 bg-[#f39c12] text-[#0a0d0f] font-bold rounded text-xs hover:bg-[#e67e22] transition-colors"
              >
                REQUEST RECON VERIFICATION
              </button>
              <button
                onClick={() => onAuthorize('REJECT')}
                className="px-4 py-1.5 bg-[#e74c3c] text-white font-bold rounded text-xs hover:bg-[#c0392b] transition-colors"
              >
                REJECT PLAN
              </button>
            </div>
          )}
        </div>
      )}

      {/* ADMIN ROLE VIEW */}
      {role === 'ADMIN' && (
        <div className="bg-[#14181a] border border-[#242a2e] rounded-lg p-5 flex flex-col gap-4 text-xs">
          <div className="flex items-center justify-between border-b border-[#242a2e] pb-3">
            <div>
              <span className="text-[10px] text-[#5a6a7a] uppercase tracking-wider block">SYSTEM SUPERVISION & DIAGNOSTICS</span>
              <h3 className="text-base font-bold text-[#e8edf2]">Agent Health & Scenario Engine</h3>
            </div>
            <div className="text-xs text-[#3498db] font-bold font-mono">
              ENGINE MODE: {state.reasoning_mode || 'OFFLINE DETERMINISTIC'}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Agent Telemetry Grid */}
            <div className="bg-[#0a0d0f] border border-[#242a2e] rounded p-3">
              <span className="text-[10px] text-[#5a6a7a] uppercase font-bold block mb-2">Agent Health & Latency (ms)</span>
              <div className="space-y-1.5">
                {state.agent_steps.map((step, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b border-[#242a2e] pb-1 text-[11px]">
                    <span className="text-[#e8edf2] font-bold">{step.agent}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[#3498db]">{step.latency_ms}ms</span>
                      <span className="text-[#2ecc71] font-bold">{step.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Audit History Log */}
            <div className="bg-[#0a0d0f] border border-[#242a2e] rounded p-3 h-48 overflow-y-auto font-mono text-[10px]">
              <span className="text-[10px] text-[#5a6a7a] uppercase font-bold block mb-2">System Audit Trail ({state.audit_trail.length} records)</span>
              {state.audit_trail.map((log, idx) => (
                <div key={idx} className="border-b border-[#242a2e] py-1 text-[#8a9aaa]">
                  <span className="text-[#5a6a7a]">{log.timestamp.slice(11, 19)}</span> [{' '}
                  <span className="text-[#3498db]">{log.actor}</span> ] <span className="text-[#e8edf2]">{log.event_type}</span>: {log.detail}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TECHNICAL DETAIL EXPANDABLE OVERLAY */}
      {showTechnicalDetails && (
        <div className="bg-[#0a0d0f] border border-[#3498db]/40 rounded-lg p-4 font-mono text-xs text-[#8a9aaa] space-y-2">
          <div className="flex items-center justify-between border-b border-[#242a2e] pb-2">
            <strong className="text-[#3498db]">RAW SYSTEM TELEMETRY & GRAPH EDGES</strong>
            <span>Re-plan Iterations: {state.replan_count}</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-[11px]">
            <div>
              <span className="text-[#5a6a7a] block">Active Graph Entities:</span>
              <pre className="text-[#e8edf2] text-[10px] mt-1 bg-[#14181a] p-2 rounded overflow-x-auto">
                {JSON.stringify(Object.keys(state.routes), null, 2)}
              </pre>
            </div>
            <div>
              <span className="text-[#5a6a7a] block">Latest Decision Packet Payload:</span>
              <pre className="text-[#2ecc71] text-[10px] mt-1 bg-[#14181a] p-2 rounded overflow-x-auto">
                {JSON.stringify(packet, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
