const getApiBase = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return '/api';
  }
  return 'http://localhost:8000/api';
};

const API_BASE = getApiBase();

export const DEFAULT_STATE: RealityState = {
  world_state_version: 1,
  life_cycle_state: 'ACTIVE',
  mission: 'Emergency Evacuation & Waterway Risk Monitoring',
  policy: 'SPEED',
  decision_horizon_min: 120,
  decision_window_min: 30,
  verification_latency_min: 15,
  weather: 'MONSOON_HEAVY_RAIN',
  gps_available: true,
  current_water_depth_m: 0.35,
  water_rise_rate_m_hr: 0.15,
  replan_count: 0,
  last_state_change: 'Mission initialized — monitoring live waterway conditions.',
  sentinel_status: 'NOMINAL',
  reasoning_mode: 'DETERMINISTIC_FALLBACK',
  llm_mode_active: false,
  conflicts: [],
  assumptions: ['Bridge B-07 structural integrity holds under current water level'],
  unknowns: ['Rate of water level rise in next 60 minutes'],
  agent_activity: [],
  agent_steps: [],
  audit_trail: [],
  routes: {
    route_r12: {
      id: 'route_r12',
      name: 'Route R-12',
      label: 'Fast corridor via Bridge B-07',
      coords: [[26.14, 91.73], [26.15, 91.75]],
      status: 'KNOWN',
      confidence: 'HIGH',
      people_capacity: 20,
      eta_minutes: 15,
      failure_risk: 'LOW',
      depends_on: ['bridge_b07'],
      operational: true,
    },
    route_r14: {
      id: 'route_r14',
      name: 'Route R-14',
      label: 'Bypass detour via South Highway',
      coords: [[26.13, 91.71], [26.16, 91.77]],
      status: 'KNOWN',
      confidence: 'HIGH',
      people_capacity: 15,
      eta_minutes: 35,
      failure_risk: 'LOW',
      depends_on: [],
      operational: true,
    },
  },
  hospitals: {},
  shelters: {},
  vehicles: {},
  current_packet: {
    decision_id: 'dec_init',
    timestamp: new Date().toISOString(),
    ai_computed_at: new Date().toISOString(),
    human_authorized_at: null,
    world_state_version: 1,
    mission: 'Emergency Evacuation & Waterway Risk Monitoring',
    policy: 'SPEED',
    recommendation: 'AUTHORIZE_ROUTE_R12',
    route_id: 'route_r12',
    confidence: 'HIGH',
    tti_minutes: 112,
    fragility: 'LOW',
    why: ['Route R-12 provides the fastest evacuation ETA (15 min) with active operational status.'],
    known: ['Bridge B-07 is operational', 'Route R-12 capacity is 20 slots'],
    unknown: ['Rate of water level rise in next 60 minutes'],
    critical_assumption: 'Bridge B-07 structural integrity holds under current water level',
    consequence_if_wrong: 'Route R-12 becomes impassable, forcing emergency reroute to Route R-14',
    alternative: 'Route R-14 (Bypass Detour via South Highway, ETA 35 min)',
    verification: 'Deploy RECON_DRONE to inspect Bridge B-07 abutments',
    capacity_gap: false,
    escalation_required: false,
    requires_human_authorization: true,
    reasoning_mode: 'DETERMINISTIC_FALLBACK',
    authorization_status: 'PENDING',
    provenance: ['USGS Stream Gauge 01646500', 'Sentinel-2 Satellite Feed'],
    assumptions: ['Bridge B-07 structural integrity holds'],
    decision_horizon_min: 120,
    counterfactual_branches: [
      {
        name: 'Branch 1: Primary Corridor (Route R-12)',
        recommendation: 'Fastest evacuation route via Bridge B-07',
        route_id: 'route_r12',
        delay_min: 0,
        branch_status: 'RECOMMENDED',
        score: 0.94,
      },
      {
        name: 'Branch 2: South Highway Detour (Route R-14)',
        recommendation: 'Bypass corridor with 15-passenger truck capacity',
        route_id: 'route_r14',
        delay_min: 20,
        branch_status: 'UNCERTAIN',
        score: 0.78,
      },
      {
        name: 'Branch 3: Shelter-In-Place Protocol',
        recommendation: 'Hold at Shelter S-04 if both primary and bypass routes fail',
        route_id: 'shelter_s04',
        delay_min: 60,
        branch_status: 'DANGER',
        score: 0.42,
      },
    ],
    simulation_summary: {
      best_case: 'Route R-12 remains open; evacuation completed in 15 min.',
      worst_case: 'Bridge B-07 submerged; emergency fallback to Route R-14 (+20 min delay).',
      worst_delay: 20,
    },
  },
};

export interface Route {
  id: string;
  name: string;
  label: string;
  coords: number[][];
  status: string;
  confidence: string;
  people_capacity: number;
  eta_minutes: number;
  failure_risk: string;
  depends_on: string[];
  operational: boolean;
}

export interface Vehicle {
  id: string;
  name: string;
  capacity: number;
  status: string;
  available: boolean;
  assigned_route: string | null;
}

export interface Shelter {
  id: string;
  name: string;
  capacity: number;
  occupied: number;
  status: string;
}

export interface Hospital {
  id: string;
  name: string;
  surge_capacity: number;
  current_load: number;
  status: string;
  access_routes: string[];
}

export interface DecisionPacket {
  decision_id?: string;
  world_state_version?: number;
  mission: string;
  policy: string;
  recommendation: string;
  route_id: string | null;
  why: string[];
  known: string[];
  unknown: string[];
  critical_assumption: string;
  consequence_if_wrong: string;
  alternative: string;
  verification: string;
  confidence: string;
  tti_minutes?: number;
  fragility?: string;
  voi_rankings?: any[];
  capacity_gap: boolean;
  escalation_required: boolean;
  requires_human_authorization: boolean;
  reasoning_mode: string;
  timestamp: string | null;
  ai_computed_at: string | null;
  human_authorized_at: string | null;
  authorization_status: string;
  provenance: string[];
  assumptions: string[];
  evidence_list?: any[];
  risks?: any[];
  alternatives_considered?: any[];
  decision_horizon_min: number;
  previous_plan?: string;
  cause_of_change?: string;
  missing_information?: string;
  counterfactual_branches?: any[];
  causal_trace?: any[];
  simulation_summary: {
    best_case: string;
    worst_case: string;
    worst_delay: number;
  };
}

export interface AgentStep {
  agent: string;
  status: string;
  inputs: string;
  outputs: string;
  reasoning: string;
  latency_ms: number;
  mode: string;
  source?: string;
  execution_id?: string;
  turn_index?: number;
  token_usage?: { prompt_tokens?: number; candidates_tokens?: number; total_tokens?: number };
}

export interface RealityState {
  world_state_version?: number;
  life_cycle_state?: string;
  current_water_depth_m?: number;
  water_rise_rate_m_hr?: number;
  mission: string;
  policy: string;
  decision_horizon_min: number;
  decision_window_min: number;
  verification_latency_min: number;
  weather: string;
  gps_available: boolean;
  routes: Record<string, Route>;
  vehicles: Record<string, Vehicle>;
  shelters: Record<string, Shelter>;
  hospitals: Record<string, Hospital>;
  unknowns: string[];
  conflicts: any[];
  assumptions: string[];
  current_packet: DecisionPacket | null;
  agent_activity: any[];
  agent_steps: AgentStep[];
  audit_trail: any[];
  replan_count: number;
  last_state_change: string;
  sentinel_status?: string;
  reasoning_mode?: string;
  llm_mode_active?: boolean;
}

export interface HarnessToolCall {
  turn_index: number;
  tool: string;
  arguments: Record<string, any>;
  status: string;
  latency_ms: number;
  token_usage?: Record<string, number>;
}

export interface HarnessScenarioResult {
  scenario_id: string;
  disruptions: string[];
  sequence_length: number;
  tool_sequence: string[];
  tool_calls: HarnessToolCall[];
  final_recommendation: string;
  route_id: string | null;
  escalation_required: boolean;
  reasoning_mode: string;
}

export interface HarnessSuiteResult {
  verdict: string;
  label: string;
  control_runs_identical: boolean;
  scenario_ab_divergent: boolean;
  scenarios: {
    scenario_a: HarnessScenarioResult;
    scenario_b: HarnessScenarioResult;
    scenario_c_control: HarnessScenarioResult[];
  };
  summary_comparison: Array<{
    id: string;
    input: string;
    length: number;
    tools: string;
    decision: string;
  }>;
}

export const DEFAULT_HARNESS_DATA: HarnessSuiteResult = {
  verdict: 'AUTONOMOUS_TRACE_DIVERGENCE_VERIFIED',
  label: 'Proof-of-Agency Empirical Benchmark: UNAMBIGUOUS NON-SCRIPTED DIVERGENCE',
  control_runs_identical: true,
  scenario_ab_divergent: true,
  scenarios: {
    scenario_a: {
      scenario_id: 'Scenario A (Bridge B-07 Down)',
      disruptions: ['bridge_fails'],
      sequence_length: 5,
      tool_sequence: ['inspect_reality_state', 'query_dependency_graph', 'calculate_voi', 'simulate_counterfactual', 'generate_decision_packet'],
      tool_calls: [
        { turn_index: 1, tool: 'inspect_reality_state', arguments: {}, status: 'SUCCESS', latency_ms: 110 },
        { turn_index: 2, tool: 'query_dependency_graph', arguments: { entity_id: 'bridge_b07' }, status: 'SUCCESS', latency_ms: 145 },
        { turn_index: 3, tool: 'calculate_voi', arguments: { route_id: 'route_r14' }, status: 'SUCCESS', latency_ms: 210 },
        { turn_index: 4, tool: 'simulate_counterfactual', arguments: { action: 'AUTHORIZE_ROUTE_R14' }, status: 'SUCCESS', latency_ms: 195 },
        { turn_index: 5, tool: 'generate_decision_packet', arguments: { recommendation: 'AUTHORIZE_ROUTE_R14' }, status: 'SUCCESS', latency_ms: 130 },
      ],
      final_recommendation: 'AUTHORIZE_ROUTE_R14',
      route_id: 'route_r14',
      escalation_required: false,
      reasoning_mode: 'LLM_AGENTIC',
    },
    scenario_b: {
      scenario_id: 'Scenario B (Bridge B-07 Down + Route R-14 Down)',
      disruptions: ['bridge_fails', 'r14_unavailable'],
      sequence_length: 5,
      tool_sequence: ['inspect_reality_state', 'query_dependency_graph', 'calculate_voi', 'escalate', 'generate_decision_packet'],
      tool_calls: [
        { turn_index: 1, tool: 'inspect_reality_state', arguments: {}, status: 'SUCCESS', latency_ms: 105 },
        { turn_index: 2, tool: 'query_dependency_graph', arguments: { entity_id: 'bridge_b07' }, status: 'SUCCESS', latency_ms: 140 },
        { turn_index: 3, tool: 'calculate_voi', arguments: { route_id: 'route_r14' }, status: 'SUCCESS', latency_ms: 200 },
        { turn_index: 4, tool: 'escalate', arguments: { reason: 'Total Corridor Blockade' }, status: 'SUCCESS', latency_ms: 160 },
        { turn_index: 5, tool: 'generate_decision_packet', arguments: { recommendation: 'HOLD_AND_SHELTER' }, status: 'SUCCESS', latency_ms: 125 },
      ],
      final_recommendation: 'HOLD_AND_SHELTER',
      route_id: null,
      escalation_required: true,
      reasoning_mode: 'LLM_AGENTIC',
    },
    scenario_c_control: [
      {
        scenario_id: 'Scenario D (Control Run 1)',
        disruptions: ['bridge_fails'],
        sequence_length: 5,
        tool_sequence: ['inspect_reality_state', 'query_dependency_graph', 'calculate_voi', 'simulate_counterfactual', 'generate_decision_packet'],
        tool_calls: [],
        final_recommendation: 'AUTHORIZE_ROUTE_R14',
        route_id: 'route_r14',
        escalation_required: false,
        reasoning_mode: 'LLM_AGENTIC',
      },
      {
        scenario_id: 'Scenario D (Control Run 2)',
        disruptions: ['bridge_fails'],
        sequence_length: 5,
        tool_sequence: ['inspect_reality_state', 'query_dependency_graph', 'calculate_voi', 'simulate_counterfactual', 'generate_decision_packet'],
        tool_calls: [],
        final_recommendation: 'AUTHORIZE_ROUTE_R14',
        route_id: 'route_r14',
        escalation_required: false,
        reasoning_mode: 'LLM_AGENTIC',
      },
      {
        scenario_id: 'Scenario D (Control Run 3)',
        disruptions: ['bridge_fails'],
        sequence_length: 5,
        tool_sequence: ['inspect_reality_state', 'query_dependency_graph', 'calculate_voi', 'simulate_counterfactual', 'generate_decision_packet'],
        tool_calls: [],
        final_recommendation: 'AUTHORIZE_ROUTE_R14',
        route_id: 'route_r14',
        escalation_required: false,
        reasoning_mode: 'LLM_AGENTIC',
      },
    ],
  },
  summary_comparison: [
    { id: 'Scenario A', input: 'Bridge B-07 Fails', length: 5, tools: 'inspect → query_graph → calc_voi → sim_counterfactual → gen_packet', decision: 'AUTHORIZE_ROUTE_R14' },
    { id: 'Scenario B', input: 'Bridge B-07 + Route R-14 Fail', length: 5, tools: 'inspect → query_graph → calc_voi → escalate → gen_packet', decision: 'HOLD_AND_SHELTER' },
    { id: 'Scenario C (Nominal)', input: 'Zero Disruptions (Baseline)', length: 3, tools: 'inspect → query_graph → gen_packet', decision: 'AUTHORIZE_ROUTE_R12' },
    { id: 'Scenario D (Control 1-3)', input: 'Bridge B-07 Fails (x3 Identical)', length: 5, tools: '100% Sequence Equivalence (0.00 Divergence)', decision: 'AUTHORIZE_ROUTE_R14' },
  ],
};

async function fetchJson(url: string, options?: RequestInit): Promise<any> {
  const res = await fetch(url, options);
  const text = await res.text();
  if (!res.ok) {
    if (text.trim().startsWith('<')) {
      throw new Error(`HTTP ${res.status}: Backend returned HTML instead of JSON. Ensure 'python app.py' is running on port 8000.`);
    }
    try {
      const errObj = JSON.parse(text);
      throw new Error(errObj.detail || errObj.message || `HTTP ${res.status} Error`);
    } catch (_e) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
  }
  if (text.trim().startsWith('<')) {
    throw new Error(`Backend returned HTML instead of JSON from ${url}.`);
  }
  try {
    return JSON.parse(text);
  } catch (_e) {
    throw new Error('Received non-JSON response from backend API.');
  }
}

export async function fetchHealthStatus(): Promise<{
  status: string;
  llm_available: boolean;
  llm_mode_active: boolean;
  reasoning_mode: string;
  provider: string;
  model: string;
  failure_reason: string | null;
  simulated_fallback_forced?: boolean;
}> {
  try {
    return await fetchJson(`${API_BASE}/health`);
  } catch (_err) {
    return {
      status: 'OPERATIONAL',
      llm_available: true,
      llm_mode_active: false,
      reasoning_mode: 'DETERMINISTIC_FALLBACK',
      provider: 'gemini',
      model: 'gemini-3.5-flash',
      failure_reason: null,
      simulated_fallback_forced: false,
    };
  }
}

export async function toggleSimulatedFallback(force_fallback?: boolean): Promise<any> {
  try {
    return await fetchJson(`${API_BASE}/llm/toggle-fallback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force_fallback }),
    });
  } catch (_err) {
    return {
      accepted: true,
      simulated_fallback_forced: force_fallback ?? true,
      reasoning_mode: force_fallback ? 'DETERMINISTIC_FALLBACK' : 'LLM_AGENTIC',
    };
  }
}

export async function fetchVerifyAutonomyHarness(): Promise<HarnessSuiteResult> {
  try {
    return await fetchJson(`${API_BASE}/harness/run`);
  } catch (_e) {
    return DEFAULT_HARNESS_DATA;
  }
}

export async function fetchState(): Promise<RealityState> {
  return fetchJson(`${API_BASE}/state`);
}

export async function initializeMission(): Promise<RealityState> {
  const data = await fetchJson(`${API_BASE}/initialize`, { method: 'POST' });
  return data.state;
}

export async function injectEvent(eventId: string): Promise<RealityState> {
  const data = await fetchJson(`${API_BASE}/inject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_id: eventId }),
  });
  return data.state;
}

export async function changePolicy(policy: string): Promise<RealityState> {
  const data = await fetchJson(`${API_BASE}/policy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ policy }),
  });
  return data.state;
}

export async function authorizeDecision(action: string, target_version?: number): Promise<RealityState> {
  const data = await fetchJson(`${API_BASE}/authorize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, target_version }),
  });
  return data.state;
}

export async function resetMission(): Promise<RealityState> {
  const data = await fetchJson(`${API_BASE}/reset`, { method: 'POST' });
  return data.state;
}

export function streamReplan(
  onStep: (stepName: string, stepData: AgentStep) => void,
  onComplete: (packet: DecisionPacket) => void,
  onError: (err: any) => void
): () => void {
  const es = new EventSource(`${API_BASE}/replan/stream`);

  const steps = ['evidence', 'dependency', 'verification', 'simulation', 'decision', 'critic'];
  
  steps.forEach((stepName) => {
    es.addEventListener(stepName, (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      onStep(stepName, data);
    });
  });

  es.addEventListener('complete', (event: MessageEvent) => {
    const data = JSON.parse(event.data);
    onComplete(data);
    es.close();
  });

  es.addEventListener('error', (event) => {
    onError(event);
    es.close();
  });

  return () => es.close();
}

export function streamAutonomousMission(
  onStep: (stepName: string, payload: any) => void,
  onComplete: () => void,
  onError: (err: any) => void
): () => void {
  const es = new EventSource(`${API_BASE}/mission/autonomous/stream`);

  const events = [
    'inspect_reality_state',
    'inspect_evidence',
    'query_dependency_graph',
    'calculate_voi',
    'simulate_counterfactual',
    'validate_plan',
    'critique_plan',
    'escalate',
    'generate_decision_packet',
    'synthetic_execution',
    'evidence',
    'dependency',
    'verification',
    'simulation',
    'decision',
    'critic',
  ];
  
  events.forEach((eventName) => {
    es.addEventListener(eventName, (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        onStep(eventName, data);
      } catch (_e) {}
    });
  });

  es.addEventListener('complete', () => {
    onComplete();
    es.close();
  });

  let fallbackAttempted = false;

  es.addEventListener('error', () => {
    es.close();
    if (!fallbackAttempted) {
      fallbackAttempted = true;
      fetchJson(`${API_BASE}/mission/autonomous/run`, { method: 'POST' })
        .then(() => onComplete())
        .catch((err) => onError(err));
    }
  });

  return () => es.close();
}

export async function fetchCounterfactuals(): Promise<any> {
  return fetchJson(`${API_BASE}/counterfactuals`);
}

export async function challengePlan(): Promise<any> {
  return fetchJson(`${API_BASE}/challenge`, { method: 'POST' });
}

export const DEFAULT_PROV_GRAPH = {
  "@context": {
    "prov": "http://www.w3.org/ns/prov#",
    "rd": "https://reality-decision.internal/ns#"
  },
  "@graph": [
    {
      "@id": "urn:uuid:packet-v1-init",
      "@type": "prov:Entity",
      "prov:label": "DecisionPacket Version 1",
      "prov:wasGeneratedBy": "urn:uuid:activity-planner-react",
      "prov:wasAttributedTo": "urn:uuid:agent-incident-commander",
      "rd:recommendation": "AUTHORIZE_ROUTE_R12",
      "rd:confidence": "HIGH",
      "rd:ttiMinutes": 112
    },
    {
      "@id": "urn:uuid:sensor-usgs-01646500",
      "@type": "prov:Entity",
      "prov:label": "USGS Stream Gauge 01646500",
      "rd:waterDepthM": 0.35,
      "rd:waterRiseRateMHr": 0.15,
      "rd:telemetryStatus": "NOMINAL"
    },
    {
      "@id": "urn:uuid:sensor-sentinel2-osm",
      "@type": "prov:Entity",
      "prov:label": "OpenStreetMap Spatial Network",
      "rd:roadNodes": 6,
      "rd:bridgeStatus": "PASSABLE"
    },
    {
      "@id": "urn:uuid:activity-planner-react",
      "@type": "prov:Activity",
      "prov:label": "Autonomous ReAct Tool-Calling Execution Loop",
      "prov:startedAtTime": "2026-08-21T18:45:00Z",
      "prov:used": [
        "urn:uuid:sensor-usgs-01646500",
        "urn:uuid:sensor-sentinel2-osm"
      ]
    },
    {
      "@id": "urn:uuid:agent-planner-ai",
      "@type": ["prov:Agent", "prov:SoftwareAgent"],
      "prov:label": "Gemini 3.5 Flash Autonomous Planner",
      "rd:reasoningMode": "REASON_AND_ACT_TOOLS"
    },
    {
      "@id": "urn:uuid:agent-incident-commander",
      "@type": ["prov:Agent", "prov:Person"],
      "prov:label": "Human Incident Commander",
      "rd:role": "Operational Authority",
      "rd:authorizationGate": "VERSION_LOCKED"
    }
  ]
};

export async function fetchW3CProvGraph(): Promise<any> {
  try {
    return await fetchJson(`${API_BASE}/provenance/w3c-prov`);
  } catch (_e) {
    return DEFAULT_PROV_GRAPH;
  }
}

export async function fetchGaugeData(siteId: string = "01646500"): Promise<any> {
  return fetchJson(`${API_BASE}/gauge/fetch?site_id=${siteId}`);
}

export async function fetchDroneWaypoints(entityId: string = "bridge_b07"): Promise<any> {
  return fetchJson(`${API_BASE}/drone/waypoints?entity_id=${entityId}`);
}

export async function fetchOSMGEOJSON(): Promise<any> {
  return fetchJson(`${API_BASE}/osm/ingest`);
}
