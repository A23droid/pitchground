from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_learner
from app.models import Learner, LearnerDimensionScore, ProfileSnapshot, Session as SessionModel
from app.schemas.api import LearnerCreate, LearnerOut

router = APIRouter(prefix="/v1/learners", tags=["learners"])


@router.post("", status_code=201)
def create_learner(body: LearnerCreate, db: Session = Depends(get_db), learner: Learner = Depends(get_current_learner)):
    learner.display_name = body.display_name
    learner.practice_language = body.practice_language
    db.commit()
    db.refresh(learner)
    return {
        "id": learner.id,
        "display_name": learner.display_name,
        "practice_language": learner.practice_language,
        "created_at": learner.created_at.isoformat() if learner.created_at else None,
    }


@router.get("/me")
def me_learner(learner: Learner = Depends(get_current_learner)):
    return {
        "id": learner.id,
        "display_name": learner.display_name,
        "practice_language": learner.practice_language,
        "email": learner.email,
        "created_at": learner.created_at.isoformat() if learner.created_at else None,
    }


@router.get("/{learner_id}/profile")
def profile(learner_id: str, db: Session = Depends(get_db), current: Learner = Depends(get_current_learner)):
    learner = db.get(Learner, learner_id)
    if not learner:
        raise HTTPException(status_code=404, detail="Learner not found")
    if learner.id != current.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    dims = (
        db.query(LearnerDimensionScore)
        .filter(LearnerDimensionScore.learner_id == learner_id)
        .all()
    )
    snap = (
        db.query(ProfileSnapshot)
        .filter(ProfileSnapshot.learner_id == learner_id)
        .order_by(ProfileSnapshot.created_at.desc())
        .first()
    )
    recent = (
        db.query(SessionModel)
        .filter(SessionModel.learner_id == learner_id)
        .order_by(SessionModel.created_at.desc())
        .limit(10)
        .all()
    )
    return {
        "learner_id": learner.id,
        "display_name": learner.display_name,
        "practice_language": learner.practice_language,
        "dimensions": [
            {
                "id": d.dimension,
                "score": d.score,
                "n": d.n,
                "updated_at": d.updated_at.isoformat() if d.updated_at else None,
            }
            for d in dims
        ],
        "recent_failures": [],
        "latest_snapshot": json.loads(snap.payload_json) if snap else None,
        "recent_sessions": [
            {"id": s.id, "topic": s.topic, "phase": s.phase, "created_at": s.created_at.isoformat() if s.created_at else None}
            for s in recent
        ],
    }
