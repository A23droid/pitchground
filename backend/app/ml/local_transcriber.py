from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any
from threading import Lock

from app.ml.protocols import TranscriberProtocol
from app.ml.types import Transcript, TranscriptSegment, TranscriptWord
from app.storage.media import resolve_local_path
from app.config import BASE_DIR
from app.ml.speech_quality import SPEECH_PIPELINE_VERSION, validate_transcript

logger = logging.getLogger(__name__)

_MODEL_INSTANCE: Any = None
_MODEL_KEY = None
_MODEL_LOCK = Lock()


def get_whisper_model(model_size: str = "small", device: str = "cpu", compute_type: str = "int8"):
    global _MODEL_INSTANCE, _MODEL_KEY
    key = (model_size, device, compute_type)
    with _MODEL_LOCK:
        if _MODEL_INSTANCE is None or _MODEL_KEY != key:
            from faster_whisper import WhisperModel
            logger.info("Loading local faster-whisper model '%s' on %s (%s)...", model_size, device, compute_type)
            _MODEL_INSTANCE = WhisperModel(model_size, device=device, compute_type=compute_type,
                download_root=str(BASE_DIR / "models" / "whisper"), cpu_threads=int(os.getenv("WHISPER_CPU_THREADS", "4")))
            _MODEL_KEY = key
        return _MODEL_INSTANCE


class LocalWhisperTranscriber(TranscriberProtocol):
    """Local Faster-Whisper transcriber configured for verbatim output with speech disfluencies.
    
    Unsuppressed token lists and priming prompts encourage retaining audible
    disfluencies; recall still requires validation on human recordings.
    """

    def __init__(self, model_size: str | None = None):
        self.model_size = model_size or os.getenv("WHISPER_MODEL", "small")
        if self.model_size.endswith(".en"):
            raise ValueError("Use a multilingual Whisper model for Hindi and mixed-language practice, not an English-only .en model.")

    def transcribe(self, audio_path: str, language_hint: str = "auto") -> Transcript:
        local_path = resolve_local_path(audio_path)
        path = Path(local_path) if local_path else Path(audio_path)

        if not path.exists() or path.stat().st_size < 500:
            raise ValueError("The uploaded recording is missing or too small to transcribe.")

        try:
            model = get_whisper_model(self.model_size)
        except Exception as exc:
            logger.exception("Failed to load local Whisper model: %s", exc)
            raise RuntimeError("The speech model could not load. Check the backend model installation and retry.") from exc

        try:
            segments_iter, info = model.transcribe(
                str(path),
                # Practice language is a learning target, not proof of the language spoken.
                language=None,
                task="transcribe",
                multilingual=True,
                condition_on_previous_text=False,
                initial_prompt=None,
                suppress_tokens=[],           # Do NOT suppress disfluencies/fillers
                word_timestamps=True,         # Word-by-word transcription with precise timestamps
                vad_filter=True,
                vad_parameters={"threshold": .35, "min_speech_duration_ms": 100,
                                "min_silence_duration_ms": 500, "speech_pad_ms": 200},
                beam_size=5,
                best_of=5,
                temperature=(0.0, 0.2, 0.4),
                compression_ratio_threshold=2.4,
                log_prob_threshold=-1.0,
                no_speech_threshold=.6,
                hallucination_silence_threshold=2.0,
                language_detection_segments=3,
            )

            segments: list[TranscriptSegment] = []
            all_words: list[TranscriptWord] = []
            full_text_parts: list[str] = []

            # Dynamic language detection directly from the model
            detected_lang = info.language or "unknown"

            for seg in segments_iter:
                seg_text = seg.text.strip()
                # Ignore Whisper non-speech bracketed tokens
                if not seg_text or (seg_text.startswith("[") and seg_text.endswith("]")):
                    continue
                if getattr(seg, "avg_logprob", 0) < -1.2 and getattr(seg, "no_speech_prob", 0) > .6:
                    raise ValueError("Speech recognition is unreliable for this recording. Check the microphone and record again.")

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
            probabilities = [w.probability for w in all_words if w.probability is not None]
            confidence = round(sum(probabilities)/len(probabilities), 3) if probabilities else None

            transcript = Transcript(
                text=full_text,
                language=detected_lang,
                confidence=confidence,
                segments=segments,
                words=all_words,
                provenance={"pipeline_version": SPEECH_PIPELINE_VERSION, "model": self.model_size,
                            "task": "transcribe", "requested_language": language_hint,
                            "language_detection": "audio", "detected_language": detected_lang,
                            "language_probability": getattr(info, "language_probability", None),
                            "duration_sec": getattr(info, "duration", None),
                            "duration_after_vad_sec": getattr(info, "duration_after_vad", None)},
            )
            validate_transcript(transcript, getattr(info, "duration", None))
            return transcript
        except ValueError:
            raise
        except Exception as exc:
            logger.exception("Error during local transcription of %s: %s", path, exc)
            raise RuntimeError("Speech transcription failed. Check the recording format and backend speech service.") from exc
