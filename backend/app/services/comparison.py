from __future__ import annotations

from app.ml.types import SignalBundle


def compare_attempts(pressure: SignalBundle, retry: SignalBundle, focus: list[str] | None = None) -> dict:
    focus = focus or ["fused.structure", "fused.fluency", "acoustic.pause_ratio", "acoustic.filler_rate"]
    rows = []
    improved_flags = []

    def get(b: SignalBundle, path: str) -> float:
        root, leaf = path.split(".", 1)
        obj = getattr(b, root)
        return float(getattr(obj, leaf)) if obj is not None else 0.0

    for metric in focus:
        a = get(pressure, metric)
        b = get(retry, metric)
        delta = b - a
        # For pause/filler, lower is better
        if "pause" in metric or "filler" in metric:
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
