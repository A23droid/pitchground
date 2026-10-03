from __future__ import annotations

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.auth import decode_user
from app.db import get_db
from app.models import Learner


def get_current_learner(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> Learner:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Not signed in.")
    user = decode_user(authorization.split(" ", 1)[1].strip())
    learner = db.query(Learner).filter(Learner.email == user["email"]).one_or_none()
    if learner is None:
        learner = Learner(
            email=user["email"],
            display_name=user["name"],
            practice_language="en",
        )
        db.add(learner)
        db.commit()
        db.refresh(learner)
    return learner
