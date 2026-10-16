from __future__ import annotations

from app.config import ML_ANALYZER
from app.ml.protocols import AttemptAnalyzerProtocol, TranscriberProtocol
from app.ml.stub_analyzer import StubAnalyzer
from app.services.stt_sarvam import SarvamTranscriber


def get_transcriber() -> TranscriberProtocol:
    if ML_ANALYZER == "real":
        try:
            from app.ml.local_transcriber import LocalWhisperTranscriber  # type: ignore

            return LocalWhisperTranscriber()
        except Exception:
            return SarvamTranscriber()
    return SarvamTranscriber()



def get_analyzer() -> AttemptAnalyzerProtocol:
    if ML_ANALYZER == "real":
        try:
            from app.ml.real_analyzer import RealAnalyzer  # type: ignore

            return RealAnalyzer()
        except Exception:
            return StubAnalyzer()
    return StubAnalyzer()


# ── Canonical public aliases (preferred over get_* names) ─────────────────
build_transcriber = get_transcriber
build_analyzer = get_analyzer
