from __future__ import annotations

import re
from app.ml.types import LanguageSignals, Transcript


class LanguageExtractor:
    """Dynamic, model-driven linguistic analysis for speech disfluency, filler rates, 
    and multilingual code-switching without hardcoded word dictionaries.
    """

    # Phonetic hesitation pattern: open vowel vocalizations, nasal drawls, elongations, and hesitation tokens
    _PHONETIC_DISFLUENCY = re.compile(
        r"^(?:[aeiou]+[hmrn]*|[hm]+|uh+|um+|ah+|eh+|er+|mm+|hmm+|ooh+|aar+|a+h+)[.?!,]*$",
        re.IGNORECASE,
    )

    def extract(self, transcript: Transcript, practice_language: str = "en") -> tuple[LanguageSignals, float]:
        text = transcript.text.strip()
        if not text:
            return LanguageSignals(primary="en", primary_ratio=1.0, code_switch_rate=0.0), 0.0

        # 1. Tokenize words from transcript
        tokens = re.findall(r"[\w']+|[^\w\s]", text)
        words = [t.lower() for t in tokens if re.match(r"^\w+$", t)]
        total_words = max(1, len(words))

        disfluent_word_indices: set[int] = set()

        # 2. Phonetic vocalized pauses (vowel/nasal hesitations across any language)
        for idx, w in enumerate(words):
            if self._PHONETIC_DISFLUENCY.match(w):
                disfluent_word_indices.add(idx)

        # 3. Lexical repetition / Stuttering (language-agnostic: word_i == word_{i-1})
        for idx in range(1, len(words)):
            if words[idx] == words[idx - 1]:
                disfluent_word_indices.add(idx)
            # Repeated 2-word phrase stutter: "in the in the"
            elif idx >= 3 and words[idx] == words[idx - 2] and words[idx - 1] == words[idx - 3]:
                disfluent_word_indices.add(idx)
                disfluent_word_indices.add(idx - 1)

        # 4. Incomplete word fragments / false starts (e.g. "th-", "wh-")
        for idx, tok in enumerate(tokens):
            if tok.endswith("-") and len(tok) > 1 and idx < len(words):
                disfluent_word_indices.add(idx)

        # 5. Acoustic word-timing hesitations (if word timestamps are available from Whisper)
        if transcript.words and len(transcript.words) > 1:
            for i in range(1, len(transcript.words)):
                prev_w = transcript.words[i - 1]
                curr_w = transcript.words[i]
                gap = curr_w.start_sec - prev_w.end_sec
                # Unnatural hesitation gap between words without terminal punctuation
                if gap >= 0.45:
                    if i < len(words):
                        disfluent_word_indices.add(i)
                # Word prolongation (drawn-out hesitation syllable)
                duration = curr_w.end_sec - curr_w.start_sec
                if duration >= 0.60 and len(curr_w.word) <= 3:
                    if i < len(words):
                        disfluent_word_indices.add(i)

        filler_rate = round((len(disfluent_word_indices) / total_words) * 100.0, 2)

        # 6. Dynamic Language Identification & Code-Switching Detection
        # Use Whisper model's detected language if available
        whisper_lang = (transcript.language or "en").lower()
        
        # Analyze unicode scripts present in the transcript (Latin vs Indic scripts vs others)
        indic_scripts = {
            "hi": r"[\u0900-\u097F]",  # Devanagari (Hindi, Marathi, Nepali)
            "bn": r"[\u0980-\u09FF]",  # Bengali, Assamese
            "pa": r"[\u0A00-\u0A7F]",  # Gurmukhi (Punjabi)
            "gu": r"[\u0A80-\u0AFF]",  # Gujarati
            "or": r"[\u0B00-\u0B7F]",  # Oriya
            "ta": r"[\u0B80-\u0BFF]",  # Tamil
            "te": r"[\u0C00-\u0C7F]",  # Telugu
            "kn": r"[\u0C80-\u0CFF]",  # Kannada
            "ml": r"[\u0D00-\u0D7F]",  # Malayalam
            "ur": r"[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]",  # Perso-Arabic (Urdu)
        }

        script_counts: dict[str, int] = {}
        for code, pattern in indic_scripts.items():
            cnt = len(re.findall(pattern, text))
            if cnt > 0:
                script_counts[code] = cnt

        latin_chars = len(re.findall(r"[a-zA-Z]", text))
        indic_chars = sum(script_counts.values())
        total_script_chars = max(1, indic_chars + latin_chars)

        top_indic_lang = max(script_counts, key=script_counts.get) if script_counts else None
        top_indic_count = script_counts[top_indic_lang] if top_indic_lang else 0
        indic_ratio = top_indic_count / total_script_chars
        latin_ratio = latin_chars / total_script_chars

        # Segment-level language transitions from Whisper
        segment_langs = [s.language for s in transcript.segments if s.language and s.language != "unknown"]
        segment_switches = 0
        for i in range(1, len(segment_langs)):
            if segment_langs[i] != segment_langs[i - 1]:
                segment_switches += 1

        # Determine primary language & code-switching rate
        if indic_ratio > 0.60 and top_indic_lang:
            primary = top_indic_lang
            primary_ratio = round(indic_ratio, 2)
            code_switch_rate = round(latin_ratio * 1.5 + (segment_switches * 0.1), 2)
        elif indic_ratio > 0.12 and latin_ratio > 0.12:
            primary = "mixed"
            primary_ratio = round(max(indic_ratio, latin_ratio), 2)
            code_switch_rate = round(min(1.0, 0.20 + (segment_switches * 0.15)), 2)
        elif whisper_lang and whisper_lang not in ("unknown", "en"):
            primary = whisper_lang
            primary_ratio = round(transcript.confidence or 0.85, 2)
            code_switch_rate = round(segment_switches * 0.1, 2)
        else:
            primary = "en"
            primary_ratio = round(latin_ratio if (indic_chars + latin_chars) > 0 else 1.0, 2)
            code_switch_rate = round(segment_switches * 0.1, 2)

        return LanguageSignals(
            primary=primary,
            primary_ratio=primary_ratio,
            code_switch_rate=min(1.0, code_switch_rate),
        ), filler_rate
