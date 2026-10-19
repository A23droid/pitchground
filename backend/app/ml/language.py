from __future__ import annotations

import re
from app.ml.types import LanguageSignals, Transcript


class LanguageExtractor:
    """Count observed vocal fillers separately from silent pauses and repeated words.

    Script-based language proportions are estimates; romanized code-switches require
    a multilingual language identifier and are not reliably detected by this rule.
    """
    _FILLERS = re.compile(
        r"(?<!\w)(?:u+h+|u+m+|e+r+m*|h+m+|a+h+h*|you know|i mean|sort of|kind of|"
        r"basically|actually|matlab|yaar|मतलब|हम्म|അങ്ങനെ)(?!\w)", re.IGNORECASE)

    def extract(self, transcript: Transcript, practice_language: str = "en") -> tuple[LanguageSignals, float]:
        text = transcript.text.strip()
        words = re.findall(r"\S+", text)
        if not words:
            return LanguageSignals(primary="unknown", primary_ratio=None, code_switch_rate=None), 0.0
        filler_rate = round(len(self._FILLERS.findall(text)) / len(words) * 100, 2)
        labels = []
        for word in words:
            if re.search(r"[\u0900-\u097f]", word):
                labels.append("hi")
            elif re.search(r"[\u0d00-\u0d7f]", word):
                labels.append("ml")
            elif re.search(r"[a-zA-Z]", word):
                labels.append(transcript.language if transcript.language not in ("en", "mixed", "unknown", "") and not re.search(r"[\u0900-\u097f\u0d00-\u0d7f]", text) else "en")
        if not labels:
            return LanguageSignals(primary="unknown", primary_ratio=None, code_switch_rate=None), filler_rate
        counts = {label: labels.count(label) for label in set(labels)}
        primary = max(counts, key=counts.get)
        target = practice_language if practice_language not in ("auto", "mixed", "unknown") else primary
        ratio = counts.get(target, 0) / len(labels)
        duration = max((s.end_sec for s in transcript.segments), default=0)
        switches = sum(a != b for a, b in zip(labels, labels[1:]))
        return LanguageSignals(primary="mixed" if len(counts) > 1 else primary,
                               primary_ratio=round(ratio, 3),
                               code_switch_rate=round(switches * 60 / duration, 3) if duration else None), filler_rate
