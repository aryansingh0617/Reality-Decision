"""Mission policy engine — SAFE / BALANCED / URGENT modes."""

from core.state.reality_state import MissionPolicy


class PolicyEngine:
    """Policy modes are operational constraints, not moral judgments."""

    DESCRIPTIONS = {
        MissionPolicy.SAFE: "Prioritize catastrophic-risk avoidance. Prefer verified corridors.",
        MissionPolicy.BALANCED: "Trade risk, delay, and operational coverage.",
        MissionPolicy.URGENT: "Prioritize time-to-intervention. Accept higher uncertainty.",
    }

    @classmethod
    def describe(cls, policy: MissionPolicy) -> str:
        return cls.DESCRIPTIONS.get(policy, "")

    @classmethod
    def verification_threshold(cls, policy: MissionPolicy) -> float:
        """Minimum priority score to recommend verification wait."""
        return {MissionPolicy.SAFE: 0.3, MissionPolicy.BALANCED: 0.5, MissionPolicy.URGENT: 0.7}[policy]

    @classmethod
    def acceptable_uncertainty(cls, policy: MissionPolicy) -> bool:
        return policy in (MissionPolicy.BALANCED, MissionPolicy.URGENT)
