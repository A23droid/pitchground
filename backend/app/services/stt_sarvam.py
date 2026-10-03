from __future__ import annotations

from pathlib import Path

import httpx

from app.config import SARVAM_API_KEY
from app.ml.types import Transcript
from app.storage.media import resolve_local_path


class SarvamTranscriber:
    def transcribe(self, audio_path: str, language_hint: str = "auto") -> Transcript:
        local = resolve_local_path(audio_path)
        path = Path(local) if local else Path()
        if not path.exists() or path.stat().st_size < 200:
            return Transcript(text="", language="unknown", confidence=None, segments=[])

        if not SARVAM_API_KEY:
            # Offline / missing key: fixture text so stub analyzer still runs
            return Transcript(
                text="(no STT key — stub mode) indexing helps queries by avoiding full table scans.",
                language="en",
                confidence=None,
                segments=[],
            )

        language_code = {
            "en": "en-IN",
            "hi": "hi-IN",
            "auto": "unknown",
        }.get(language_hint, "unknown")

        with path.open("rb") as fh:
            files = {"file": (path.name, fh, "audio/wav" if path.suffix == ".wav" else "audio/webm")}
            data = {
                "model": "saaras:v3",
                "mode": "verbatim",
                "language_code": language_code,
            }
            res = httpx.post(
                "https://api.sarvam.ai/speech-to-text",
                headers={"api-subscription-key": SARVAM_API_KEY},
                files=files,
                data=data,
                timeout=60,
            )
        if res.status_code >= 400:
            return Transcript(text="", language="unknown", confidence=None, segments=[])

        payload = res.json()
        text = str(payload.get("transcript") or "").strip()
        lang = str(payload.get("language_code") or "unknown")
        mapped = "en" if lang.startswith("en") else "hi" if lang.startswith("hi") else "unknown"
        return Transcript(
            text=text,
            language=mapped if mapped in ("en", "hi") else "unknown",
            confidence=None,
            segments=[],
        )
