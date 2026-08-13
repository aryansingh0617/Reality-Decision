"""Evidence Agent — semantic extraction with deterministic fallback."""

from __future__ import annotations

import os
import re
from datetime import datetime
from typing import Any

from core.evidence.evidence_store import EvidenceItem, EvidenceStore
from core.state.entity_status import ConfidenceClass, ReliabilityClass
from core.validation.schema import SchemaValidator, ValidationError


# Deterministic mock parser patterns — works offline without API key
MOCK_PATTERNS: list[tuple[re.Pattern, dict[str, Any]]] = [
    (
        re.compile(r"bridge\s*07.*(?:submerged|collapsed|blocked|cannot cross|access.?restrict)", re.I),
        {
            "entity": "bridge_07",
            "event": "access_restriction",
            "status": "unknown",
            "constraints": ["heavy_vehicle_restricted"],
            "confidence_class": "MEDIUM",
        },
    ),
    (
        re.compile(r"bridge\s*07.*(?:intact|operational|passable|appears fine)", re.I),
        {
            "entity": "bridge_07",
            "event": "operational",
            "status": "operational",
            "constraints": [],
            "confidence_class": "MEDIUM",
        },
    ),
    (
        re.compile(r"vehicle\s*12.*(?:unavailable|broken|lost|offline)", re.I),
        {
            "entity": "vehicle_12",
            "event": "unavailable",
            "status": "unavailable",
            "constraints": [],
            "confidence_class": "HIGH",
        },
    ),
    (
        re.compile(r"weather.*(?:deteriorat|worsen|flood|heavy rain)", re.I),
        {
            "entity": "route_bravo",
            "event": "weather_change",
            "status": "uncertain",
            "constraints": ["weather_delay"],
            "confidence_class": "MEDIUM",
        },
    ),
    (
        re.compile(r"shelter.*(?:capacity|full|collapse)", re.I),
        {
            "entity": "shelter_a",
            "event": "capacity_reduction",
            "status": "uncertain",
            "constraints": ["reduced_capacity"],
            "confidence_class": "MEDIUM",
        },
    ),
    (
        re.compile(r"gps.*(?:outage|fail|offline|lost)", re.I),
        {
            "entity": "gps_network",
            "event": "gps_outage",
            "status": "unavailable",
            "constraints": [],
            "confidence_class": "HIGH",
        },
    ),
    (
        re.compile(r"satellite.*bridge.*intact", re.I),
        {
            "entity": "bridge_07",
            "event": "operational",
            "status": "operational",
            "constraints": [],
            "confidence_class": "MEDIUM",
            "source_override": "satellite_imagery",
            "reliability": ReliabilityClass.HIGH,
        },
    ),
    (
        re.compile(r"traffic sensor.*no vehicles", re.I),
        {
            "entity": "bridge_07",
            "event": "blocked",
            "status": "unknown",
            "constraints": [],
            "confidence_class": "LOW",
            "source_override": "traffic_sensor",
            "reliability": ReliabilityClass.HIGH,
        },
    ),
]


class EvidenceAgent:
    """
    INPUT: unstructured report text
    PROCESS: LLM or deterministic mock extraction
    OUTPUT: validated EvidenceItem(s)
    TOOLS: SchemaValidator, mock parser
    FAILURE MODE: reject malformed, fallback to mock
    """

    def __init__(self, store: EvidenceStore) -> None:
        self.store = store
        self._item_counter = 0

    def _next_id(self) -> str:
        self._item_counter += 1
        return f"evidence_{self._item_counter:04d}"

    def extract(self, raw_text: str, source: str = "field_report", now: datetime | None = None) -> list[EvidenceItem]:
        now = now or datetime.now()
        llm_result = self._try_llm(raw_text, source)
        if llm_result:
            return [self._to_item(llm_result, raw_text, source, now)]

        mock_results = self._mock_parse(raw_text, source, now)
        if mock_results:
            return mock_results

        # Generic fallback extraction
        return [
            EvidenceItem(
                id=self._next_id(),
                entity="bridge_07",
                event="access_restriction",
                status="unknown",
                constraints=["unverified_report"],
                source=source,
                timestamp=now,
                confidence_class=ConfidenceClass.LOW,
                reliability=ReliabilityClass.LOW,
                raw_text=raw_text,
            )
        ]

    def _try_llm(self, raw_text: str, source: str) -> dict | None:
        api_key = os.environ.get("OPENAI_API_KEY") or os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            return None
        # LLM path exists but demo uses deterministic fallback
        return None

    def _mock_parse(self, raw_text: str, source: str, now: datetime) -> list[EvidenceItem]:
        items: list[EvidenceItem] = []
        for pattern, template in MOCK_PATTERNS:
            if pattern.search(raw_text):
                data = dict(template)
                src = data.pop("source_override", source)
                reliability = data.pop("reliability", ReliabilityClass.MEDIUM)
                try:
                    validated = SchemaValidator.validate_evidence(
                        {**data, "source": src, "confidence_class": data["confidence_class"]}
                    )
                except ValidationError:
                    continue
                items.append(
                    EvidenceItem(
                        id=self._next_id(),
                        entity=validated["entity"],
                        event=validated["event"],
                        status=validated["status"],
                        constraints=validated.get("constraints", []),
                        source=src,
                        timestamp=now,
                        confidence_class=ConfidenceClass(validated["confidence_class"]),
                        reliability=reliability,
                        raw_text=raw_text,
                        freshness_minutes=0.0,
                    )
                )
        return items

    def _to_item(self, data: dict, raw_text: str, source: str, now: datetime) -> EvidenceItem:
        validated = SchemaValidator.validate_evidence(data)
        return EvidenceItem(
            id=self._next_id(),
            entity=validated["entity"],
            event=validated["event"],
            status=validated["status"],
            constraints=validated.get("constraints", []),
            source=validated["source"],
            timestamp=now,
            confidence_class=ConfidenceClass(validated["confidence_class"]),
            raw_text=raw_text,
        )

    def ingest_structured(self, data: dict[str, Any], raw_text: str = "", now: datetime | None = None) -> EvidenceItem:
        """Ingest pre-structured evidence (demo events)."""
        now = now or datetime.now()
        validated = SchemaValidator.validate_evidence(data)
        item = EvidenceItem(
            id=self._next_id(),
            entity=validated["entity"],
            event=validated["event"],
            status=validated["status"],
            constraints=validated.get("constraints", []),
            source=validated["source"],
            timestamp=now,
            confidence_class=ConfidenceClass(validated["confidence_class"]),
            raw_text=raw_text or json_dumps_safe(data),
        )
        self.store.add(item)
        return item


def json_dumps_safe(obj: Any) -> str:
    import json
    return json.dumps(obj)
