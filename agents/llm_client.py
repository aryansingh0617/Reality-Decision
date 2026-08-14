import os
import json
import logging
import requests
from typing import Any, Optional, List, Dict

logger = logging.getLogger("reality_decision.llm")

_GEMINI_KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("OPENAI_API_KEY") or ""
_GEMINI_MODEL = "gemini-3.5-flash"

# Single authoritative source of truth for runtime mode
_llm_available = True
_llm_mode_active = True
_reasoning_mode = "LLM_AGENTIC"
_failure_reason: Optional[str] = None


def get_gemini_key() -> str:
    global _GEMINI_KEY
    return os.environ.get("GEMINI_API_KEY") or _GEMINI_KEY


def get_authoritative_status() -> Dict[str, Any]:
    global _llm_available, _llm_mode_active, _reasoning_mode, _failure_reason
    return {
        "llm_available": _llm_available,
        "llm_mode_active": _llm_mode_active,
        "reasoning_mode": _reasoning_mode,
        "provider": "gemini",
        "model": _GEMINI_MODEL,
        "failure_reason": _failure_reason,
    }


def set_llm_failure(reason: str):
    global _llm_available, _llm_mode_active, _reasoning_mode, _failure_reason
    _llm_available = False
    _llm_mode_active = False
    _reasoning_mode = "OFFLINE_DETERMINISTIC"
    _failure_reason = reason
    logger.info(f"LLM Status updated to OFFLINE_DETERMINISTIC (Reason: {reason})")


def set_llm_success():
    global _llm_available, _llm_mode_active, _reasoning_mode, _failure_reason
    _llm_available = True
    _llm_mode_active = True
    _reasoning_mode = "LLM_AGENTIC"
    _failure_reason = None


def is_llm_mode_active() -> bool:
    global _llm_mode_active
    return _llm_mode_active


def get_reasoning_mode_label() -> str:
    global _reasoning_mode, _failure_reason
    if _reasoning_mode == "LLM_AGENTIC":
        return f"LLM_AGENTIC ({_GEMINI_MODEL})"
    return f"OFFLINE_DETERMINISTIC — {_failure_reason or 'OFFLINE'}"


def get_openai_client():
    return None


def get_llm_client():
    return "GEMINI"


def call_openai_json(system_prompt: str, user_prompt: str) -> Optional[dict]:
    """Compatibility wrapper that calls Gemini with JSON output format."""
    return call_gemini_json(system_prompt, user_prompt)


def _clean_json_text(text: str) -> str:
    t = text.strip()
    if t.startswith("```json"):
        t = t[7:]
    elif t.startswith("```"):
        t = t[3:]
    if t.endswith("```"):
        t = t[:-3]
    return t.strip()


def call_gemini_json(system_prompt: str, user_prompt: str) -> Optional[dict]:
    key = get_gemini_key()
    if not key:
        set_llm_failure("NO_KEY")
        return None

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{_GEMINI_MODEL}:generateContent?key={key}"
    payload = {
        "systemInstruction": {
            "parts": [{"text": system_prompt}]
        },
        "contents": [
            {"role": "user", "parts": [{"text": user_prompt}]}
        ],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.1,
        }
    }

    try:
        r = requests.post(url, json=payload, timeout=(5, 30))
        if r.status_code == 200:
            data = r.json()
            candidates = data.get("candidates", [])
            if candidates:
                part_text = candidates[0]["content"]["parts"][0]["text"]
                cleaned = _clean_json_text(part_text)
                set_llm_success()
                return json.loads(cleaned)
            else:
                set_llm_failure("EMPTY_CANDIDATES")
                return None
        elif r.status_code == 429:
            logger.warning("Gemini API quota exceeded (429).")
            set_llm_failure("GEMINI QUOTA")
            return None
        else:
            logger.warning(f"Gemini API returned status {r.status_code}: {r.text[:200]}")
            set_llm_failure(f"HTTP_{r.status_code}")
            return None
    except Exception as e:
        logger.warning(f"Gemini API call failed: {e}")
        set_llm_failure("CONNECTION_ERROR")
        return None


def call_gemini_tool_step(system_prompt: str, contents: List[Dict[str, Any]], tools: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Single-turn or multi-turn tool calling against Gemini."""
    key = get_gemini_key()
    if not key:
        set_llm_failure("NO_KEY")
        return None

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{_GEMINI_MODEL}:generateContent?key={key}"
    payload = {
        "systemInstruction": {
            "parts": [{"text": system_prompt}]
        },
        "contents": contents,
        "tools": tools,
        "generationConfig": {
            "temperature": 0.1,
        }
    }

    try:
        r = requests.post(url, json=payload, timeout=(5, 30))
        if r.status_code == 200:
            data = r.json()
            candidates = data.get("candidates", [])
            if candidates:
                set_llm_success()
                return candidates[0]["content"]
            else:
                set_llm_failure("EMPTY_CANDIDATES")
                return None
        elif r.status_code == 429:
            logger.warning("Gemini tool calling quota exceeded (429).")
            set_llm_failure("GEMINI QUOTA")
            return None
        else:
            logger.warning(f"Gemini tool calling error {r.status_code}: {r.text[:200]}")
            set_llm_failure(f"HTTP_{r.status_code}")
            return None
    except Exception as e:
        logger.warning(f"Gemini tool step exception: {e}")
        set_llm_failure("CONNECTION_ERROR")
        return None
