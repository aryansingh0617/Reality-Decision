"""Escalation Agent — Handles external emergency escalation requests when local constraints fail."""

from __future__ import annotations
from typing import Any, Dict
from core.state.reality_state import RealityState


class EscalationAgent:
    """Generates structured emergency escalation packets when local solutions are impossible."""

    @staticmethod
    def evaluate_escalation(state: RealityState, demand: int = 25) -> Dict[str, Any] | None:
        available_vehicles = [v for v in state.vehicles.values() if v.available]
        total_capacity = sum(v.capacity for v in available_vehicles)

        if not available_vehicles or total_capacity < demand:
            return {
                "action": "ESCALATE",
                "status": "LOCAL_SOLUTION_IMPOSSIBLE",
                "destination": "STATE_EMERGENCY_RESERVES",
                "request": f"{demand - total_capacity} capacity units / Airlift Support",
                "reason": f"Local vehicle capacity ({total_capacity}) is below required evacuation demand ({demand})",
                "severity": "CRITICAL",
                "timestamp": state.now().isoformat(),
            }
        return None
