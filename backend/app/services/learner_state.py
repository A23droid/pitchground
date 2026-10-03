from __future__ import annotations

import json
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.ml.types import SignalBundle
from app.models import LearnerDimensionScore, ProfileSnapshot


DIMS = ["fluency", "composure", "presence", "structure", "language_stability", "content"]


def update_from_bundle(db: Session, learner_id: str, bundle: SignalBundle) -> None:
    for dim in DIMS:
        value = float(getattr(bundle.fused, dim)) * 100
        row = (
            db.query(LearnerDimensionScore)
            .filter(LearnerDimensionScore.learner_id == learner_id, LearnerDimensionScore.dimension == dim)
            .one_or_none()
        )
        if row is None:
            row = LearnerDimensionScore(learner_id=learner_id, dimension=dim, score=value, n=1)
            db.add(row)
        else:
            row.n += 1
            row.score = ((row.score * (row.n - 1)) + value) / row.n
            row.updated_at = datetime.now(timezone.utc)

    snap = {
        "fused": bundle.fused.model_dump(),
        "attempt_id": bundle.attempt_id,
        "at": datetime.now(timezone.utc).isoformat(),
    }
    db.add(ProfileSnapshot(learner_id=learner_id, payload_json=json.dumps(snap)))
    db.commit()
