"""Streamlit command-center UI for REALITY//DECISION."""

from __future__ import annotations

import json
from datetime import datetime

import folium
import streamlit as st
from folium import plugins
from streamlit_folium import st_folium

from app.orchestrator.mission_orchestrator import MissionOrchestrator
from core.risk.risk_engine import RiskEngine
from core.state.entity_status import EntityStatus
from core.state.reality_state import MissionPolicy
from simulation.benchmark.harness import run_benchmark
from simulation.scenarios.when_reality_breaks import (
    BRIDGE,
    DEMO_EVENTS,
    HQ,
    HOSPITAL,
    create_initial_world,
    get_graph,
)


def inject_css():
    st.markdown(
        """
        <style>
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@400;600;700&display=swap');
        .stApp { background: #0b0f14; color: #c9d1d9; }
        #MainMenu, footer, header { visibility: hidden; }
        .rd-header {
            font-family: 'IBM Plex Sans', sans-serif;
            font-size: 1.35rem; font-weight: 700; letter-spacing: 2px;
            color: #58a6ff; border-bottom: 1px solid #21262d; padding-bottom: 8px;
        }
        .rd-sub { font-family: 'IBM Plex Mono', monospace; font-size: 0.72rem; color: #8b949e; }
        .rd-packet {
            background: #161b22; border: 1px solid #30363d; border-radius: 8px;
            padding: 16px; font-family: 'IBM Plex Mono', monospace; font-size: 0.78rem;
        }
        .rd-packet h4 { color: #58a6ff; margin: 0 0 8px 0; font-size: 0.85rem; }
        .rd-conflict {
            background: #2d1b1b; border: 1px solid #f85149; border-radius: 6px;
            padding: 12px; margin: 8px 0;
        }
        .rd-agent-line {
            font-family: 'IBM Plex Mono', monospace; font-size: 0.7rem;
            padding: 3px 0; border-left: 2px solid #30363d; padding-left: 8px; margin: 2px 0;
        }
        .rd-agent-orchestrator { border-left-color: #d2a8ff; }
        .rd-agent-evidence { border-left-color: #58a6ff; }
        .rd-agent-dependency { border-left-color: #f0883e; }
        .rd-agent-verification { border-left-color: #f778ba; }
        .rd-agent-decision { border-left-color: #3fb950; }
        .rd-agent-simulation { border-left-color: #79c0ff; }
        .rd-agent-human { border-left-color: #ffa657; }
        .rd-badge-known { background:#1a3d2e; color:#3fb950; padding:2px 6px; border-radius:4px; font-size:0.65rem; }
        .rd-badge-unknown { background:#3d2a1a; color:#f0883e; padding:2px 6px; border-radius:4px; font-size:0.65rem; }
        .rd-badge-conflict { background:#3d1a1a; color:#f85149; padding:2px 6px; border-radius:4px; font-size:0.65rem; }
        .rd-judge-btn .stButton>button {
            font-family: 'IBM Plex Mono', monospace !important;
            background: #21262d !important; border: 1px solid #30363d !important;
            color: #c9d1d9 !important; font-size: 0.72rem !important;
        }
        .stMetric { background: #161b22; border: 1px solid #21262d; border-radius: 6px; }
        </style>
        """,
        unsafe_allow_html=True,
    )


def init_session():
    if "orch" not in st.session_state:
        state, store = create_initial_world()
        graph = get_graph()
        orch = MissionOrchestrator(state, graph, store)
        orch.run_full_cycle()
        st.session_state.orch = orch
        st.session_state.judge_log = []


def reset_scenario():
    state, store = create_initial_world()
    graph = get_graph()
    orch = MissionOrchestrator(state, graph, store)
    orch.run_full_cycle()
    st.session_state.orch = orch
    st.session_state.judge_log = []


def build_map(state) -> folium.Map:
    m = folium.Map(location=[HQ["lat"], HQ["lon"]], zoom_start=14, tiles="CartoDB dark_matter")
    folium.Marker([HQ["lat"], HQ["lon"]], popup="COMMAND HQ", icon=folium.Icon(color="blue", icon="home", prefix="fa")).add_to(m)
    bridge_status = state.get_entity_status("bridge_07")
    bridge_color = "green" if bridge_status == EntityStatus.KNOWN else "red" if bridge_status == EntityStatus.UNAVAILABLE else "orange"
    folium.Marker(
        [BRIDGE["lat"], BRIDGE["lon"]], popup=f"Bridge 07 — {bridge_status.value}",
        icon=folium.Icon(color=bridge_color, icon="road", prefix="fa"),
    ).add_to(m)
    folium.Marker([HOSPITAL["lat"], HOSPITAL["lon"]], popup=HOSPITAL["name"], icon=folium.Icon(color="red", icon="plus", prefix="fa")).add_to(m)

    for route in state.routes.values():
        if route.status == EntityStatus.UNAVAILABLE:
            color, dash = "#f85149", "15,10"
        elif route.status in (EntityStatus.UNCERTAIN, EntityStatus.CONFLICTING):
            color, dash = "#f0883e", "8,8"
        else:
            color, dash = ("#58a6ff" if route.id == "route_alpha" else "#3fb950" if route.id == "route_bravo" else "#79c0ff"), None
        folium.PolyLine(route.coords, color=color, weight=4, opacity=0.85, dash_array=dash, popup=f"{route.name}: {route.status.value}").add_to(m)
    return m


def status_badge(status: EntityStatus) -> str:
    cls = "rd-badge-known"
    if status in (EntityStatus.UNKNOWN, EntityStatus.UNCERTAIN):
        cls = "rd-badge-unknown"
    elif status in (EntityStatus.CONFLICTING, EntityStatus.UNAVAILABLE):
        cls = "rd-badge-conflict"
    return f'<span class="{cls}">{status.value}</span>'


def agent_css(actor: str) -> str:
    a = actor.upper()
    if "ORCHESTRATOR" in a:
        return "rd-agent-orchestrator"
    if "EVIDENCE" in a:
        return "rd-agent-evidence"
    if "DEPENDENCY" in a:
        return "rd-agent-dependency"
    if "VERIFICATION" in a:
        return "rd-agent-verification"
    if "DECISION" in a:
        return "rd-agent-decision"
    if "SIMULATION" in a:
        return "rd-agent-simulation"
    if "HUMAN" in a:
        return "rd-agent-human"
    return "rd-agent-line"


def render_decision_packet(packet):
    if not packet:
        st.warning("No decision packet available")
        return
    ai_ts = packet.ai_computed_at.strftime("%H:%M:%S") if packet.ai_computed_at else "—"
    human_ts = packet.human_authorized_at.strftime("%H:%M:%S") if packet.human_authorized_at else "—"
    st.markdown(
        f"""<div class="rd-packet">
        <h4>DECISION PACKET</h4>
        <b>MISSION</b> {packet.mission}<br>
        <b>POLICY</b> {packet.policy.value}<br>
        <b>RECOMMENDATION</b> <span style="color:#58a6ff">{packet.recommendation}</span><br><br>
        <b>WHY</b><ul>{''.join(f'<li>{w}</li>' for w in packet.why)}</ul>
        <b>KNOWN</b><ul>{''.join(f'<li>{k}</li>' for k in packet.known)}</ul>
        <b>UNKNOWN</b><ul>{''.join(f'<li>{u}</li>' for u in packet.unknown)}</ul>
        <b>CRITICAL ASSUMPTION</b> {packet.critical_assumption}<br>
        <b>CONSEQUENCE IF WRONG</b> {packet.consequence_if_wrong}<br>
        <b>ALTERNATIVE</b> {packet.alternative}<br>
        <b>VERIFICATION</b> {packet.verification}<br>
        <b>CONFIDENCE</b> {packet.confidence.value}<br>
        <b>DECISION HORIZON</b> {packet.decision_horizon_min} minutes<br>
        <b>AUTHORITY</b> {packet.authority}<br><br>
        <span style="color:#8b949e">AI COMPUTED {ai_ts} · HUMAN AUTHORIZED {human_ts} · Status: {packet.authorization_status}</span>
        </div>""",
        unsafe_allow_html=True,
    )
    if packet.capacity_gap:
        st.error("CAPACITY GAP — EXTERNAL ESCALATION REQUIRED")


def render_conflicts(state):
    if not state.conflicts:
        return
    for c in state.conflicts:
        st.markdown(
            f"""<div class="rd-conflict">
            <b>EVIDENCE CONFLICT — {c['entity']}</b><br>
            {len(c['sources'])} sources disagree<br>
            Claims: {' · '.join(c['claims'][:3])}<br>
            Decision impact: {c['impact']} · Recommended: {c['action']}
            </div>""",
            unsafe_allow_html=True,
        )


def render_judge_mode(orch: MissionOrchestrator):
    st.markdown("#### JUDGE MODE — Break the world")
    buttons = [
        ("bridge_fails", "BRIDGE FAILS"),
        ("bridge_conflict", "BRIDGE STATUS CONFLICT"),
        ("vehicle_lost", "VEHICLE LOST"),
        ("weather_worsens", "WEATHER WORSENS"),
        ("shelter_collapse", "SHELTER CAPACITY COLLAPSES"),
        ("gps_fails", "GPS FAILS"),
        ("verification_slow", "VERIFICATION TOO SLOW"),
        ("policy_urgent", "POLICY → URGENT"),
    ]
    cols = st.columns(4)
    for i, (key, label) in enumerate(buttons):
        with cols[i % 4]:
            if st.button(label, key=f"judge_{key}", use_container_width=True):
                evt = DEMO_EVENTS[key]
                orch.process_events([evt])
                st.session_state.judge_log.append({"event": label, "time": datetime.now().isoformat()})
                st.rerun()

    c1, c2, c3 = st.columns(3)
    with c1:
        if st.button("ALL CAPACITY LOST", use_container_width=True):
            orch.set_all_capacity_lost()
            st.session_state.judge_log.append({"event": "ALL CAPACITY LOST", "time": datetime.now().isoformat()})
            st.rerun()
    with c2:
        if st.button("RESET SCENARIO", use_container_width=True):
            reset_scenario()
            st.rerun()
    with c3:
        if st.button("RUN FULL DEMO SEQUENCE", use_container_width=True):
            seq = ["bridge_fails", "bridge_conflict", "verification_slow", "policy_urgent", "vehicle_lost"]
            orch.process_events([DEMO_EVENTS[k] for k in seq])
            st.rerun()


def run_dashboard():
    st.set_page_config(page_title="REALITY//DECISION", page_icon="🛡️", layout="wide", initial_sidebar_state="expanded")
    inject_css()
    init_session()
    orch: MissionOrchestrator = st.session_state.orch
    state = orch.state

    st.markdown('<div class="rd-header">REALITY//DECISION</div>', unsafe_allow_html=True)
    st.markdown(
        '<div class="rd-sub">Agentic decision-support · Uncertainty-explicit · Human-governed</div>',
        unsafe_allow_html=True,
    )

    with st.sidebar:
        st.markdown("### Mission Policy")
        policy = st.radio(
            "Policy mode",
            ["SAFE", "BALANCED", "URGENT"],
            index=["SAFE", "BALANCED", "URGENT"].index(state.policy.value),
            help="Policy modes are operational constraints, not moral judgments.",
        )
        if policy != state.policy.value:
            orch.process_events([{"id": f"pol_{policy}", "type": "policy_change", "policy": policy, "label": f"POLICY → {policy}"}])
            st.rerun()
        st.markdown(f"**Decision horizon:** {state.decision_horizon_min} min")
        st.markdown(f"**Decision window:** {state.decision_window_min} min")
        st.markdown(f"**Verification latency:** {state.verification_latency_min} min")
        st.markdown("---")
        render_judge_mode(orch)

    m1, m2, m3, m4, m5 = st.columns(5)
    m1.metric("Policy", state.policy.value)
    m2.metric("Replans", state.replan_count)
    confirmed, unknown, _ = state.available_vehicle_capacity()
    m3.metric("Vehicle Capacity", f"{confirmed} confirmed")
    m4.metric("Conflicts", len(state.conflicts))
    m5.metric("Unknowns", len(state.unknowns))

    if state.multi_event_transition:
        st.info(f"MULTI-EVENT STATE TRANSITION: {state.multi_event_transition}")
    if state.last_state_change:
        st.warning(f"What changed: {state.last_state_change}")

    left, center, right = st.columns([3, 4, 3])

    with left:
        st.markdown("#### Operational Reality")
        render_conflicts(state)
        for rid, route in state.routes.items():
            st.markdown(f"**{route.name}** {status_badge(route.status)} — {route.label}", unsafe_allow_html=True)
            risk = RiskEngine.assess(state).routes.get(rid)
            if risk:
                st.caption(f"ETA {route.eta_minutes}m · Delay {risk.delay_min}m · Exposure {risk.exposure} · Blocked: {', '.join(risk.blocked_by) or 'none'}")
        st.markdown("#### Vehicles")
        for v in state.vehicles.values():
            avail = "available" if v.available else "UNAVAILABLE"
            st.caption(f"{v.name}: {avail} ({v.capacity} cap) {status_badge(v.status)}", unsafe_allow_html=True)
        st.markdown("#### Dependency Cascade")
        if state.last_state_change:
            graph = get_graph()
            cascade = graph.cascade_summary("bridge_07")
            st.caption(f"Direct: {', '.join(cascade['direct_impacts']) or '—'}")
            st.caption(f"Downstream: {', '.join(cascade['downstream_impacts'][:5]) or '—'}")

    with center:
        st.markdown("#### Tactical Map")
        st_folium(build_map(state), width=None, height=360, returned_objects=[])
        risk = RiskEngine.assess(state)
        st.markdown("#### Capacity")
        st.caption(f"Demand tracked · Confirmed: {risk.capacity_confirmed} · Unknown: {risk.capacity_unknown}")
        if risk.capacity_gap:
            st.error("CAPACITY GAP — cannot fabricate resources")

    with right:
        st.markdown("#### Decision Packet")
        render_decision_packet(state.current_packet)
        c1, c2, c3 = st.columns(3)
        with c1:
            if st.button("AUTHORIZE", type="primary", use_container_width=True):
                orch.authorize("AUTHORIZE")
                st.success("Human authorized.")
                st.rerun()
        with c2:
            if st.button("REQUEST VERIFY", use_container_width=True):
                orch.authorize("REQUEST_VERIFY")
                st.rerun()
        with c3:
            if st.button("REJECT", use_container_width=True):
                orch.authorize("REJECT")
                st.rerun()

    st.markdown("---")
    acol, bcol = st.columns(2)
    with acol:
        st.markdown("#### Agent Activity")
        for entry in state.agent_activity[-18:]:
            css = agent_css(entry["actor"])
            st.markdown(
                f'<div class="rd-agent-line {css}">{entry["time"]} <b>{entry["actor"]}</b> {entry["message"]}</div>',
                unsafe_allow_html=True,
            )
    with bcol:
        st.markdown("#### Audit Trail")
        for rec in state.audit_trail[-12:]:
            ts = rec.timestamp.strftime("%H:%M:%S")
            st.caption(f"{ts} [{rec.actor}] {rec.event_type}: {rec.detail}")

    with st.expander("Simulation Summary"):
        pkt = state.current_packet
        if pkt and pkt.simulation_summary:
            st.json(pkt.simulation_summary)

    with st.expander("SYNTHETIC BENCHMARK — Baseline vs REALITY//DECISION"):
        if st.button("Run Benchmark"):
            rd, base = run_benchmark()
            st.markdown(f"**{rd.label}** — critical coverage: {rd.metrics.critical_coverage}, invalid rate: {rd.metrics.invalid_recommendation_rate}, conflict detection: {rd.metrics.conflict_detection_rate}")
            st.markdown(f"**{base.label}** — critical coverage: {base.metrics.critical_coverage}, invalid rate: {base.metrics.invalid_recommendation_rate}")
            with st.expander("Details"):
                st.write("REALITY//DECISION:", rd.details)
                st.write("Baseline:", base.details)

    with st.expander("Export Audit JSON"):
        audit = [{"time": r.timestamp.isoformat(), "actor": r.actor, "event": r.event_type, "detail": r.detail} for r in state.audit_trail]
        st.download_button("Download", json.dumps(audit, indent=2), "audit_trail.json")
