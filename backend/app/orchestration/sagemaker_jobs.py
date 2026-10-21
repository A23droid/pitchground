"""Submit durable remote jobs and apply their results exactly once."""
from __future__ import annotations
import json
import tempfile
from pathlib import Path
from app.ml import sagemaker
from app.ml.types import AnalysisConfig, SignalBundle
from app.models import SessionEvent
from app.storage.media import NHOST_PREFIX, resolve_local_path


def submit_attempt(db, session, attempt):
    db.refresh(attempt, with_for_update=True)
    if attempt.analysis_status in ("queued", "complete"):
        return
    metadata = json.loads(attempt.pressure_spec_json or "{}")
    rubric = metadata.get("answer_rubric", {})
    hint = metadata.get("language") or {"Hindi": "hi", "English": "en", "Malayalam": "ml", "Mixed": "auto"}.get(session.language, "auto")
    config = AnalysisConfig(practice_language=hint, question_key_points=rubric.get("key_points", []),
        question_prompt=attempt.prompt, reference_answer=rubric.get("reference_answer", ""),
        skip_vision=not bool(attempt.video_path), role=attempt.role)
    downloads = []
    try:
        paths = {}
        for kind, ref in (("audio", attempt.audio_path), ("video", attempt.video_path)):
            paths[kind] = resolve_local_path(ref) if ref else None
            if ref and ref.startswith(NHOST_PREFIX) and paths[kind]:
                downloads.append(Path(paths[kind]))
        job = sagemaker.submit(session.learner_id, "attempt", paths["audio"], video_path=paths["video"],
            payload={"attempt_id": attempt.id, "language_hint": hint, "config": config.model_dump(),
                     "recovery": session.mode == "recovery-training", "interruption_sec": metadata.get("interruption_sec")})
        metadata["sagemaker_job_id"] = job["job_id"]
        attempt.pressure_spec_json = json.dumps(metadata)
        attempt.analysis_status = "queued"
        attempt.status = "queued"
        db.commit()
    finally:
        for path in downloads:
            if path.resolve().parent == Path(tempfile.gettempdir()).resolve():
                path.unlink(missing_ok=True)


def refresh_attempt(db, session, attempt):
    if attempt.analysis_status != "queued":
        return
    # PostgreSQL row locking prevents simultaneous polls from applying the same result twice.
    db.refresh(attempt, with_for_update=True)
    if attempt.analysis_status != "queued":
        return
    job_id = json.loads(attempt.pressure_spec_json or "{}").get("sagemaker_job_id")
    if not job_id:
        result = {"status": "failed", "error": {"message": "This recording was queued before SageMaker was configured. Retry analysis.", "code": "missing_job"}}
    else:
        result = sagemaker.poll(session.learner_id, job_id)
    if result["status"] == "queued":
        db.commit()
        return
    if result["status"] == "complete":
        from app.orchestration.orchestrator import store_analysis_bundle
        try:
            bundle = SignalBundle.model_validate(result["result"])
            if bundle.attempt_id != attempt.id or not bundle.quality.audio_ok:
                raise ValueError("Invalid analysis result")
        except ValueError:
            result = {"status": "failed", "error": {"message": "The analysis result was invalid. Retry this recording.", "code": "invalid_result"}}
        else:
            store_analysis_bundle(db, session, attempt, bundle)
            return
    error = result.get("error") or {"message": "Analysis failed. Please retry.", "code": "analysis_failed"}
    attempt.analysis_status = "failed"
    attempt.status = "failed"
    db.add(SessionEvent(session_id=session.id, event_type="analysis_failed", payload_json=json.dumps({**error, "attempt_id": attempt.id})))
    db.commit()
