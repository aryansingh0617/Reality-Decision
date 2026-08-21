import os
import time
import json
import logging
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from app.orchestrator.mission_orchestrator import MissionOrchestrator
from simulation.scenarios.when_reality_breaks import create_initial_world, get_graph, DEMO_EVENTS
from core.state.reality_state import RealityState, EntityStatus, MissionPolicy
from core.state.entity_status import ConfidenceClass
from agents.llm_client import is_llm_mode_active, get_authoritative_status, toggle_simulated_fallback
from simulation.benchmark.autonomy_harness import run_autonomy_verification_suite

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("reality_decision.api")

app = FastAPI(title="REALITY//DECISION API")

# Enable CORS for the React Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global in-memory state
_state: Optional[RealityState] = None
_graph = None
_store = None
_orchestrator: Optional[MissionOrchestrator] = None

def get_current_orchestrator() -> MissionOrchestrator:
    global _state, _graph, _store, _orchestrator
    if _orchestrator is None:
        reset_system()
    return _orchestrator

def reset_system():
    global _state, _graph, _store, _orchestrator
    logger.info("Initializing system state...")
    _state, _store = create_initial_world()
    _graph = get_graph()
    _orchestrator = MissionOrchestrator(_state, _graph, _store)
    _orchestrator.run_full_cycle()

@app.get("/api/health")
def get_health_status():
    auth = get_authoritative_status()
    orch = get_current_orchestrator()
    reasoning_mode = getattr(orch.state, "reasoning_mode", auth["reasoning_mode"])
    llm_active = getattr(orch.state, "llm_mode_active", auth["llm_mode_active"])
    return {
        "status": "OPERATIONAL",
        "llm_available": auth["llm_available"],
        "llm_mode_active": llm_active,
        "reasoning_mode": reasoning_mode,
        "provider": auth["provider"],
        "model": auth["model"],
        "failure_reason": auth["failure_reason"],
        "simulated_fallback_forced": auth.get("simulated_fallback_forced", False),
    }

class ToggleFallbackRequest(BaseModel):
    force_fallback: Optional[bool] = None

@app.post("/api/llm/toggle-fallback")
def toggle_fallback(req: Optional[ToggleFallbackRequest] = None):
    force_val = req.force_fallback if req else None
    forced = toggle_simulated_fallback(force_val)
    orch = get_current_orchestrator()
    orch.state.llm_mode_active = not forced
    orch.state.reasoning_mode = "DETERMINISTIC_FALLBACK" if forced else "LLM_AGENTIC"
    return {
        "accepted": True,
        "simulated_fallback_forced": forced,
        "reasoning_mode": orch.state.reasoning_mode,
        "health": get_health_status(),
    }

@app.get("/api/harness/run")
def run_proof_of_agency_harness():
    """Execute the Proof-of-Agency test harness across Scenarios A, B, and C."""
    try:
        suite_results = run_autonomy_verification_suite(temperature=0.0)
        return suite_results
    except Exception as e:
        logger.error(f"Error running proof of agency harness: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/agent/execution")
def get_agent_execution():
    orch = get_current_orchestrator()
    history = []
    if hasattr(orch, "planner_agent") and orch.planner_agent:
        history = orch.planner_agent.get_execution_history()
    return {
        "total_executions": len(history),
        "execution_records": history,
        "reasoning_mode": getattr(orch.state, "reasoning_mode", "DETERMINISTIC_FALLBACK"),
        "llm_mode_active": getattr(orch.state, "llm_mode_active", False),
    }

def serialize_packet(packet) -> Optional[dict]:
    if not packet:
        return None
    return {
        "decision_id": getattr(packet, "decision_id", ""),
        "world_state_version": getattr(packet, "world_state_version", 1),
        "mission": packet.mission,
        "policy": packet.policy.value if hasattr(packet.policy, "value") else str(packet.policy),
        "recommendation": packet.recommendation,
        "route_id": packet.route_id,
        "why": packet.why,
        "known": packet.known,
        "unknown": packet.unknown,
        "critical_assumption": packet.critical_assumption,
        "consequence_if_wrong": packet.consequence_if_wrong,
        "alternative": packet.alternative,
        "verification": packet.verification,
        "confidence": packet.confidence.value if hasattr(packet.confidence, "value") else str(packet.confidence),
        "tti_minutes": getattr(packet, "tti_minutes", 999.0),
        "fragility": getattr(packet, "fragility", "STABLE"),
        "capacity_gap": packet.capacity_gap,
        "escalation_required": packet.escalation_required,
        "requires_human_authorization": getattr(packet, "requires_human_authorization", True),
        "reasoning_mode": getattr(packet, "reasoning_mode", "LLM_AGENTIC"),
        "timestamp": packet.timestamp.isoformat() if packet.timestamp else None,
        "ai_computed_at": packet.ai_computed_at.isoformat() if packet.ai_computed_at else None,
        "human_authorized_at": packet.human_authorized_at.isoformat() if packet.human_authorized_at else None,
        "authorization_status": packet.authorization_status,
        "provenance": packet.provenance,
        "assumptions": packet.assumptions,
        "evidence_list": getattr(packet, "evidence_list", []),
        "risks": getattr(packet, "risks", []),
        "alternatives_considered": getattr(packet, "alternatives_considered", []),
        "voi_rankings": getattr(packet, "voi_rankings", []),
        "previous_plan": getattr(packet, "previous_plan", ""),
        "cause_of_change": getattr(packet, "cause_of_change", ""),
        "missing_information": getattr(packet, "missing_information", ""),
        "counterfactual_branches": getattr(packet, "counterfactual_branches", []),
        "causal_trace": getattr(packet, "causal_trace", []),
        "simulation_summary": packet.simulation_summary,
    }

def serialize_state(state: RealityState) -> dict:
    return {
        "mission": state.mission,
        "policy": state.policy.value if hasattr(state.policy, "value") else str(state.policy),
        "decision_horizon_min": state.decision_horizon_min,
        "decision_window_min": state.decision_window_min,
        "verification_latency_min": state.verification_latency_min,
        "weather": state.weather.value if hasattr(state.weather, "value") else str(state.weather),
        "gps_available": state.gps_available,
        "routes": {
            rid: {
                "id": r.id,
                "name": r.name,
                "label": r.label,
                "coords": r.coords,
                "status": r.status.value if hasattr(r.status, "value") else str(r.status),
                "confidence": r.confidence.value if hasattr(r.confidence, "value") else str(r.confidence),
                "people_capacity": r.people_capacity,
                "eta_minutes": r.eta_minutes,
                "failure_risk": r.failure_risk,
                "depends_on": r.depends_on,
                "operational": r.operational,
            }
            for rid, r in state.routes.items()
        },
        "vehicles": {
            vid: {
                "id": v.id,
                "name": v.name,
                "capacity": v.capacity,
                "status": v.status.value if hasattr(v.status, "value") else str(v.status),
                "available": v.available,
                "assigned_route": v.assigned_route,
            }
            for vid, v in state.vehicles.items()
        },
        "shelters": {
            sid: {
                "id": s.id,
                "name": s.name,
                "capacity": s.capacity,
                "occupied": s.occupied,
                "status": s.status.value if hasattr(s.status, "value") else str(s.status),
            }
            for sid, s in state.shelters.items()
        },
        "hospitals": {
            hid: {
                "id": h.id,
                "name": h.name,
                "surge_capacity": h.surge_capacity,
                "current_load": h.current_load,
                "status": h.status.value if hasattr(h.status, "value") else str(h.status),
                "access_routes": h.access_routes,
            }
            for hid, h in state.hospitals.items()
        },
        "unknowns": state.unknowns,
        "conflicts": state.conflicts,
        "assumptions": state.assumptions,
        "current_packet": serialize_packet(state.current_packet),
        "agent_activity": state.agent_activity,
        "agent_steps": getattr(state, "agent_steps", []),
        "audit_trail": [
            {
                "timestamp": a.timestamp.isoformat() if hasattr(a.timestamp, "isoformat") else str(a.timestamp),
                "event_type": a.event_type,
                "actor": a.actor,
                "detail": a.detail,
            }
            for a in state.audit_trail
        ],
        "world_state_version": getattr(state, "world_state_version", 1),
        "life_cycle_state": getattr(state, "life_cycle_state", "MISSION_CREATED"),
        "current_water_depth_m": getattr(state, "current_water_depth", 0.35),
        "water_rise_rate_m_hr": getattr(state, "water_rise_rate", 0.15),
        "replan_count": state.replan_count,
        "last_state_change": state.last_state_change,
        "sentinel_status": getattr(_orchestrator, "sentinel_status", "MONITORING"),
        "reasoning_mode": getattr(state, "reasoning_mode", "DETERMINISTIC_FALLBACK"),
        "llm_mode_active": getattr(state, "llm_mode_active", False),
    }

class InjectEventRequest(BaseModel):
    event_id: str

class AuthorizeRequest(BaseModel):
    action: str  # AUTHORIZE, REJECT, REQUEST_VERIFY
    target_version: Optional[int] = None

class PolicyChangeRequest(BaseModel):
    policy: str  # SAFE, BALANCED, URGENT

@app.get("/api/state")
def get_state():
    orch = get_current_orchestrator()
    return serialize_state(orch.state)

@app.post("/api/initialize")
def initialize_mission():
    reset_system()
    orch = get_current_orchestrator()
    return {"status": "initialized", "state": serialize_state(orch.state)}

class RealityInjectRequest(BaseModel):
    entity_id: str
    status: str  # FAILED, OPERATIONAL, DEGRADED, UNAVAILABLE

@app.post("/api/mission/reality/inject")
def inject_reality_mutation(req: RealityInjectRequest):
    orch = get_current_orchestrator()
    entity_raw = req.entity_id.lower().replace("-", "")
    
    entity_key = entity_raw
    if not (entity_raw.startswith("bridge_") or entity_raw.startswith("route_") or entity_raw.startswith("vehicle_")):
        if entity_raw.startswith("b"):
            entity_key = f"bridge_{entity_raw}"
        elif entity_raw.startswith("r"):
            entity_key = f"route_{entity_raw}"
        elif entity_raw.startswith("v"):
            entity_key = f"vehicle_{entity_raw}"

    target_status = EntityStatus.UNAVAILABLE if req.status.upper() in ("FAILED", "UNAVAILABLE", "BLOCKED") else EntityStatus.KNOWN
    
    prev_status = "OPERATIONAL"
    if entity_key in orch.state.routes:
        prev_status = "OPERATIONAL" if orch.state.routes[entity_key].operational else "FAILED"
        orch.state.routes[entity_key].operational = (target_status != EntityStatus.UNAVAILABLE)
        orch.state.routes[entity_key].status = target_status
    elif entity_key in orch.state.vehicles:
        prev_status = "OPERATIONAL" if orch.state.vehicles[entity_key].available else "FAILED"
        orch.state.vehicles[entity_key].available = (target_status != EntityStatus.UNAVAILABLE)
        orch.state.vehicles[entity_key].status = target_status

    evt_id = f"evt_inj_{uuid.uuid4().hex[:8]}"
    orch.state.last_state_change = f"Reality disruption: {req.entity_id} transitioned to {req.status}"
    
    orch.run_full_cycle()
    
    return {
        "accepted": True,
        "event_id": evt_id,
        "entity_id": req.entity_id,
        "previous_status": prev_status,
        "new_status": req.status,
        "decision": orch.state.current_packet.recommendation if orch.state.current_packet else None,
        "replan_count": orch.state.replan_count,
        "reasoning_mode": getattr(orch.state, "reasoning_mode", "LLM_AGENTIC"),
        "state": serialize_state(orch.state)
    }

@app.post("/api/inject")
def inject_event(req: InjectEventRequest):
    orch = get_current_orchestrator()
    event_id = req.event_id
    normalized_id = event_id.replace("evt_", "")
    if normalized_id in DEMO_EVENTS:
        event_id = normalized_id
    elif event_id not in DEMO_EVENTS:
        if event_id in ("all_capacity_lost", "evt_all_capacity_lost") or normalized_id == "all_capacity_lost":
            orch.set_all_capacity_lost()
            return {"status": "injected", "event": "ALL CAPACITY LOST", "state": serialize_state(orch.state)}
        raise HTTPException(status_code=404, detail=f"Event {event_id} not found in DEMO_EVENTS")
    
    evt = DEMO_EVENTS[event_id]
    orch.process_events([evt])
    return {"status": "injected", "event": evt.get("label"), "state": serialize_state(orch.state)}

@app.post("/api/policy")
def change_policy(req: PolicyChangeRequest):
    orch = get_current_orchestrator()
    pol = req.policy.upper()
    if pol not in ["SAFE", "BALANCED", "URGENT"]:
        raise HTTPException(status_code=400, detail="Invalid policy mode")
    
    evt = {
        "id": f"pol_{pol}",
        "type": "policy_change",
        "policy": pol,
        "label": f"POLICY → {pol}"
    }
    orch.process_events([evt])
    return {"status": "policy_changed", "state": serialize_state(orch.state)}

@app.post("/api/authorize")
def authorize_decision(req: AuthorizeRequest):
    orch = get_current_orchestrator()
    action = req.action.upper()
    if action not in ["AUTHORIZE", "REJECT", "REQUEST_VERIFY"]:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    orch.authorize(action, target_version=req.target_version)
    return {"status": action, "state": serialize_state(orch.state)}

@app.post("/api/reset")
def reset_mission():
    reset_system()
    orch = get_current_orchestrator()
    return {"status": "reset", "state": serialize_state(orch.state)}

@app.get("/api/replan/stream")
def stream_replan():
    orch = get_current_orchestrator()
    
    def event_generator():
        try:
            for step_data in orch.run_agent_pipeline_generator():
                step_name = step_data["step"]
                payload = step_data["data"]
                
                if step_name == "complete":
                    payload = serialize_packet(payload)
                
                time.sleep(0.5)
                yield f"event: {step_name}\ndata: {json.dumps(payload)}\n\n"
        except Exception as e:
            logger.error(f"Error in streaming replan: {e}")
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.get("/api/mission/autonomous/stream")
def stream_autonomous_mission():
    orch = get_current_orchestrator()
    
    def event_generator():
        try:
            for step_data in orch.run_agent_pipeline_generator():
                step_name = step_data["step"]
                if step_name == "complete":
                    payload = serialize_packet(step_data["data"])
                else:
                    payload = step_data.get("data", step_data)
                
                time.sleep(0.5)
                yield f"event: {step_name}\ndata: {json.dumps(payload)}\n\n"
        except Exception as e:
            logger.error(f"Error in streaming autonomous mission: {e}")
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.get("/api/counterfactuals")
def get_counterfactuals():
    orch = get_current_orchestrator()
    from agents.simulation_agent import SimulationAgent
    sim_report = SimulationAgent.stress_test(orch.state, orch.state.current_packet)
    return {
        "base_case": sim_report.base_case,
        "counterfactuals": sim_report.counterfactuals,
    }

@app.get("/api/provenance/w3c-prov")
def get_w3c_prov_graph():
    orch = get_current_orchestrator()
    from core.provenance.prov_exporter import W3CProvExporter
    history = orch.planner_agent.get_execution_history() if hasattr(orch, "planner_agent") and orch.planner_agent else []
    return W3CProvExporter.export_w3c_prov_jsonld(orch.state.current_packet, orch.state, history)

@app.get("/api/gauge/fetch")
def fetch_gauge_data(site_id: str = "01646500"):
    from core.ingestion.water_gauge_api import WaterGaugeAPIClient
    gauge_data = WaterGaugeAPIClient.fetch_usgs_gauge_data(site_id)
    curve = WaterGaugeAPIClient.compute_dynamic_tti_curve(
        gauge_data.get("gage_height_m", 0.52),
        gauge_data.get("water_rise_rate_m_hr", 0.18),
        critical_depth_m=0.60
    )
    return {"gauge": gauge_data, "tti_curve": curve}

@app.get("/api/drone/waypoints")
def get_drone_waypoints(entity_id: str = "bridge_b07"):
    from core.tools.drone_dispatcher import DroneDispatcher
    return DroneDispatcher.generate_drone_flight_plan(entity_id=entity_id)

@app.get("/api/osm/ingest")
def ingest_osm_gis():
    from core.ingestion.osm_ingestion import OSMIngestionEngine
    return OSMIngestionEngine.fetch_osm_disaster_geojson()

# Static Frontend Bundle Serving
def _get_frontend_dist():
    possible_paths = [
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist"),
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "dist"),
        os.path.join(os.path.dirname(__file__), "dist"),
        os.path.join(os.getcwd(), "frontend", "dist"),
        os.path.join(os.getcwd(), "dist"),
    ]
    for p in possible_paths:
        if os.path.exists(p) and os.path.exists(os.path.join(p, "index.html")):
            return p
    return None

dist_dir = _get_frontend_dist()
if dist_dir:
    assets_dir = os.path.join(dist_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/")
    def serve_root():
        return FileResponse(os.path.join(dist_dir, "index.html"))

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        if full_path.startswith("api"):
            raise HTTPException(status_code=404, detail=f"API endpoint '/{full_path}' not found")
        file_path = os.path.join(dist_dir, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(dist_dir, "index.html"))
else:
    @app.get("/")
    def serve_fallback_root():
        return HTMLResponse("<h1>REALITY//DECISION API OPERATIONAL</h1><p>Backend is online. Building frontend assets...</p>")
