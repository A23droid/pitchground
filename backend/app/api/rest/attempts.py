from __future__ import annotations

import json

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_learner
from app.models import Attempt, Learner, Session as SessionModel
from app.orchestration.orchestrator import analyze_attempt_job, create_attempt
from app.schemas.api import AttemptCreate
from app.storage.media import save_upload

router = APIRouter(prefix="/v1/sessions/{session_id}/attempts", tags=["attempts"])


def _session(db: Session, session_id: str, learner: Learner) -> SessionModel:
    session = db.get(SessionModel, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.learner_id != learner.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return session


@router.post("", status_code=201)
def post_attempt(
    session_id: str,
    body: AttemptCreate,
    db: Session = Depends(get_db),
    learner: Learner = Depends(get_current_learner),
):
    session = _session(db, session_id, learner)
    try:
        attempt = create_attempt(db, session, body.role)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return {
        "id": attempt.id,
        "session_id": attempt.session_id,
        "role": attempt.role,
        "prompt": attempt.prompt,
        "pressure_spec": json.loads(attempt.pressure_spec_json or "{}"),
    }


@router.post("/{attempt_id}/media")
async def upload_media(
    session_id: str,
    attempt_id: str,
    audio: UploadFile = File(...),
    video: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
    learner: Learner = Depends(get_current_learner),
):
    session = _session(db, session_id, learner)
    attempt = db.get(Attempt, attempt_id)
    if not attempt or attempt.session_id != session.id:
        raise HTTPException(status_code=404, detail="Attempt not found")

    audio_bytes = await audio.read()
    if len(audio_bytes) < 200:
        raise HTTPException(status_code=415, detail="Media missing usable audio")
    try:
        audio_path = await save_upload(session_id, attempt_id, "audio", audio.filename or "audio.webm", audio_bytes)
        video_path = None
        bytes_video = 0
        if video is not None:
            video_bytes = await video.read()
            if video_bytes:
                video_path = await save_upload(
                    session_id, attempt_id, "video", video.filename or "video.webm", video_bytes
                )
                bytes_video = len(video_bytes)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    attempt.audio_path = audio_path
    attempt.video_path = video_path
    db.commit()
    return {
        "audio_path": audio_path,
        "video_path": video_path,
        "bytes_audio": len(audio_bytes),
        "bytes_video": bytes_video,
    }


@router.post("/{attempt_id}/complete", status_code=202)
def complete_attempt(
    session_id: str,
    attempt_id: str,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    learner: Learner = Depends(get_current_learner),
):
    session = _session(db, session_id, learner)
    attempt = db.get(Attempt, attempt_id)
    if not attempt or attempt.session_id != session.id:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if not attempt.audio_path:
        raise HTTPException(status_code=415, detail="Media missing audio")
    attempt.analysis_status = "queued"
    db.commit()
    background.add_task(analyze_attempt_job, session_id, attempt_id)
    return {"attempt_id": attempt_id, "analysis_status": "queued"}


@router.get("/{attempt_id}")
def get_attempt(
    session_id: str,
    attempt_id: str,
    db: Session = Depends(get_db),
    learner: Learner = Depends(get_current_learner),
):
    session = _session(db, session_id, learner)
    attempt = db.get(Attempt, attempt_id)
    if not attempt or attempt.session_id != session.id:
        raise HTTPException(status_code=404, detail="Attempt not found")
    return {
        "id": attempt.id,
        "role": attempt.role,
        "prompt": attempt.prompt,
        "pressure_spec": json.loads(attempt.pressure_spec_json or "{}"),
        "transcript": {
            "text": attempt.transcript.text,
            "language": attempt.transcript.language,
        }
        if attempt.transcript
        else None,
        "metrics": json.loads(attempt.metrics.signal_bundle_json) if attempt.metrics else None,
        "evidence": [],
        "analysis_status": attempt.analysis_status,
    }
