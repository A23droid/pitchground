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
    if not candidates:
        return {"condition": "no_measured_deterioration", "confidence": None,
                "rationale": "No measured deterioration crossed the configured thresholds in this session.",
                "evidence_ids": []}
    top = candidates[0]
    system = (
        "You explain interview communication failures. Return JSON "
        "{condition, rationale, evidence_ids}. "
        "condition MUST be one of the provided candidates. Never invent a new condition."
    )
    user = (
        f"Candidates: {[c.model_dump() for c in candidates]}\n"
        f"Evidence: {[e.model_dump() for e in evidence[:8]]}\n"
        f"Transcript excerpt: {transcript[:800]}"
    )
    out = chat_json(system, user, role="coaching")
    condition = top.condition
    confidence = None
    rationale = (
        f"Under pressure, metrics tied to {top.condition.replace('_', ' ')} deteriorated "
        f"relative to baseline (score={top.score:.2f})."
    )
    evidence_ids = top.evidence_ids
    allowed_evidence = {e.id for e in evidence}
    if out and out.get("condition") in {c.condition for c in candidates} and isinstance(out.get("evidence_ids"), list) and all(isinstance(x, str) and x in allowed_evidence for x in out["evidence_ids"]):
        cond = str(out.get("condition") or "")
        if cond in ALLOWED and any(c.condition == cond for c in candidates):
            condition = cond  # type: ignore[assignment]
        if out.get("rationale"):
            rationale = str(out["rationale"])
        if isinstance(out.get("evidence_ids"), list) and out["evidence_ids"]:
            evidence_ids = [str(x) for x in out["evidence_ids"] if str(x) in {e.id for e in evidence}]
    return {
        "condition": condition,
        "confidence": confidence,
        "rationale": rationale,
        "evidence_ids": evidence_ids,
    }
