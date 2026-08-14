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
        re.compile(r"bridge\s*(?:b-?07|07).*(?:submerged|collapsed|blocked|cannot cross|access.?restrict)", re.I),
        {
            "entity": "bridge_b07",
            "event": "access_restriction",
            "status": "unknown",
            "constraints": ["heavy_vehicle_restricted"],
            "confidence_class": "MEDIUM",
        },
    ),
    (
        re.compile(r"bridge\s*(?:b-?07|07).*(?:intact|operational|passable|appears fine)", re.I),
        {
            "entity": "bridge_b07",
            "event": "operational",
            "status": "operational",
            "constraints": [],
            "confidence_class": "MEDIUM",
        },
    ),
    (
        re.compile(r"vehicle\s*(?:v-?01|12).*(?:unavailable|broken|lost|offline|flooded)", re.I),
        {
            "entity": "vehicle_v01",
            "event": "unavailable",
            "status": "unavailable",
            "constraints": [],
            "confidence_class": "HIGH",
        },
    ),
    (
        re.compile(r"weather.*(?:deteriorat|worsen|flood|heavy rain)", re.I),
        {
            "entity": "route_r14",
            "event": "weather_change",
            "status": "uncertain",
            "constraints": ["weather_delay"],
            "confidence_class": "MEDIUM",
        },
    ),
    (
        re.compile(r"shelter\s*s-?04.*(?:capacity|full|collapse|evacuate)", re.I),
        {
            "entity": "shelter_s04",
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
            "entity": "bridge_b07",
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
            "entity": "bridge_b07",
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
        from agents.llm_client import call_openai_json
        from core.validation.schema import SchemaValidator
        
        system_prompt = (
            "You are an Evidence Extraction Agent for a disaster response operations command center.\n"
            "Your task is to analyze unstructured reports and extract a structured evidence fact.\n"
            "You MUST return a JSON object with the following fields and no other keys:\n"
            "{\n"
            "  \"entity\": \"bridge_b07\" | \"route_r12\" | \"route_r14\" | \"depot_d03\" | \"depot_d04\" | \"shelter_s04\" | \"vehicle_v01\" | \"gps_network\" (MUST be exactly one of these, do not invent any others),\n"
            "  \"event\": \"access_restriction\" | \"collapse\" | \"operational\" | \"passable\" | \"blocked\" | \"unavailable\" | \"capacity_reduction\" | \"weather_change\" | \"gps_outage\",\n"
            "  \"status\": \"known\" | \"unknown\" | \"uncertain\" | \"confirmed\" | \"stale\" | \"conflicting\" | \"unavailable\" | \"operational\" | \"restricted\",\n"
            "  \"source\": \"string\" (the reporter or sensor name, e.g., 'field_scout_02'),\n"
            "  \"confidence_class\": \"HIGH\" | \"MEDIUM\" | \"LOW\",\n"
            "  \"constraints\": [\"string\"] (optional, list of constraints mentioned like 'heavy_vehicle_restricted')\n"
            "}\n"
            "CRITICAL: Do NOT invent resources. Do NOT output markdown formatting other than raw JSON."
        )
        
        user_prompt = f"Extract evidence from raw report: '{raw_text}'\nDefault source to: '{source}'"
        
        data = call_openai_json(system_prompt, user_prompt)
        if not data:
            return None
            
        try:
            # Validate the JSON output to ensure it matches allowed entities and formats
            validated = SchemaValidator.validate_evidence(data)
            return validated
        except Exception as e:
            # Fall back if it doesn't pass validation
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
