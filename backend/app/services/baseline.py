from __future__ import annotations

from app.ml.types import SignalBundle


def baseline_vector(bundle: SignalBundle) -> dict[str, float]:
    return {
        "wpm": bundle.acoustic.wpm,
        "pause_ratio": bundle.acoustic.pause_ratio,
        "filler_rate": bundle.acoustic.filler_rate,
        "fluency": bundle.fused.fluency,
        "composure": bundle.fused.composure,
        "presence": bundle.fused.presence,
        "structure": bundle.fused.structure,
        "language_stability": bundle.fused.language_stability,
        "content": bundle.fused.content,
        "coverage": bundle.content.coverage if bundle.content else 0.5,
        "primary_ratio": bundle.language.primary_ratio,
    }
