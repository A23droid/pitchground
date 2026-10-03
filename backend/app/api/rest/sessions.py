from __future__ import annotations

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_learner
from app.models import (
    Attempt,
    AttemptMetrics,
    DiagnosisRow,
    Learner,
    Session as SessionModel,
    TranscriptRow,
)
from app.orchestration.orchestrator import advance_session, session_to_dict
from app.schemas.api import AdvanceBody, SessionCreate, SessionFinish

router = APIRouter(prefix="/v1/sessions", tags=["sessions"])



@router.post("", status_code=201)
def create_session(
    body: SessionCreate,
    db: Session = Depends(get_db),
    learner: Learner = Depends(get_current_learner),
):
    learner_id = body.learner_id or learner.id
    if learner_id != learner.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    policy = {
        "p0_knobs": ["time_limit", "interruption"],
        "mode": body.mode,
        "topic": body.topic,
        "audience": body.audience,
        "language": body.language,
        "difficulty": body.difficulty,
    }
    if body.policy:
        policy.update(body.policy)
    session = SessionModel(
        learner_id=learner_id,
        mode=body.mode,
        topic=body.topic or "Database Systems",
        audience=body.audience or "",
        language=body.language or "English",
        difficulty=body.difficulty or "Standard",
        phase="created",
        policy_json=json.dumps(policy),
        current_action_json=json.dumps({"type": "show_question", "ui_hints": {"show_timer": False, "show_evidence": False}}),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session_to_dict(session)


@router.get("/{session_id}")
def get_session(session_id: str, db: Session = Depends(get_db), learner: Learner = Depends(get_current_learner)):
    session = db.get(SessionModel, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.learner_id != learner.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return session_to_dict(session)


@router.post("/{session_id}/advance")
def advance(session_id: str, body: AdvanceBody, db: Session = Depends(get_db), learner: Learner = Depends(get_current_learner)):
    session = db.get(SessionModel, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.learner_id != learner.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        session = advance_session(db, session, body.from_phase)
    except ValueError as exc:
        raise HTTPException(
            status_code=409,
            detail={"error": {"code": "illegal_transition", "message": str(exc), "session_id": session_id, "phase": session.phase}},
        ) from exc
    return session_to_dict(session)


@router.get("/{session_id}/diagnosis")
def diagnosis(session_id: str, db: Session = Depends(get_db), learner: Learner = Depends(get_current_learner)):
    session = db.get(SessionModel, session_id)
    if not session or session.learner_id != learner.id:
        raise HTTPException(status_code=404, detail="Not found")
    if not session.diagnosis:
        raise HTTPException(status_code=404, detail="Diagnosis not ready")
    return json.loads(session.diagnosis.payload_json)


@router.get("/{session_id}/challenge")
def challenge(session_id: str, db: Session = Depends(get_db), learner: Learner = Depends(get_current_learner)):
    session = db.get(SessionModel, session_id)
    if not session or session.learner_id != learner.id:
        raise HTTPException(status_code=404, detail="Not found")
    if not session.challenge:
        raise HTTPException(status_code=404, detail="Challenge not ready")
    return json.loads(session.challenge.payload_json)


@router.get("/{session_id}/comparison")
def comparison(session_id: str, db: Session = Depends(get_db), learner: Learner = Depends(get_current_learner)):
    session = db.get(SessionModel, session_id)
    if not session or session.learner_id != learner.id:
        raise HTTPException(status_code=404, detail="Not found")
    if not session.comparison:
        raise HTTPException(status_code=404, detail="Comparison not ready")
    return json.loads(session.comparison.payload_json)


@router.post("/{session_id}/complete")
def complete_generic_session(
    session_id: str,
    body: SessionFinish | None = None,
    db: Session = Depends(get_db),
    learner: Learner = Depends(get_current_learner),
):
    session = db.get(SessionModel, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.learner_id != learner.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    session.phase = body.phase if body and body.phase else "completed"
    session.updated_at = datetime.now(timezone.utc)

    if body and body.diagnosis:
        diag = DiagnosisRow(
            session_id=session.id,
            condition=str(body.diagnosis.get("condition") or body.diagnosis.get("primaryCondition") or "Completed Drill"),
            confidence=str(body.diagnosis.get("confidence") or "high"),
            rationale=str(body.diagnosis.get("rationale") or ""),
            evidence_ids_json=json.dumps(body.diagnosis.get("evidenceIds") or []),
            payload_json=json.dumps(body.diagnosis),
        )
        db.add(diag)

    if body and (body.transcript or body.metrics):
        attempt = Attempt(
            session_id=session.id,
            role="baseline",
            status="completed",
            prompt=session.topic,
            analysis_status="complete",
        )
        db.add(attempt)
        db.flush()
        if body.transcript:
            db.add(TranscriptRow(attempt_id=attempt.id, text=body.transcript, language=session.language or "en"))
        if body.metrics:
            db.add(AttemptMetrics(attempt_id=attempt.id, signal_bundle_json=json.dumps(body.metrics)))

    db.commit()
    db.refresh(session)
    return session_to_dict(session)

