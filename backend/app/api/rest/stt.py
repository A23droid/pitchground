from __future__ import annotations

import tempfile
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.ml.acoustic import AcousticExtractor
from app.ml.factory import get_transcriber
from app.ml.language import LanguageExtractor

router = APIRouter(prefix="/v1/stt", tags=["stt"])


@router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    language_hint: str | None = Form(default=None),
):
    audio_bytes = await audio.read()
    if len(audio_bytes) < 200:
        raise HTTPException(status_code=415, detail="Media missing usable audio")

    suffix = Path(audio.filename or "audio.webm").suffix or ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        transcriber = get_transcriber()
        res = transcriber.transcribe(
            audio_path=tmp_path,
            language_hint=language_hint or "auto",
        )

        # Extract real acoustic and language signals from the transcribed audio
        acoustic_extractor = AcousticExtractor()
        acoustic_signals, speaking_score = acoustic_extractor.extract(tmp_path, res.text)

        language_extractor = LanguageExtractor()
        lang_signals, filler_rate = language_extractor.extract(res, practice_language=language_hint or "en")

        return {
            "text": res.text,
            "language": res.language,
            "confidence": res.confidence,
            "words": [
                {
                    "word": w.word,
                    "start_sec": w.start_sec,
                    "end_sec": w.end_sec,
                    "probability": w.probability,
                }
                for w in res.words
            ],
            "segments": [
                {
                    "start_sec": s.start_sec,
                    "end_sec": s.end_sec,
                    "text": s.text,
                    "language": s.language,
                }
                for s in res.segments
            ],
            "metrics": {
                "wpm": acoustic_signals.wpm,
                "filler_rate": filler_rate,
                "pause_ratio": acoustic_signals.pause_ratio,
                "pitch_var": acoustic_signals.pitch_var,
                "energy_var": acoustic_signals.energy_var,
                "primary_language": lang_signals.primary,
                "primary_ratio": lang_signals.primary_ratio,
                "code_switch_rate": lang_signals.code_switch_rate,
            },
        }
    finally:
        try:
            Path(tmp_path).unlink(missing_ok=True)
        except OSError:
            pass
