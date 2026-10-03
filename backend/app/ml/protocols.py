from __future__ import annotations

from typing import Protocol

from app.ml.types import AnalysisConfig, AttemptMedia, SignalBundle, Transcript


class TranscriberProtocol(Protocol):
    def transcribe(self, audio_path: str, language_hint: str = "auto") -> Transcript: ...


class AttemptAnalyzerProtocol(Protocol):
    def analyze_attempt(
        self,
        media: AttemptMedia,
        transcript: Transcript,
        config: AnalysisConfig,
    ) -> SignalBundle: ...
