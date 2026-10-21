"""The existing speech diagnostics, executed locally or inside SageMaker."""
def speech_response(audio_path: str, language_hint: str = "auto"):
    from app.ml.local_transcriber import LocalWhisperTranscriber
    from app.ml.acoustic import AcousticExtractor
    from app.ml.language import LanguageExtractor
    from app.ml.fillers import FillerDetector
    result = LocalWhisperTranscriber().transcribe(audio_path, language_hint)
    acoustic, _ = AcousticExtractor().extract(audio_path, result.text)
    language, _ = LanguageExtractor().extract(result, practice_language=language_hint or "en")
    FillerDetector().apply(acoustic, audio_path, result)
    return {"text": result.text, "language": result.language, "confidence": result.confidence,
        "transcription": result.provenance, "words": [w.model_dump() for w in result.words],
        "segments": [s.model_dump() for s in result.segments],
        "metrics": {**acoustic.model_dump(), "primary_language": language.primary,
                    "primary_ratio": language.primary_ratio, "code_switch_rate": language.code_switch_rate}}
