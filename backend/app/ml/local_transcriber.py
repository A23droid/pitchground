from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from app.ml.protocols import TranscriberProtocol
from app.ml.types import Transcript, TranscriptSegment
from app.storage.media import resolve_local_path

logger = logging.getLogger(__name__)

_MODEL_INSTANCE: Any = None


def get_whisper_model(model_size: str = "base", device: str = "cpu", compute_type: str = "int8"):
    global _MODEL_INSTANCE
    if _MODEL_INSTANCE is None:
        from faster_whisper import WhisperModel
        logger.info("Loading local faster-whisper model '%s' on %s (%s)...", model_size, device, compute_type)
        _MODEL_INSTANCE = WhisperModel(model_size, device=device, compute_type=compute_type)
    return _MODEL_INSTANCE


class LocalWhisperTranscriber(TranscriberProtocol):
    """Local Faster-Whisper transcriber configured for verbatim output with speech disfluencies.
    
    Cloud ASR APIs strip out 'uh', 'um', 'hmm', and hesitations.
    This local model uses unsuppressed token lists and priming prompts
    to retain fillers essential for communication training.
    """

    def __init__(self, model_size: str = "base"):
        self.model_size = model_size

    def transcribe(self, audio_path: str, language_hint: str = "auto") -> Transcript:
        local_path = resolve_local_path(audio_path)
        path = Path(local_path) if local_path else Path(audio_path)

        if not path.exists() or path.stat().st_size < 500:
            return Transcript(text="", language="unknown", confidence=None, segments=[])

        try:
            model = get_whisper_model(self.model_size)
        except Exception as exc:
            logger.exception("Failed to load local Whisper model: %s", exc)
            return Transcript(text="", language="unknown", confidence=None, segments=[])

        lang = None if language_hint in ("auto", "unknown", "", None) else language_hint
        # Prime the decoder vocabulary to retain fillers and hesitations
        initial_prompt = "Um, uh, ahh, hmm, like, you know, actually, basically, err, matlab, yaar..."

        try:
            segments_iter, info = model.transcribe(
                str(path),
                language=lang,
                initial_prompt=initial_prompt,
                suppress_tokens=[],           # Do NOT suppress disfluencies
                word_timestamps=True,
                vad_filter=False,             # Do not cut out hesitation breaths
                beam_size=3,
                best_of=3,
                temperature=0.0,
            )

            segments: list[TranscriptSegment] = []
            full_text_parts: list[str] = []

            detected_lang = "hi" if info.language == "hi" else "en" if info.language == "en" else "unknown"

            for seg in segments_iter:
                seg_text = seg.text.strip()
                if seg_text:
                    full_text_parts.append(seg_text)
                    segments.append(
                        TranscriptSegment(
                            start_sec=round(float(seg.start), 2),
                            end_sec=round(float(seg.end), 2),
                            text=seg_text,
                            language=detected_lang if detected_lang in ("en", "hi") else "unknown",
                        )
                    )

            full_text = " ".join(full_text_parts).strip()
            confidence = round(float(info.language_probability), 2) if info.language_probability else None

            return Transcript(
                text=full_text,
                language=detected_lang if detected_lang in ("en", "hi") else "unknown",  # type: ignore[arg-type]
                confidence=confidence,
                segments=segments,
            )
        except Exception as exc:
            logger.exception("Error during local transcription of %s: %s", path, exc)
            return Transcript(text="", language="unknown", confidence=None, segments=[])
