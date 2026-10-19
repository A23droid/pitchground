from __future__ import annotations

from app.ml.local_transcriber import LocalWhisperTranscriber
from app.ml.protocols import AttemptAnalyzerProtocol, TranscriberProtocol
from app.ml.real_analyzer import RealAnalyzer


def get_transcriber() -> TranscriberProtocol:
    """Returns the local Faster-Whisper transcriber (in-process model, no API keys)."""
    return LocalWhisperTranscriber()


def get_analyzer() -> AttemptAnalyzerProtocol:
    """Returns the production RealAnalyzer running local Librosa, MediaPipe, and linguistic models."""
    return RealAnalyzer()


# ── Canonical public aliases ──────────────────────────────────────────────
build_transcriber = get_transcriber
build_analyzer = get_analyzer
