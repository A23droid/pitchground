from __future__ import annotations

PHASES = [
    "created",
    "baseline_prompt",
    "baseline_recording",
    "baseline_analyzed",
    "pressure_prompt",
    "pressure_recording",
    "pressure_analyzed",
    "diagnosing",
    "challenge_prompt",
    "replay_condition",
    "retry_recording",
    "comparing",
    "profile_updated",
    "completed",
]

# phase -> next phase
TRANSITIONS: dict[str, str] = {
    "created": "baseline_prompt",
    "baseline_prompt": "baseline_recording",
    "baseline_recording": "baseline_analyzed",
    "baseline_analyzed": "pressure_prompt",
    "pressure_prompt": "pressure_recording",
    "pressure_recording": "pressure_analyzed",
    "pressure_analyzed": "diagnosing",
    "diagnosing": "challenge_prompt",
    "challenge_prompt": "replay_condition",
    "replay_condition": "retry_recording",
    "retry_recording": "comparing",
    "comparing": "profile_updated",
    "profile_updated": "completed",
}

ROLE_FOR_RECORDING = {
    "baseline_recording": "baseline",
    "pressure_recording": "pressure",
    "retry_recording": "retry",
}


def next_phase(current: str) -> str | None:
    return TRANSITIONS.get(current)


def assert_can_advance(current: str, from_phase: str) -> str:
    if current != from_phase:
        raise ValueError(f"from_phase mismatch: expected {current}, got {from_phase}")
    nxt = next_phase(current)
    if not nxt:
        raise ValueError(f"Cannot advance from terminal/unknown phase {current}")
    return nxt
