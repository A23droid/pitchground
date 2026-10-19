from __future__ import annotations

from app.ml.types import SignalBundle


def baseline_vector(bundle: SignalBundle) -> dict[str, float | None]:
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
        "coverage": bundle.content.coverage if bundle.content else None,
        "primary_ratio": bundle.language.primary_ratio,
        "gaze_away": bundle.visual.gaze_away if bundle.visual else None,
        "head_down": bundle.visual.head_down if bundle.visual else None,
        "freeze_ratio": bundle.visual.freeze_ratio if bundle.visual else None,
        "gesture_energy": bundle.visual.gesture_energy if bundle.visual else None,
    }
