from __future__ import annotations

from typing import Any


ALLOWED_KNOBS = {"time_limit", "interruption", "language", "difficulty", "pressure_level"}


def validate_training_spec(spec: dict[str, Any]) -> dict[str, Any]:
    """Clamp TrainingSpec knobs for P0 challenge replay."""
    out = dict(spec or {})
    out["time_limit_sec"] = int(out.get("time_limit_sec") or 20)
    out["time_limit_sec"] = max(10, min(out["time_limit_sec"], 60))
    out["interruption"] = bool(out.get("interruption", False))
    out["pressure_level"] = max(0, min(int(out.get("pressure_level") or 2), 2))
    out["difficulty"] = str(out.get("difficulty") or "medium")
    out["language"] = str(out.get("language") or "en")
    return out
