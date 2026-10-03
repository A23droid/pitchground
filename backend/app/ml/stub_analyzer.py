from __future__ import annotations

from app.ml.types import (
    AcousticSignals,
    AnalysisConfig,
    AttemptMedia,
    ContentSignals,
    FusedDimensions,
    LanguageSignals,
    QualityFlags,
    SignalBundle,
    Transcript,
    VisualSignals,
)


class StubAnalyzer:
    """Deterministic fixture bundles so the loop works without the real model."""

    def analyze_attempt(
        self,
        media: AttemptMedia,
        transcript: Transcript,
        config: AnalysisConfig,
    ) -> SignalBundle:
        role = config.role
        if role == "baseline":
            acoustic = AcousticSignals(wpm=135, pause_ratio=0.12, filler_rate=1.5, silence_burst_count=1)
            fused = FusedDimensions(
                fluency=0.78, composure=0.74, presence=0.72, structure=0.8, language_stability=0.85, content=0.76
            )
            warnings = ["baseline_unnormalized"]
        elif role == "pressure":
            acoustic = AcousticSignals(wpm=95, pause_ratio=0.38, filler_rate=6.5, silence_burst_count=5)
            fused = FusedDimensions(
                fluency=0.42, composure=0.45, presence=0.5, structure=0.35, language_stability=0.7, content=0.55
            )
            warnings = ["pressure_deterioration"]
        else:
            acoustic = AcousticSignals(wpm=118, pause_ratio=0.2, filler_rate=3.0, silence_burst_count=2)
            fused = FusedDimensions(
                fluency=0.65, composure=0.62, presence=0.64, structure=0.68, language_stability=0.8, content=0.7
            )
            warnings = ["partial_recovery"]

        visual = None if config.skip_vision else VisualSignals(
            gaze_away=0.35 if role == "pressure" else 0.12,
            head_down=0.25 if role == "pressure" else 0.1,
            freeze_ratio=0.3 if role == "pressure" else 0.05,
            gesture_energy=0.2 if role == "pressure" else 0.45,
        )

        return SignalBundle(
            attempt_id=media.attempt_id,
            transcript=transcript,
            acoustic=acoustic,
            language=LanguageSignals(primary="en", primary_ratio=0.92, code_switch_rate=0.15 if role == "pressure" else 0.05),
            visual=visual,
            content=ContentSignals(
                coverage=0.75 if role == "baseline" else 0.45 if role == "pressure" else 0.68,
                specificity=0.65 if role != "pressure" else 0.4,
            ),
            fused=fused,
            quality=QualityFlags(audio_ok=True, video_ok=visual is not None, warnings=warnings),
        )
