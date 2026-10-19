from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from app.ml.protocols import TranscriberProtocol
from app.ml.types import Transcript, TranscriptSegment, TranscriptWord
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

        try:
            segments_iter, info = model.transcribe(
                str(path),
                language=lang,
                suppress_tokens=[],           # Do NOT suppress disfluencies/fillers
                word_timestamps=True,         # Word-by-word transcription with precise timestamps
                vad_filter=False,             # Do not cut out hesitation breaths or pauses
                beam_size=5,
                best_of=5,
                temperature=0.0,
            )

            segments: list[TranscriptSegment] = []
            all_words: list[TranscriptWord] = []
            full_text_parts: list[str] = []

            # Dynamic language detection directly from the model
            detected_lang = info.language or "en"

            for seg in segments_iter:
                seg_text = seg.text.strip()
                # Ignore Whisper non-speech bracketed tokens
                if not seg_text or (seg_text.startswith("[") and seg_text.endswith("]")):
                    continue

                seg_words: list[TranscriptWord] = []

                if hasattr(seg, "words") and seg.words:
                    for w in seg.words:
                        w_text = w.word.strip()
                        if w_text and not (w_text.startswith("[") and w_text.endswith("]")):
                            word_obj = TranscriptWord(
                                word=w_text,
                                start_sec=round(float(w.start), 2),
                                end_sec=round(float(w.end), 2),
                                probability=round(float(w.probability), 3) if hasattr(w, "probability") and w.probability is not None else None,
                            )
                            seg_words.append(word_obj)
                            all_words.append(word_obj)

                if seg_text:
                    full_text_parts.append(seg_text)
                    segments.append(
                        TranscriptSegment(
                            start_sec=round(float(seg.start), 2),
                            end_sec=round(float(seg.end), 2),
                            text=seg_text,
                            language=detected_lang,
                            words=seg_words,
                        )
                    )

            full_text = " ".join(full_text_parts).strip()
            confidence = round(float(info.language_probability), 2) if info.language_probability else None

            return Transcript(
                text=full_text,
                language=detected_lang,
                confidence=confidence,
                segments=segments,
                words=all_words,
            )
        except Exception as exc:
            logger.exception("Error during local transcription of %s: %s", path, exc)
            return Transcript(text="", language="unknown", confidence=None, segments=[], words=[])
