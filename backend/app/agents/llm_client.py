from __future__ import annotations

import json
from typing import Any

import httpx

from app.config import OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL


def chat_json(system: str, user: str) -> dict[str, Any] | None:
    if not OPENAI_API_KEY:
        return None
    try:
        res = httpx.post(
            f"{OPENAI_BASE_URL}/chat/completions",
            headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
            json={
                "model": OPENAI_MODEL,
                "temperature": 0.3,
                "response_format": {"type": "json_object"},
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
            },
            timeout=45,
        )
        if res.status_code >= 400:
            return None
        content = res.json()["choices"][0]["message"]["content"]
        return json.loads(content)
    except Exception:
        return None
