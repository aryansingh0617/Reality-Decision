"""Synthetic benchmark — baseline greedy vs REALITY//DECISION."""

from __future__ import annotations

import time
from dataclasses import dataclass, field

from app.orchestrator.mission_orchestrator import MissionOrchestrator
from core.state.entity_status import EntityStatus
from simulation.scenarios.when_reality_breaks import DEMO_EVENTS, create_initial_world, get_graph


@dataclass
class BenchmarkMetrics:
    invalid_recommendation_rate: float = 0.0
    stale_state_decision_rate: float = 0.0
    conflict_detection_rate: float = 0.0
    unnecessary_verification_rate: float = 0.0
    time_to_decision_ms: float = 0.0
    replan_count: int = 0
    decision_regret: float = 0.0
    critical_coverage: float = 0.0
    human_intervention_count: int = 0


@dataclass
class BenchmarkResult:
    label: str
    metrics: BenchmarkMetrics
    cases_passed: int
    cases_total: int
    details: list[str] = field(default_factory=list)


def baseline_greedy_select(state) -> str:
    viable = [(r.id, r.eta_minutes) for r in state.routes.values() if r.operational]
    if not viable:
        return "HALT"
    return min(viable, key=lambda x: x[1])[0]


def run_benchmark() -> tuple[BenchmarkResult, BenchmarkResult]:
    cases = [
        ("conflicting_evidence", ["bridge_fails", "bridge_conflict"]),
        ("stale_evidence", ["bridge_fails"]),
        ("simultaneous_failures", ["bridge_fails", "vehicle_lost", "weather_worsens"]),
        ("resource_scarcity", ["bridge_fails", "vehicle_lost"]),
        ("changing_policy", ["bridge_fails", "policy_urgent"]),
        ("verification_delays", ["bridge_fails", "verification_slow"]),
        ("unknown_state", ["bridge_fails", "bridge_conflict"]),
        ("cascading_dependencies", ["bridge_fails"]),
    ]

    rd_details: list[str] = []
    base_details: list[str] = []
    rd_pass = 0
    base_pass = 0
    rd_conflicts_detected = 0
    rd_invalid = 0
    base_invalid = 0
    total_ms = 0.0
    replans = 0
    conflict_cases = 0

    for case_name, event_keys in cases:
        state, store = create_initial_world()
        graph = get_graph()
        orch = MissionOrchestrator(state, graph, store)

        t0 = time.perf_counter()
        events = [DEMO_EVENTS[k] for k in event_keys if k in DEMO_EVENTS]
        orch.process_events(events)
        elapsed = (time.perf_counter() - t0) * 1000
        total_ms += elapsed
        replans += state.replan_count

        packet = state.current_packet
        if "bridge_conflict" in event_keys or ("bridge_fails" in event_keys and len(event_keys) > 1):
            conflict_cases += 1
        if state.conflicts:
            rd_conflicts_detected += 1
            rd_details.append(f"{case_name}: conflict detected ✓")
        else:
            rd_details.append(f"{case_name}: processed")

        bridge_failed = "bridge_fails" in event_keys
        if packet and packet.route_id == "route_alpha" and bridge_failed:
            st = state.routes["route_alpha"]
            if not st.operational or st.status != EntityStatus.KNOWN:
                rd_invalid += 1
                rd_details.append(f"{case_name}: invalid route_alpha recommendation ✗")
            else:
                rd_pass += 1
        else:
            rd_pass += 1

        state_b, _ = create_initial_world()
        for k in event_keys:
            if k == "bridge_fails":
                state_b.routes["route_alpha"].operational = False
            if k == "vehicle_lost" and "vehicle_12" in state_b.vehicles:
                state_b.vehicles["vehicle_12"].available = False
        pick = baseline_greedy_select(state_b)
        if pick == "route_alpha" and bridge_failed:
            base_invalid += 1
            base_details.append(f"{case_name}: baseline picked invalidated route ✗")
        else:
            base_pass += 1
            base_details.append(f"{case_name}: baseline ok")

    n = len(cases)
    rd_metrics = BenchmarkMetrics(
        invalid_recommendation_rate=round(rd_invalid / n, 3),
        conflict_detection_rate=round(rd_conflicts_detected / max(1, conflict_cases), 3),
        time_to_decision_ms=round(total_ms / n, 2),
        replan_count=replans,
        critical_coverage=round(1.0 - rd_invalid / n, 3),
    )
    base_metrics = BenchmarkMetrics(
        invalid_recommendation_rate=round(base_invalid / n, 3),
        conflict_detection_rate=0.0,
        critical_coverage=round(1.0 - base_invalid / n, 3),
    )

    return (
        BenchmarkResult("REALITY//DECISION", rd_metrics, rd_pass, n * 2, rd_details),
        BenchmarkResult("Baseline (greedy)", base_metrics, base_pass, n, base_details),
    )
