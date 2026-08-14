import React from 'react';
import { Info, X, ArrowRight, Activity } from 'lucide-react';
import type { RealityState } from '../api';

export interface ControlHelpData {
  title: string;
  purpose: string;
  whenToUse: string;
  whatHappensUnderneath: string;
  whatChanges: string;
  whatToCheckAfter: string;
  isLlmDriven?: boolean;
}

export const CONTROL_HELP_REGISTRY: Record<string, ControlHelpData> = {
  'inject_b07': {
    title: 'INJECT B-07 FAILURE',
    purpose: 'Simulates high flood water submerging Bridge B-07.',
    whenToUse: 'Use to test how the system detects an infrastructure failure and adapts plans.',
    whatHappensUnderneath: 'Dispatches POST /api/inject with { event_id: "bridge_b07_failure" }. Sets B-07.status = UNAVAILABLE.',
    whatChanges: 'Node B-07 turns red, Route R-12 is marked BLOCKED, and AutonomousPlannerAgent wakes up.',
    whatToCheckAfter: 'Inspect the Multi-Agent Execution Grid and the Decision Packet for Route R-14 detour.',
    isLlmDriven: true,
  },
  'inject_weather': {
    title: 'INJECT WEATHER SEVERITY',
    purpose: 'Escalates regional monsoon rainfall severity to Level 4.',
    whenToUse: 'Use to evaluate how environmental deterioration impacts evacuation timing.',
    whatHappensUnderneath: 'Dispatches POST /api/inject with { event_id: "weather_severity_escalation" }.',
    whatChanges: 'Weather status updates to SEVERE, increasing risk scores on open mountain routes.',
    whatToCheckAfter: 'Check the Counterfactual Futures panel for updated branch risk scores.',
    isLlmDriven: false,
  },
  'reset_mission': {
    title: 'RESET MISSION',
    purpose: 'Restores the operational environment to baseline nominal state.',
    whenToUse: 'Use to clear disruptions and restart the scenario from scratch.',
    whatHappensUnderneath: 'Dispatches POST /api/initialize (or reset endpoint) to re-instantiate nominal state in memory.',
    whatChanges: 'Restores B-07 to AVAILABLE, R-12 to NOMINAL, clears alerts, and resets replan count to 0.',
    whatToCheckAfter: 'Verify that the Dependency Graph returns to green status.',
    isLlmDriven: false,
  },
  'authorize_plan': {
    title: 'AUTHORIZE PLAN',
    purpose: 'Grants human commander approval for the proposed Decision Packet.',
    whenToUse: 'Click after reviewing the recommendation, assumptions, and risks in the Decision Packet.',
    whatHappensUnderneath: 'Dispatches POST /api/authorize with { action: "AUTHORIZE" }. Sets packet.authorization_status = "AUTHORIZED".',
    whatChanges: 'Authorization status updates to AUTHORIZED and Continuous Sentinel monitoring activates.',
    whatToCheckAfter: 'Check top header for green pulsating SENTINEL ACTIVE status badge.',
    isLlmDriven: false,
  },
  'reject_plan': {
    title: 'REJECT PLAN',
    purpose: 'Rejects the proposed AI decision packet under human override.',
    whenToUse: 'Use if human field intelligence deems the AI recommendation unsafe or unacceptable.',
    whatHappensUnderneath: 'Dispatches POST /api/authorize with { action: "REJECT" }.',
    whatChanges: 'Authorization status changes to REJECTED, prompting the AI to formulate an alternative.',
    whatToCheckAfter: 'Inspect Critic Agent feedback and wait for updated plan.',
    isLlmDriven: false,
  },
  'challenge_plan': {
    title: 'CHALLENGE PLAN (CRITIC REVIEW)',
    purpose: 'Prompts the Critic Agent to rigorously re-examine constraints and assumptions.',
    whenToUse: 'Use when you want the AI to stress-test its own recommendation against worst-case scenarios.',
    whatHappensUnderneath: 'Dispatches POST /api/challenge. CriticAgent executes constraint checks.',
    whatChanges: 'Returns critic review report showing approved status, critique text, and violations.',
    whatToCheckAfter: 'Read Critic critique in the Decision Packet view.',
    isLlmDriven: true,
  },
  'reasoning_mode': {
    title: 'REASONING MODE BADGE',
    purpose: 'Displays whether Google Gemini LLM or Offline Fallback is driving agent decisions.',
    whenToUse: 'Inspect to verify whether the system is connected to live LLM function calling.',
    whatHappensUnderneath: 'Evaluates state.llm_mode_active and state.reasoning_mode from backend.',
    whatChanges: 'Shows REASONING: LLM-ENHANCED (Blue) or OFFLINE DETERMINISTIC (Green).',
    whatToCheckAfter: 'Verify API key configuration in .env if in offline fallback mode.',
    isLlmDriven: false,
  },
};

interface InfoModalProps {
  controlKey: string | null;
  onClose: () => void;
}

export const ControlInfoModal: React.FC<InfoModalProps> = ({ controlKey, onClose }) => {
  if (!controlKey) return null;
  const data = CONTROL_HELP_REGISTRY[controlKey];
  if (!data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm font-mono">
      <div className="max-w-lg w-full bg-[#0d1418] border border-[#6fa8dc]/50 rounded-lg p-5 shadow-2xl text-left">
        <div className="flex items-center justify-between border-b border-[#253139] pb-3 mb-3">
          <div className="flex items-center gap-2 text-[#6fa8dc] font-bold text-sm">
            <Info className="w-4 h-4" />
            <span>{data.title}</span>
          </div>
          <button onClick={onClose} className="text-[#718086] hover:text-[#e8edf2] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <span className="text-[10px] text-[#718086] uppercase font-bold block mb-0.5">PURPOSE</span>
            <p className="text-[#e8edf2] leading-relaxed">{data.purpose}</p>
          </div>

          <div>
            <span className="text-[10px] text-[#718086] uppercase font-bold block mb-0.5">WHEN TO USE</span>
            <p className="text-[#aab5b8] leading-relaxed">{data.whenToUse}</p>
          </div>

          <div className="border-t border-[#253139] pt-2">
            <span className="text-[10px] text-[#6fa8dc] uppercase font-bold block mb-0.5">WHAT HAPPENS UNDERNEATH</span>
            <p className="text-[#6fa8dc] bg-[#07090b] p-2 rounded border border-[#253139] text-[11px] leading-relaxed">
              {data.whatHappensUnderneath}
            </p>
          </div>

          <div>
            <span className="text-[10px] text-[#65c89a] uppercase font-bold block mb-0.5">WHAT CHANGES</span>
            <p className="text-[#65c89a] leading-relaxed">{data.whatChanges}</p>
          </div>

          <div>
            <span className="text-[10px] text-[#f5c86e] uppercase font-bold block mb-0.5">WHAT TO CHECK AFTER</span>
            <p className="text-[#f1f3f0] leading-relaxed">{data.whatToCheckAfter}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

interface WhatJustHappenedProps {
  state: RealityState;
}

export const WhatJustHappenedPanel: React.FC<WhatJustHappenedProps> = ({ state }) => {
  const packet = state.current_packet;
  const isR12Blocked = state.routes?.['R-12']?.status === 'UNAVAILABLE' || state.routes?.['R-12']?.status === 'BLOCKED' || packet?.why.some(w => w.includes('Bridge'));
  const isAuthorized = packet?.authorization_status === 'AUTHORIZED';

  let eventText = 'Baseline nominal operations.';
  let keyFinding = 'Bridge B-07 accessible; Route R-12 operating at optimal evacuation speed.';
  let impactText = 'No active disruptions. Decision window open.';
  let nextAction = 'Inject a disruption (e.g. Bridge B-07 Failure).';

  if (isR12Blocked) {
    eventText = 'Reality Disruption Injected: Bridge B-07 Failure.';
    keyFinding = 'Bridge B-07 submerged; Fast Corridor Route R-12 blocked.';
    impactText = 'Evacuation capacity gap detected. AutonomousPlannerAgent formulated Route R-14 Bypass Detour.';
    nextAction = isAuthorized
      ? 'Plan authorized! Continuous Sentinel is actively monitoring downstream streams.'
      : 'Review the Decision Packet and click [AUTHORIZE PLAN] to approve execution.';
  }

  return (
    <div className="panel bg-[#0d1418] border border-[#253139] p-4 rounded-lg font-mono text-left space-y-3">
      <div className="flex items-center justify-between border-b border-[#253139] pb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#6fa8dc]" />
          <span className="font-bold text-xs text-[#e8edf2] uppercase tracking-wider">
            WHAT JUST HAPPENED? (LIVE CONTEXT)
          </span>
        </div>
        <span className="text-[9px] bg-[#182229] text-[#aab5b8] px-2 py-0.5 rounded font-mono">
          REPLAN COUNT: #{state.replan_count}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
        <div>
          <span className="text-[9px] text-[#718086] font-bold uppercase block mb-1">ACTUAL EVENT</span>
          <p className="text-[#e8edf2] font-semibold text-[11px]">{eventText}</p>
        </div>

        <div>
          <span className="text-[9px] text-[#e45b55] font-bold uppercase block mb-1">KEY FINDING</span>
          <p className="text-[#aab5b8] text-[11px] leading-relaxed">{keyFinding}</p>
        </div>

        <div>
          <span className="text-[9px] text-[#f5c86e] font-bold uppercase block mb-1">IMPACT & CONSEQUENCE</span>
          <p className="text-[#aab5b8] text-[11px] leading-relaxed">{impactText}</p>
        </div>

        <div>
          <span className="text-[9px] text-[#65c89a] font-bold uppercase block mb-1">WHAT TO DO NEXT</span>
          <p className="text-[#65c89a] font-bold text-[11px] leading-relaxed flex items-center gap-1">
            <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{nextAction}</span>
          </p>
        </div>
      </div>
    </div>
  );
};
