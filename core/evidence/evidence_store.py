"""Evidence store with provenance, freshness, and reliability tracking."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from core.state.entity_status import ConfidenceClass, ReliabilityClass


@dataclass
class EvidenceItem:
    id: str
    entity: str
    event: str
    status: str
    constraints: list[str] = field(default_factory=list)
    source: str = ""
    timestamp: datetime = field(default_factory=datetime.now)
    confidence_class: ConfidenceClass = ConfidenceClass.MEDIUM
    reliability: ReliabilityClass = ReliabilityClass.MEDIUM
    raw_text: str = ""
    freshness_minutes: float = 0.0
    is_stale: bool = False


class EvidenceStore:
    """Append-only evidence store — LLM outputs land here after validation."""

    def __init__(self) -> None:
        self._items: list[EvidenceItem] = []

    @property
    def items(self) -> list[EvidenceItem]:
        return list(self._items)

    def add(self, item: EvidenceItem) -> None:
        self._items.append(item)

    def for_entity(self, entity_id: str) -> list[EvidenceItem]:
        return [i for i in self._items if i.entity == entity_id]

    def fresh_for_entity(self, entity_id: str, max_age_min: float = 10.0) -> list[EvidenceItem]:
        return [
            i for i in self.for_entity(entity_id)
            if not i.is_stale and i.freshness_minutes <= max_age_min
        ]

    def stale_for_entity(self, entity_id: str) -> list[EvidenceItem]:
        return [i for i in self.for_entity(entity_id) if i.is_stale]

    def latest_by_reliability(self, entity_id: str) -> EvidenceItem | None:
        items = self.for_entity(entity_id)
        if not items:
            return None
        order = {ReliabilityClass.HIGH: 3, ReliabilityClass.MEDIUM: 2, ReliabilityClass.LOW: 1}
        return max(items, key=lambda i: (order.get(i.reliability, 0), -i.freshness_minutes))

    def clear(self) -> None:
        self._items.clear()

    def to_dict_list(self) -> list[dict[str, Any]]:
        return [
            {
                "id": i.id,
                "entity": i.entity,
                "event": i.event,
                "status": i.status,
                "source": i.source,
                "confidence_class": i.confidence_class.value,
                "is_stale": i.is_stale,
            }
            for i in self._items
        ]
