import os
import json
import logging
import requests
from typing import Any, Optional, List, Dict, Tuple

logger = logging.getLogger("reality_decision.llm")

def _load_env():
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip())

_load_env()

_GEMINI_KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("OPENAI_API_KEY") or ""
_GEMINI_MODEL = "gemini-3.5-flash"

# Authoritative source of truth for runtime mode
_llm_available = True
_llm_mode_active = True
_reasoning_mode = "LLM_AGENTIC"
_failure_reason: Optional[str] = None
_simulated_fallback_forced = False


def get_gemini_key() -> str:
    global _GEMINI_KEY
    return os.environ.get("GEMINI_API_KEY") or _GEMINI_KEY


def toggle_simulated_fallback(force_fallback: Optional[bool] = None) -> bool:
    global _simulated_fallback_forced, _reasoning_mode, _failure_reason, _llm_mode_active
    if force_fallback is None:
        _simulated_fallback_forced = not _simulated_fallback_forced
    else:
        _simulated_fallback_forced = force_fallback

    if _simulated_fallback_forced:
        _llm_mode_active = False
        _reasoning_mode = "DETERMINISTIC_FALLBACK"
        _failure_reason = "SIMULATED_DEMO_FAILURE"
        logger.info("Simulated API failure forced: switching to DETERMINISTIC_FALLBACK")
    else:
        set_llm_success()
        logger.info("Simulated API failure cleared: returning to LLM_AGENTIC")

    return _simulated_fallback_forced


def get_authoritative_status() -> Dict[str, Any]:
    global _llm_available, _llm_mode_active, _reasoning_mode, _failure_reason, _simulated_fallback_forced
    if _simulated_fallback_forced:
        return {
            "llm_available": False,
            "llm_mode_active": False,
            "reasoning_mode": "DETERMINISTIC_FALLBACK",
            "provider": "gemini",
            "model": _GEMINI_MODEL,
            "failure_reason": "SIMULATED_DEMO_FAILURE",
            "simulated_fallback_forced": True,
        }
    return {
        "llm_available": _llm_available,
        "llm_mode_active": _llm_mode_active,
        "reasoning_mode": _reasoning_mode,
        "provider": "gemini",
        "model": _GEMINI_MODEL,
        "failure_reason": _failure_reason,
        "simulated_fallback_forced": False,
    }


def set_llm_failure(reason: str):
    global _llm_available, _llm_mode_active, _reasoning_mode, _failure_reason
    _llm_available = False
    _llm_mode_active = False
    _reasoning_mode = "DETERMINISTIC_FALLBACK"
    _failure_reason = reason
    logger.info(f"LLM Status updated to DETERMINISTIC_FALLBACK (Reason: {reason})")


def set_llm_success():
    global _llm_available, _llm_mode_active, _reasoning_mode, _failure_reason, _simulated_fallback_forced
    if not _simulated_fallback_forced:
        _llm_available = True
        _llm_mode_active = True
        _reasoning_mode = "LLM_AGENTIC"
        _failure_reason = None


def is_llm_mode_active() -> bool:
    global _llm_mode_active, _simulated_fallback_forced
    if _simulated_fallback_forced:
        return False
    return _llm_mode_active


def get_reasoning_mode_label() -> str:
    global _reasoning_mode, _failure_reason
    if _reasoning_mode == "LLM_AGENTIC":
        return f"LLM_AGENTIC ({_GEMINI_MODEL})"
    return f"DETERMINISTIC_FALLBACK — {_failure_reason or 'OFFLINE'}"


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
    if _simulated_fallback_forced:
        set_llm_failure("SIMULATED_DEMO_FAILURE")
        return None

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
            "temperature": 0.0,
        }
    }

    try:
        r = requests.post(url, json=payload, timeout=(3, 8))
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
            set_llm_failure("GEMINI_QUOTA_EXCEEDED")
            return None
        else:
            logger.warning(f"Gemini API returned status {r.status_code}: {r.text[:200]}")
            set_llm_failure(f"HTTP_{r.status_code}")
            return None
    except requests.exceptions.Timeout:
        logger.warning("Gemini API call timed out (>8s).")
        set_llm_failure("TIMEOUT_EXCEEDED_8S")
        return None
    except Exception as e:
        logger.warning(f"Gemini API call failed: {e}")
        set_llm_failure("CONNECTION_ERROR")
        return None


def call_gemini_tool_step(
    system_prompt: str,
    contents: List[Dict[str, Any]],
    tools: List[Dict[str, Any]],
    temperature: float = 0.0,
    timeout_sec: float = 8.0,
) -> Tuple[Optional[Dict[str, Any]], Dict[str, int]]:
    """
    Single-turn tool calling against Gemini with strict timeout and usage telemetry extraction.
    Returns (content_dict, usage_metadata_dict).
    """
    empty_usage = {"prompt_tokens": 0, "candidates_tokens": 0, "total_tokens": 0}

    if _simulated_fallback_forced:
        set_llm_failure("SIMULATED_DEMO_FAILURE")
        return None, empty_usage

    key = get_gemini_key()
    if not key:
        set_llm_failure("NO_KEY")
        return None, empty_usage

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{_GEMINI_MODEL}:generateContent?key={key}"
    payload = {
        "systemInstruction": {
            "parts": [{"text": system_prompt}]
        },
        "contents": contents,
        "tools": tools,
        "generationConfig": {
            "temperature": temperature,
        }
    }

    try:
        r = requests.post(url, json=payload, timeout=(3, timeout_sec))
        if r.status_code == 200:
            data = r.json()
            candidates = data.get("candidates", [])
            usage_raw = data.get("usageMetadata", {})
            usage = {
                "prompt_tokens": usage_raw.get("promptTokenCount", 0),
                "candidates_tokens": usage_raw.get("candidatesTokenCount", 0),
                "total_tokens": usage_raw.get("totalTokenCount", 0),
            }
            if candidates:
                set_llm_success()
                return candidates[0]["content"], usage
            else:
                set_llm_failure("EMPTY_CANDIDATES")
                return None, usage
        elif r.status_code == 429:
            logger.warning("Gemini tool calling quota exceeded (429).")
            set_llm_failure("GEMINI_QUOTA_EXCEEDED")
            return None, empty_usage
        else:
            logger.warning(f"Gemini tool calling error {r.status_code}: {r.text[:200]}")
            set_llm_failure(f"HTTP_{r.status_code}")
            return None, empty_usage
    except requests.exceptions.Timeout:
        logger.warning(f"Gemini tool step timed out (>{timeout_sec}s).")
        set_llm_failure(f"TIMEOUT_EXCEEDED_{int(timeout_sec)}S")
        return None, empty_usage
    except Exception as e:
        logger.warning(f"Gemini tool step exception: {e}")
        set_llm_failure("CONNECTION_ERROR")
        return None, empty_usage
