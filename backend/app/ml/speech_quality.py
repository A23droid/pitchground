"""Reject recognizer failures before they become learner-performance evidence."""
from __future__ import annotations

import itertools
import math
import re
import unicodedata
from app.ml.types import Transcript

SPEECH_PIPELINE_VERSION = "multilingual-verbatim-v2"


def lexical_words(text: str) -> list[str]:
    # Keep Devanagari combining marks intact; punctuation is not a spoken word.
    return [part for part in text.split() if any(unicodedata.category(c)[0] in "LN" for c in part)]


def validate_transcript(transcript: Transcript, duration_sec: float | None = None) -> None:
    words = lexical_words(transcript.text)
    if not words:
        raise ValueError("No usable speech was recognized. Check your microphone and record again.")
    normalized = [re.sub(r"[^\w\u0900-\u097f\u0d00-\u0d7f]", "", word.casefold()) for word in words]
    # Reject the whole take, never delete genuine repetitions to manufacture fluency.
    longest_run = max((sum(1 for _ in group) for _, group in itertools.groupby(normalized)), default=0)
    phrase_loop = any(
        all(normalized[start:start+width] == normalized[start+repeat*width:start+(repeat+1)*width] for repeat in range(1, 6))
        for width in range(2, 9) for start in range(len(normalized)-width*6+1)
    )
    if longest_run >= 12 or phrase_loop:
        raise ValueError("Speech recognition produced a repetition loop. This recording has not been scored. Retry transcription or record again in a quieter setting.")
    if duration_sec and len(words)*60/duration_sec > 500:
        raise ValueError("The recognized words do not fit the recording duration. This recording has not been scored. Please retry transcription.")
    timed = transcript.words
    if len(timed) >= 10 and sum(w.end_sec <= w.start_sec for w in timed)/len(timed) > .5:
        raise ValueError("Speech word timing is unreliable. This recording has not been scored. Please retry transcription.")
    for word in timed:
        if not math.isfinite(word.start_sec) or not math.isfinite(word.end_sec) or word.start_sec < 0 or word.end_sec < word.start_sec or (duration_sec and word.end_sec > duration_sec + .5):
            raise ValueError("Speech timestamps do not match the recording. Please retry transcription.")
    probabilities = [w.probability for w in timed if w.probability is not None]
    if len(probabilities) >= 5 and sum(probabilities)/len(probabilities) < .35:
        raise ValueError("Speech recognition confidence is too low to score this recording. Check the microphone and reduce background noise.")
