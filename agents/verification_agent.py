"""Verification Agent — information value and verification feasibility."""

from __future__ import annotations

from dataclasses import dataclass

from core.dependencies.dependency_graph import DependencyGraph
from core.evidence.evidence_store import EvidenceStore
from core.state.entity_status import EntityStatus
from core.state.reality_state import RealityState


@dataclass
class UnknownPriority:
    entity: str
    description: str
    decision_impact: float  # 0-1
    uncertainty: float  # 0-1
    time_criticality: float  # 0-1
    downstream_count: int
    verification_time_min: float
    priority_score: float
    recommendation: str  # VERIFY or PROCEED_UNDER_UNCERTAINTY


class VerificationAgent:
    """
    INPUT: unknowns, conflicts, decision window, verification latency
    PROCESS: priority = impact × uncertainty × time_criticality / verification_cost
    OUTPUT: ranked unknowns + verify/proceed recommendation
    """

    IMPACT_MAP = {
        "bridge_b07": 0.95,
        "route_r12": 0.85,
        "vehicle_v01": 0.7,
        "gps_network": 0.6,
        "shelter_s04": 0.5,
    }

    @classmethod
    def rank_unknowns(
        cls,
        state: RealityState,
        store: EvidenceStore,
        graph: DependencyGraph,
        verification_latency_min: float | None = None,
    ) -> list[UnknownPriority]:
        verification_latency_min = verification_latency_min or state.verification_latency_min
        decision_window = state.decision_window_min
        
        from agents.llm_client import is_llm_mode_active, call_openai_json
        
        candidates = set(state.unknowns)
        for entity in state.entities:
            if state.get_entity_status(entity) in (EntityStatus.UNKNOWN, EntityStatus.CONFLICTING, EntityStatus.UNCERTAIN):
                candidates.add(entity)
        for item in store.items:
            if item.status in ("unknown", "conflicting", "uncertain"):
                candidates.add(item.entity)
                
        if is_llm_mode_active() and candidates:
            # Format candidate entities and downstream impacts
            candidates_info = []
            for entity in candidates:
                downstream = graph.get_downstream(entity)
                candidates_info.append(
                    f"- Entity: {entity}\n"
                    f"  Status: {state.get_entity_status(entity).value}\n"
                    f"  Downstream impacts: {', '.join(downstream) or 'none'}"
                )
            candidates_text = "\n".join(candidates_info)
            
            system_prompt = (
                "You are a Verification Prioritization Agent for emergency response.\n"
                "Your role is to identify which unresolved assumptions/entities are worth verifying.\n"
                "You MUST evaluate verification latency versus decision urgency.\n"
                "Provide a JSON object with this structure:\n"
                "{\n"
                "  \"ranked_unknowns\": [\n"
                "    {\n"
                "      \"entity\": \"string\",\n"
                "      \"description\": \"string\",\n"
                "      \"decision_impact\": float (0.0 to 1.0),\n"
                "      \"uncertainty\": float (0.0 to 1.0),\n"
                "      \"time_criticality\": float (0.0 to 1.0),\n"
                "      \"downstream_count\": int,\n"
                "      \"verification_time_min\": float,\n"
                "      \"priority_score\": float (0.0 to 1.0, higher means more critical to verify),\n"
                "      \"recommendation\": \"VERIFY\" | \"PROCEED_UNDER_UNCERTAINTY\"\n"
                "    }\n"
                "  ]\n"
                "}\n"
                "CRITICAL: If verification latency > decision window, you MUST recommend PROCEED_UNDER_UNCERTAINTY.\n"
                "Do NOT invent entities."
            )
            
            user_prompt = (
                f"Operational Context:\n"
                f"- Decision Window: {decision_window} min\n"
                f"- Verification Latency: {verification_latency_min} min\n\n"
                f"Candidate Entities for Verification:\n{candidates_text}"
            )
            
            data = call_openai_json(system_prompt, user_prompt)
            if data and "ranked_unknowns" in data:
                results = []
                for x in data["ranked_unknowns"]:
                    results.append(
                        UnknownPriority(
                            entity=x["entity"],
                            description=x["description"],
                            decision_impact=x["decision_impact"],
                            uncertainty=x["uncertainty"],
                            time_criticality=x["time_criticality"],
                            downstream_count=x["downstream_count"],
                            verification_time_min=x["verification_time_min"],
                            priority_score=round(x["priority_score"], 3),
                            recommendation=x["recommendation"],
                        )
                    )
                results.sort(key=lambda x: x.priority_score, reverse=True)
                return results

        # Fallback deterministic prioritization
        results: list[UnknownPriority] = []

        for entity in candidates:
            impact = cls.IMPACT_MAP.get(entity, 0.5)
            downstream = len(graph.get_downstream(entity))
            uncertainty = 1.0 if state.get_entity_status(entity) == EntityStatus.CONFLICTING else 0.7
            time_crit = min(1.0, 1.0 - (decision_window / 30.0))
            base_score = impact * uncertainty * time_crit
            if verification_latency_min > 0:
                priority_score = base_score * (1 + downstream * 0.1) / (verification_latency_min / 5.0)
            else:
                priority_score = base_score * (1 + downstream * 0.1)

            if verification_latency_min > decision_window:
                recommendation = "PROCEED_UNDER_UNCERTAINTY"
            elif priority_score > 0.4:
                recommendation = "VERIFY"
            else:
                recommendation = "PROCEED_UNDER_UNCERTAINTY"

            results.append(
                UnknownPriority(
                    entity=entity,
                    description=f"{entity} status unresolved",
                    decision_impact=impact,
                    uncertainty=uncertainty,
                    time_criticality=time_crit,
                    downstream_count=downstream,
                    verification_time_min=verification_latency_min,
                    priority_score=round(priority_score, 3),
                    recommendation=recommendation,
                )
            )

        results.sort(key=lambda x: x.priority_score, reverse=True)
        return results

    @classmethod
    def top_unknown(cls, ranked: list[UnknownPriority]) -> UnknownPriority | None:
        return ranked[0] if ranked else None

    @classmethod
    def verification_feasible(cls, state: RealityState) -> tuple[bool, str]:
        if state.verification_latency_min > state.decision_window_min:
            return False, (
                f"Verification ({state.verification_latency_min:.0f} min) exceeds "
                f"decision window ({state.decision_window_min} min) — proceed under uncertainty"
            )
        return True, "Verification feasible within decision window"
