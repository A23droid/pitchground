from __future__ import annotations

from app.ml.protocols import AttemptAnalyzerProtocol, TranscriberProtocol
from app.ml.sagemaker import enabled


def get_transcriber() -> TranscriberProtocol:
    """Returns the local Faster-Whisper transcriber (in-process model, no API keys)."""
    if enabled():
        raise RuntimeError("Use SageMaker job submission in remote mode; local model loading is disabled.")
    from app.ml.local_transcriber import LocalWhisperTranscriber
    return LocalWhisperTranscriber()


def get_analyzer() -> AttemptAnalyzerProtocol:
    """Returns the production RealAnalyzer running local Librosa, MediaPipe, and linguistic models."""
    if enabled():
        raise RuntimeError("Use SageMaker job submission in remote mode; local model loading is disabled.")
    from app.ml.real_analyzer import RealAnalyzer
    return RealAnalyzer()


# ── Canonical public aliases ──────────────────────────────────────────────
build_transcriber = get_transcriber
build_analyzer = get_analyzer
