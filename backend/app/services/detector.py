from __future__ import annotations

import uuid

from app.ml.types import CandidateFailure, Evidence, SignalBundle

# metric -> higher_is_worse
METRICS: list[tuple[str, str, bool, float]] = [
    ("acoustic.pause_ratio", "acoustic", True, 0.15),
    ("acoustic.filler_rate", "acoustic", True, 2.5),
    ("acoustic.wpm", "acoustic", False, 25.0),
    ("fused.structure", "fused", False, 0.2),
    ("fused.fluency", "fused", False, 0.2),
    ("content.coverage", "content", False, 0.2),
    ("language.primary_ratio", "language", False, 0.15),
]


def _get(bundle: SignalBundle, path: str) -> float | None:
    root, leaf = path.split(".", 1)
    obj = getattr(bundle, root)
    if obj is None:
        return None
    value = getattr(obj, leaf)
    return float(value) if value is not None else None


def detect(baseline: SignalBundle, observed: SignalBundle) -> tuple[list[Evidence], list[CandidateFailure]]:
    evidence: list[Evidence] = []
    fired_for: dict[str, list[str]] = {
        "fluency_breakdown": [],
        "ramble": [],
        "knowledge_gap": [],
        "delivery_collapse": [],
        "language_instability": [],
        "freeze": [],
    }

    for path, modality, higher_worse, threshold in METRICS:
        if path=="acoustic.filler_rate" and not all(bundle.acoustic.filler_detection.get("status")=="complete" for bundle in (baseline,observed)):
            continue
        b = _get(baseline, path)
        o = _get(observed, path)
        if b is None or o is None:
            continue
        delta = o - b
        deteriorated = delta > threshold if higher_worse else (-delta) > threshold
        if not deteriorated:
            continue
        eid = str(uuid.uuid4())
        evidence.append(
            Evidence(
                id=eid,
                attempt_id=observed.attempt_id,
                metric=path,
                delta=delta,
                threshold=threshold,
                modality=modality,
                excerpt=observed.transcript.text[:160] or None,
                span=None,
            )
        )
        if "pause" in path or "filler" in path or "wpm" in path or "fluency" in path:
            fired_for["fluency_breakdown"].append(eid)
        if "structure" in path:
            fired_for["ramble"].append(eid)
        if "coverage" in path or path.endswith("content"):
            fired_for["knowledge_gap"].append(eid)
        if "primary_ratio" in path:
            fired_for["language_instability"].append(eid)

    if baseline.visual and observed.visual and baseline.visual.freeze_ratio is not None and observed.visual.freeze_ratio is not None and observed.visual.freeze_ratio - baseline.visual.freeze_ratio > 0.2:
        eid = str(uuid.uuid4())
        evidence.append(
            Evidence(
                id=eid,
                attempt_id=observed.attempt_id,
                metric="visual.freeze_ratio",
                delta=observed.visual.freeze_ratio - baseline.visual.freeze_ratio,
                threshold=0.2,
                modality="visual",
                excerpt=None,
                span=None,
            )
        )
        fired_for["freeze"].append(eid)

    if baseline.visual and observed.visual and all(v is not None for v in (baseline.visual.gaze_away,observed.visual.gaze_away,baseline.visual.head_down,observed.visual.head_down)) and (observed.visual.gaze_away-baseline.visual.gaze_away > 0.35 or observed.visual.head_down-baseline.visual.head_down > 0.35):
        eid = str(uuid.uuid4())
        metric_name = "visual.gaze_away" if observed.visual.gaze_away-baseline.visual.gaze_away >= observed.visual.head_down-baseline.visual.head_down else "visual.head_down"
        delta_val = observed.visual.gaze_away-baseline.visual.gaze_away if metric_name == "visual.gaze_away" else observed.visual.head_down-baseline.visual.head_down
        evidence.append(
            Evidence(
                id=eid,
                attempt_id=observed.attempt_id,
                metric=metric_name,
                delta=delta_val,
                threshold=0.35,
                modality="visual",
                excerpt=None,
                span=None,
            )
        )
        fired_for["delivery_collapse"].append(eid)

    candidates: list[CandidateFailure] = []
    for condition, ids in fired_for.items():
        if not ids:
            continue
        strength = sum(abs(e.delta)/e.threshold for e in evidence if e.id in ids and e.threshold > 0)
        score = strength/(1+strength)
        candidates.append(CandidateFailure(condition=condition, score=score, evidence_ids=ids))  # type: ignore[arg-type]

    candidates.sort(key=lambda c: c.score, reverse=True)
    return evidence, candidates
