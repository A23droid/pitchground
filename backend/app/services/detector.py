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


def _get(bundle: SignalBundle, path: str) -> float:
    root, leaf = path.split(".", 1)
    obj = getattr(bundle, root)
    if obj is None:
        return 0.0
    return float(getattr(obj, leaf))


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
        b = _get(baseline, path)
        o = _get(observed, path)
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

    if observed.visual and observed.visual.freeze_ratio > 0.2:
        eid = str(uuid.uuid4())
        evidence.append(
            Evidence(
                id=eid,
                attempt_id=observed.attempt_id,
                metric="visual.freeze_ratio",
                delta=observed.visual.freeze_ratio,
                threshold=0.2,
                modality="visual",
                excerpt=None,
                span=None,
            )
        )
        fired_for["freeze"].append(eid)

    candidates: list[CandidateFailure] = []
    for condition, ids in fired_for.items():
        if not ids:
            continue
        score = min(1.0, 0.35 + 0.2 * len(ids))
        candidates.append(CandidateFailure(condition=condition, score=score, evidence_ids=ids))  # type: ignore[arg-type]

    candidates.sort(key=lambda c: c.score, reverse=True)
    if not candidates:
        eid = str(uuid.uuid4())
        evidence.append(
            Evidence(
                id=eid,
                attempt_id=observed.attempt_id,
                metric="fused.structure",
                delta=_get(observed, "fused.structure") - _get(baseline, "fused.structure"),
                threshold=0.1,
                modality="fused",
                excerpt=None,
                span=None,
            )
        )
        candidates.append(CandidateFailure(condition="ramble", score=0.4, evidence_ids=[eid]))
    return evidence, candidates
