from __future__ import annotations

from app.agents.llm_client import chat_json
from app.ml.types import CandidateFailure, Evidence


ALLOWED = {
    "freeze",
    "fluency_breakdown",
    "language_instability",
    "knowledge_gap",
    "delivery_collapse",
    "ramble",
}


def render_diagnosis(candidates: list[CandidateFailure], evidence: list[Evidence], transcript: str) -> dict:
    top = candidates[0]
    system = (
        "You explain interview communication failures. Return JSON "
        "{condition, confidence, rationale, evidence_ids}. "
        "condition MUST be one of the provided candidates. Never invent a new condition."
    )
    user = (
        f"Candidates: {[c.model_dump() for c in candidates]}\n"
        f"Evidence: {[e.model_dump() for e in evidence[:8]]}\n"
        f"Transcript excerpt: {transcript[:800]}"
    )
    out = chat_json(system, user)
    condition = top.condition
    confidence = "medium"
    rationale = (
        f"Under pressure, metrics tied to {top.condition.replace('_', ' ')} deteriorated "
        f"relative to baseline (score={top.score:.2f})."
    )
    evidence_ids = top.evidence_ids
    if out:
        cond = str(out.get("condition") or "")
        if cond in ALLOWED and any(c.condition == cond for c in candidates):
            condition = cond  # type: ignore[assignment]
        conf = str(out.get("confidence") or "medium")
        if conf in ("low", "medium", "high"):
            confidence = conf
        if out.get("rationale"):
            rationale = str(out["rationale"])
        if isinstance(out.get("evidence_ids"), list) and out["evidence_ids"]:
            evidence_ids = [str(x) for x in out["evidence_ids"]]
    return {
        "condition": condition,
        "confidence": confidence,
        "rationale": rationale,
        "evidence_ids": evidence_ids,
    }
