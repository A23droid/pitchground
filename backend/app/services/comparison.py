from __future__ import annotations

from app.ml.types import SignalBundle


def compare_attempts(pressure: SignalBundle, retry: SignalBundle, focus: list[str] | None = None) -> dict:
    if focus is None:
        focus = ["fused.structure", "fused.fluency", "acoustic.pause_ratio", "acoustic.filler_rate"]
        if pressure.visual is not None and retry.visual is not None:
            focus = focus + ["visual.gaze_away", "visual.freeze_ratio"]
    rows = []
    improved_flags = []

    def get(b: SignalBundle, path: str) -> float:
        root, leaf = path.split(".", 1)
        obj = getattr(b, root)
        value = getattr(obj, leaf) if obj is not None else None
        return float(value) if value is not None else None

    for metric in focus:
        if metric=="acoustic.filler_rate" and not all(bundle.acoustic.filler_detection.get("status")=="complete" for bundle in (pressure,retry)):
            continue
        a = get(pressure, metric)
        b = get(retry, metric)
        if a is None or b is None:
            continue
        delta = b - a
        # For pause/filler/gaze/freeze/stress, lower is better
        if any(neg in metric for neg in ("pause", "filler", "gaze", "freeze", "stress")):
            verdict = "improved" if delta < -0.05 else "worsened" if delta > 0.05 else "unchanged"
        else:
            verdict = "improved" if delta > 0.05 else "worsened" if delta < -0.05 else "unchanged"
        improved_flags.append(verdict == "improved")
        rows.append({"metric": metric, "a": a, "b": b, "delta": delta, "verdict": verdict})

    return {
        "attempt_a": pressure.attempt_id,
        "attempt_b": retry.attempt_id,
        "focus_metrics": focus,
        "rows": rows,
        "improved": any(improved_flags) and not all(v == "worsened" for v in [r["verdict"] for r in rows]),
    }
