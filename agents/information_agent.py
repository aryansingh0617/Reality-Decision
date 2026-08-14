import logging
from dataclasses import dataclass
from typing import List, Optional
from core.state.reality_state import RealityState, EntityStatus
from agents.llm_client import is_llm_mode_active, call_openai_json

logger = logging.getLogger("reality_decision.information_agent")

@dataclass
class InformationGap:
    entity_id: str
    label: str
    value_score: float  # 0.0 to 1.0
    reason: str
    impact_if_confirmed: str
    impact_if_refuted: str

class InformationValueAgent:
    """Agent that identifies high-value missing information and quantifies its decision-changing impact."""

    @classmethod
    def evaluate_gaps(cls, state: RealityState) -> List[InformationGap]:
        if is_llm_mode_active():
            return cls._evaluate_llm(state)
        return cls._evaluate_fallback(state)

    @classmethod
    def _evaluate_fallback(cls, state: RealityState) -> List[InformationGap]:
        gaps: List[InformationGap] = []
        
        # Check Bridge B-07 status
        b07_status = state.get_entity_status("bridge_b07")
        if b07_status in (EntityStatus.CONFLICTING, EntityStatus.UNCERTAIN, EntityStatus.UNKNOWN):
            gaps.append(InformationGap(
                entity_id="bridge_b07",
                label="Bridge B-07 Passability Confirmation",
                value_score=0.92,
                reason="Bridge B-07 is the single point of failure for Route R-12 (Fast Corridor).",
                impact_if_confirmed="Enables immediate 15-minute evacuation via Route R-12, saving 20 minutes over detour.",
                impact_if_refuted="Forces full commitment to Route R-14 detour, eliminating false corridor hope."
            ))

        # Check Route R-14 passability
        r14_status = state.get_entity_status("route_r14")
        if r14_status in (EntityStatus.KNOWN, EntityStatus.UNCERTAIN, EntityStatus.UNKNOWN):
            gaps.append(InformationGap(
                entity_id="route_r14",
                label="Route R-14 Heavy Truck Load Rating",
                value_score=0.85,
                reason="Route R-14 is the primary alternate detour corridor.",
                impact_if_confirmed="Guarantees safe passage for Rescue Truck V-02 with 10-slot capacity.",
                impact_if_refuted="Triggers immediate capacity gap escalation and state emergency request."
            ))

        # Check Rescue Truck V-02 status
        v02 = state.vehicles.get("vehicle_v02")
        if v02 and not v02.available:
            gaps.append(InformationGap(
                entity_id="vehicle_v02",
                label="Rescue Truck V-02 Repair ETA",
                value_score=0.78,
                reason="Vehicle V-02 is the sole local transport asset.",
                impact_if_confirmed="Restores local evacuation capacity within decision window.",
                impact_if_refuted="Confirms external airlift escalation is strictly required."
            ))

        # Sort by value_score descending
        gaps.sort(key=lambda x: x.value_score, reverse=True)
        return gaps

    @classmethod
    def _evaluate_llm(cls, state: RealityState) -> List[InformationGap]:
        prompt = f"""
Analyze the operational state for the Assam Flood Response mission and identify top 3 high-value missing information items.

Mission State:
- Weather: {state.weather}
- Unknowns: {state.unknowns}
- Active Conflicts: {state.conflicts}
- Routes: {list(state.routes.keys())}
- Vehicles: {list(state.vehicles.keys())}

Respond ONLY in JSON matching this schema:
{{
  "gaps": [
    {{
      "entity_id": "string",
      "label": "string",
      "value_score": float (0.0 to 1.0),
      "reason": "string",
      "impact_if_confirmed": "string",
      "impact_if_refuted": "string"
    }}
  ]
}}
"""
        sys_prompt = "You are the Information Value Agent in an emergency multi-agent decision system."
        result = call_openai_json(sys_prompt, prompt)
        if not result or "gaps" not in result:
            return cls._evaluate_fallback(state)
        
        try:
            gaps = []
            for item in result["gaps"]:
                gaps.append(InformationGap(
                    entity_id=item.get("entity_id", "unknown"),
                    label=item.get("label", "Missing Info"),
                    value_score=float(item.get("value_score", 0.5)),
                    reason=item.get("reason", ""),
                    impact_if_confirmed=item.get("impact_if_confirmed", ""),
                    impact_if_refuted=item.get("impact_if_refuted", "")
                ))
            gaps.sort(key=lambda x: x.value_score, reverse=True)
            return gaps
        except Exception as e:
            logger.error(f"Error parsing LLM InformationGap: {e}")
            return cls._evaluate_fallback(state)
