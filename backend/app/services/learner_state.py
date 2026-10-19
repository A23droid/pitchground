from __future__ import annotations

import json
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.ml.types import SignalBundle
from app.models import LearnerDimensionScore, ProfileSnapshot


DIMS = ["fluency", "composure", "presence", "structure", "language_stability", "content"]


def update_from_bundle(db: Session, learner_id: str, bundle: SignalBundle) -> None:
    from app.models import Attempt, Session as SessionModel
    from app.services.verified_metrics import verified_bundle
    db.flush()
    attempts=db.query(Attempt).join(SessionModel,Attempt.session_id==SessionModel.id).filter(SessionModel.learner_id==learner_id,Attempt.analysis_status=="complete").all()
    bundles=[b for a in attempts if (b:=verified_bundle(a.metrics)) is not None]
    for dim in DIMS:
        measured=[value*100 for b in bundles if (value:=getattr(b.fused,dim)) is not None]
        if not measured: continue
        row=db.query(LearnerDimensionScore).filter(LearnerDimensionScore.learner_id==learner_id,LearnerDimensionScore.dimension==dim).one_or_none()
        if row is None:
            row=LearnerDimensionScore(learner_id=learner_id,dimension=dim,score=sum(measured)/len(measured),n=len(measured))
            db.add(row)
        else:row.score=sum(measured)/len(measured);row.n=len(measured);row.updated_at=datetime.now(timezone.utc)

    snap = {
        "fused": bundle.fused.model_dump(),
        "provenance": bundle.provenance,
        "attempt_id": bundle.attempt_id,
        "at": datetime.now(timezone.utc).isoformat(),
    }
    db.add(ProfileSnapshot(learner_id=learner_id, payload_json=json.dumps(snap)))
    db.flush()
