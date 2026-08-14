"""Validation layer — schema, entity, and LLM output safety."""

from __future__ import annotations

import json
import re
from typing import Any

from core.state.entity_status import ConfidenceClass

VALID_ENTITIES = {
    "bridge_b07",
    "route_r12",
    "route_r14",
    "depot_d03",
    "depot_d04",
    "shelter_s04",
    "vehicle_v01",
    "gps_network",
}

VALID_EVENTS = {
    "access_restriction",
    "collapse",
    "operational",
    "passable",
    "blocked",
    "unavailable",
    "capacity_reduction",
    "weather_change",
    "gps_outage",
}

VALID_STATUSES = {"known", "unknown", "uncertain", "confirmed", "stale", "conflicting", "unavailable", "operational", "restricted"}


class ValidationError(Exception):
    pass


class SchemaValidator:
    """Structured output validation for evidence extraction."""

    REQUIRED_FIELDS = {"entity", "event", "status", "source", "confidence_class"}

    @classmethod
    def validate_evidence(cls, data: dict[str, Any], known_entities: set[str] | None = None) -> dict[str, Any]:
        known_entities = known_entities or VALID_ENTITIES
        if not isinstance(data, dict):
            raise ValidationError("Evidence must be a JSON object")

        missing = cls.REQUIRED_FIELDS - set(data.keys())
        if missing:
            raise ValidationError(f"Missing required fields: {missing}")

        entity = str(data["entity"])
        if entity not in known_entities:
            raise ValidationError(f"Invalid entity: {entity} — rejected (hallucination guard)")

        event = str(data["event"])
        if event not in VALID_EVENTS:
            raise ValidationError(f"Invalid event type: {event}")

        status = str(data["status"]).lower()
        if status not in VALID_STATUSES:
            raise ValidationError(f"Invalid status: {status}")

        conf = str(data.get("confidence_class", "MEDIUM")).upper()
        if conf not in {c.value for c in ConfidenceClass}:
            raise ValidationError(f"Invalid confidence_class: {conf}")

        return {
            "entity": entity,
            "event": event,
            "status": status,
            "source": str(data["source"]),
            "confidence_class": conf,
            "constraints": list(data.get("constraints", [])),
            "timestamp": data.get("timestamp", ""),
        }

    @classmethod
    def parse_llm_json(cls, raw: str, known_entities: set[str] | None = None) -> dict[str, Any]:
        """Parse and validate LLM JSON — reject malformed output."""
        cleaned = raw.strip()
        # Extract JSON from markdown fences if present
        fence = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned)
        if fence:
            cleaned = fence.group(1)
        try:
            data = json.loads(cleaned)
        except json.JSONDecodeError as e:
            raise ValidationError(f"Malformed JSON: {e}") from e
        return cls.validate_evidence(data, known_entities)

    @classmethod
    def validate_vehicle_exists(cls, vehicle_id: str, available_vehicles: set[str]) -> None:
        if vehicle_id not in available_vehicles:
            raise ValidationError(f"Vehicle {vehicle_id} does not exist — hallucination rejected")

    @classmethod
    def validate_no_direct_state_mutation(cls, agent_name: str, attempted_mutation: str) -> None:
        raise ValidationError(
            f"{agent_name} attempted direct state mutation: {attempted_mutation}. "
            "Agents must return structured outputs for orchestrator application."
        )
