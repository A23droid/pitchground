from __future__ import annotations

import re
from app.ml.types import LanguageSignals, Transcript

ENGLISH_FILLERS = {
    "um", "uh", "ahh", "er", "hmm", "like", "you know", "actually",
    "basically", "so yeah", "i mean", "sort of", "kind of"
}

HINDI_FILLERS = {
    "मतलब", "matlab", "यार", "yaar", "वो", "woh", "अरे", "arre",
    "हम्म", "hmmm", "अच्छा", "achha", "मतलब की", "toh basically"
}


class LanguageExtractor:
    """Extracts linguistic signals, filler rates (English + Hindi), and code-switching metrics."""

    def extract(self, transcript: Transcript, practice_language: str = "en") -> tuple[LanguageSignals, float]:
        text = transcript.text.lower()
        if not text.strip():
            return LanguageSignals(primary="en", primary_ratio=1.0, code_switch_rate=0.0), 0.0

        # Tokenize words
        tokens = re.findall(r"[\w']+|[^\w\s]", text)
        words = [t for t in tokens if re.match(r"^\w+$", t)]
        total_words = max(1, len(words))

        # Count fillers across single-token and multi-token phrases
        filler_hits = 0
        all_fillers = ENGLISH_FILLERS.union(HINDI_FILLERS)
        for filler in all_fillers:
            if " " in filler:
                filler_hits += len(re.findall(r"\b" + re.escape(filler) + r"\b", text))
            else:
                filler_hits += words.count(filler)

        filler_rate = round((filler_hits / total_words) * 100.0, 2)

        # Code-switching check (Hindi Devanagari script or Hindi romanized markers)
        hindi_char_count = len(re.findall(r"[\u0900-\u097F]", text))
        hindi_roman_count = sum(words.count(w) for w in ["hai", "nahi", "kya", "aur", "toh", "kaise", "hota", "bhi"])

        primary = "en"
        primary_ratio = 1.0
        code_switch_rate = 0.05

        if hindi_char_count > 0 or hindi_roman_count > 2:
            hindi_indicator_ratio = (hindi_char_count + hindi_roman_count * 4) / max(1, len(text))
            if hindi_indicator_ratio > 0.45:
                primary = "hi"
                primary_ratio = round(min(1.0, hindi_indicator_ratio), 2)
                code_switch_rate = 0.10
            elif hindi_indicator_ratio > 0.08:
                primary = "mixed"
                primary_ratio = 0.55
                code_switch_rate = round(min(1.0, hindi_indicator_ratio * 2.0), 2)

        return LanguageSignals(
            primary=primary,  # type: ignore[arg-type]
            primary_ratio=primary_ratio,
            code_switch_rate=code_switch_rate,
        ), filler_rate
