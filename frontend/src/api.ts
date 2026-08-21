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
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function toggleSimulatedFallback(force_fallback?: boolean): Promise<any> {
  const res = await fetch(`${API_BASE}/llm/toggle-fallback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ force_fallback }),
  });
  if (!res.ok) throw new Error('Failed to toggle simulated fallback');
  return res.json();
}

export async function fetchVerifyAutonomyHarness(): Promise<HarnessSuiteResult> {
  const res = await fetch(`${API_BASE}/harness/run`);
  if (!res.ok) throw new Error('Failed to execute proof-of-agency verification harness');
  return res.json();
}

export async function fetchState(): Promise<RealityState> {
  const res = await fetch(`${API_BASE}/state`);
  if (!res.ok) throw new Error(`Backend state endpoint returned HTTP ${res.status}`);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (_e) {
    throw new Error('Received non-JSON response from backend state endpoint.');
  }
}

export async function initializeMission(): Promise<RealityState> {
  const res = await fetch(`${API_BASE}/initialize`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to initialize mission');
  const data = await res.json();
  return data.state;
}

export async function injectEvent(eventId: string): Promise<RealityState> {
  const res = await fetch(`${API_BASE}/inject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_id: eventId }),
  });
  if (!res.ok) throw new Error('Failed to inject event');
  const data = await res.json();
  return data.state;
}

export async function changePolicy(policy: string): Promise<RealityState> {
  const res = await fetch(`${API_BASE}/policy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ policy }),
  });
  if (!res.ok) throw new Error('Failed to change policy');
  const data = await res.json();
  return data.state;
}

export async function authorizeDecision(action: string, target_version?: number): Promise<RealityState> {
  const res = await fetch(`${API_BASE}/authorize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, target_version }),
  });
  if (!res.ok) throw new Error('Failed to authorize decision');
  const data = await res.json();
  return data.state;
}

export async function resetMission(): Promise<RealityState> {
  const res = await fetch(`${API_BASE}/reset`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to reset mission');
  const data = await res.json();
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
      const data = JSON.parse(event.data);
      onStep(eventName, data);
    });
  });

  es.addEventListener('complete', () => {
    onComplete();
    es.close();
  });

  es.addEventListener('error', (event) => {
    onError(event);
    es.close();
  });

  return () => es.close();
}

export async function fetchCounterfactuals(): Promise<any> {
  const res = await fetch(`${API_BASE}/counterfactuals`);
  if (!res.ok) throw new Error('Failed to fetch counterfactuals');
  return res.json();
}

export async function challengePlan(): Promise<any> {
  const res = await fetch(`${API_BASE}/challenge`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to challenge plan');
  return res.json();
}

export async function fetchW3CProvGraph(): Promise<any> {
  const res = await fetch(`${API_BASE}/provenance/w3c-prov`);
  if (!res.ok) throw new Error('Failed to fetch W3C PROV graph');
  return res.json();
}

export async function fetchGaugeData(siteId: string = "01646500"): Promise<any> {
  const res = await fetch(`${API_BASE}/gauge/fetch?site_id=${siteId}`);
  if (!res.ok) throw new Error('Failed to fetch gauge data');
  return res.json();
}

export async function fetchDroneWaypoints(entityId: string = "bridge_b07"): Promise<any> {
  const res = await fetch(`${API_BASE}/drone/waypoints?entity_id=${entityId}`);
  if (!res.ok) throw new Error('Failed to fetch drone waypoints');
  return res.json();
}

export async function fetchOSMGEOJSON(): Promise<any> {
  const res = await fetch(`${API_BASE}/osm/ingest`);
  if (!res.ok) throw new Error('Failed to fetch OSM GeoJSON');
  return res.json();
}
