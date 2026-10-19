from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from threading import Lock
from typing import Any, Literal
import httpx
from app.config import OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL

LLMRole = Literal["questions", "answers", "coaching", "debate"]

class LLMError(RuntimeError):
    def __init__(self, code: str, role: str, retry_after: int | None = None):
        self.code, self.role, self.retry_after = code, role, retry_after
        messages = {
            "not_configured": "The AI service for this step is not configured.",
            "rate_limited": "The AI provider is busy. Retry after the indicated wait.",
            "credentials_rejected": "The AI provider rejected the credentials for this step.",
            "provider_unavailable": "The AI provider is temporarily unavailable. Please retry.",
            "invalid_response": "The AI provider returned an invalid response. Please retry.",
        }
        super().__init__(messages[code])

@dataclass(frozen=True)
class LLMSettings:
    api_key: str
    base_url: str
    model: str
    timeout: float
    max_tokens: int


def settings_for(role: LLMRole) -> LLMSettings:
    prefix = f"GROQ_{role.upper()}"
    key = os.getenv(f"{prefix}_API_KEY", "").strip() or os.getenv("GROQ_API_KEY", "").strip() or OPENAI_API_KEY
    base = os.getenv("GROQ_BASE_URL", "").strip() or ("https://api.groq.com/openai/v1" if os.getenv(f"{prefix}_API_KEY") or os.getenv("GROQ_API_KEY") else OPENAI_BASE_URL)
    model = os.getenv(f"{prefix}_MODEL", "").strip() or os.getenv("GROQ_MODEL", "").strip() or OPENAI_MODEL
    return LLMSettings(key, base.rstrip("/"), model, float(os.getenv("LLM_TIMEOUT_SECONDS", "45")), int(os.getenv("LLM_MAX_COMPLETION_TOKENS", "4096")))

_cooldowns: dict[tuple[str, str], float] = {}
_lock = Lock()


def _retry_seconds(value: str | None) -> int:
    if value:
        try: return max(1, int(float(value)))
        except ValueError:
            try: return max(1, int((parsedate_to_datetime(value)-datetime.now(timezone.utc)).total_seconds()))
            except (TypeError, ValueError): pass
    return 60


def chat_json(system: str, user: str, *, role: LLMRole = "coaching") -> dict[str, Any]:
    cfg = settings_for(role)
    if not cfg.api_key: raise LLMError("not_configured", role)
    bucket = (cfg.base_url, cfg.model)
    with _lock:
        remaining = _cooldowns.get(bucket, 0)-time.monotonic()
    if remaining > 0: raise LLMError("rate_limited", role, max(1, int(remaining)+1))
    payload = {"model": cfg.model, "temperature": 0.3,
               "max_completion_tokens": cfg.max_tokens,
               "response_format": {"type": "json_object"},
               "messages": [{"role":"system","content":system},{"role":"user","content":user}]}
    # Retry only transient transport/5xx failures, using the SAME configured credential.
    for attempt in range(2):
        try:
            response = httpx.post(f"{cfg.base_url}/chat/completions", headers={"Authorization":f"Bearer {cfg.api_key}"}, json=payload, timeout=cfg.timeout)
        except httpx.RequestError as exc:
            if attempt == 0:
                time.sleep(.25)
                continue
            raise LLMError("provider_unavailable",role) from exc
        if response.status_code == 429:
            retry = _retry_seconds(response.headers.get("retry-after"))
            with _lock: _cooldowns[bucket] = time.monotonic()+retry
            raise LLMError("rate_limited",role,retry)
        if response.status_code in (401,403): raise LLMError("credentials_rejected",role)
        if response.status_code >= 500 and attempt == 0:
            time.sleep(.25)
            continue
        if response.status_code >= 400: raise LLMError("provider_unavailable",role)
        try:
            parsed = json.loads(response.json()["choices"][0]["message"]["content"])
            if not isinstance(parsed,dict): raise ValueError("Expected object")
            return parsed
        except (ValueError,KeyError,IndexError,TypeError) as exc:
            raise LLMError("invalid_response",role) from exc
    raise LLMError("provider_unavailable",role)
