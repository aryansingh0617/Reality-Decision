"""Evidence conflict detection — never average contradictory sources."""

from __future__ import annotations

from dataclasses import dataclass

from core.evidence.evidence_store import EvidenceItem, EvidenceStore


@dataclass
class EvidenceConflict:
    entity: str
    source_count: int
    sources: list[str]
    claims: list[str]
    freshest_source: str
    highest_reliability_source: str
    decision_impact: str  # HIGH / MEDIUM / LOW
    recommended_action: str = "VERIFY"


class ConflictEngine:
    """Detect when evidence sources disagree — flag, don't resolve automatically."""

    ACCESS_EVENTS = {"access_restriction", "collapse", "operational", "passable", "blocked"}

    @classmethod
    def detect_conflicts(cls, store: EvidenceStore, impact_map: dict[str, str] | None = None) -> list[EvidenceConflict]:
        impact_map = impact_map or {}
        by_entity: dict[str, list[EvidenceItem]] = {}
        for item in store.items:
            by_entity.setdefault(item.entity, []).append(item)

        conflicts: list[EvidenceConflict] = []
        for entity, items in by_entity.items():
            statuses = {i.status for i in items if i.event in cls.ACCESS_EVENTS or i.status}
            if len(statuses) <= 1:
                continue
            # Conflicting claims
            freshest = min(items, key=lambda i: i.freshness_minutes)
            reliability_order = {"HIGH": 3, "MEDIUM": 2, "LOW": 1}
            highest_rel = max(items, key=lambda i: reliability_order.get(i.reliability.value, 0))
            conflicts.append(
                EvidenceConflict(
                    entity=entity,
                    source_count=len(items),
                    sources=[i.source for i in items],
                    claims=[f"{i.source}: {i.status} ({i.event})" for i in items],
                    freshest_source=freshest.source,
                    highest_reliability_source=highest_rel.source,
                    decision_impact=impact_map.get(entity, "HIGH"),
                    recommended_action="VERIFY",
                )
            )
        return conflicts

    @classmethod
    def has_conflict(cls, store: EvidenceStore, entity: str) -> bool:
        items = store.for_entity(entity)
        statuses = {i.status for i in items}
        return len(statuses) > 1
