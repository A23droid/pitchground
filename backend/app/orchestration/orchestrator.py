from __future__ import annotations

import json
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.agents.challenge import render_challenge
from app.agents.diagnosis import render_diagnosis
from app.agents.interviewer import render_prompt
from app.ml.factory import get_analyzer, get_transcriber
from app.ml.types import AnalysisConfig, AttemptMedia, SignalBundle, Transcript
from app.models import (
    Attempt,
    AttemptMetrics,
    Baseline,
    ChallengeRow,
    ComparisonRow,
    DiagnosisRow,
    EvidenceRow,
    FailureCandidateRow,
    QuestionBankItem,
    Session as SessionModel,
    SessionEvent,
    TranscriptRow,
)
from app.orchestration.state_machine import ROLE_FOR_RECORDING, assert_can_advance
from app.services.baseline import baseline_vector
from app.services.comparison import compare_attempts
from app.services.detector import detect
from app.services.learner_state import update_from_bundle
from app.services.ws_hub import hub


def _iso(dt: datetime | None) -> str | None:
    return dt.isoformat() if dt else None


def session_to_dict(session: SessionModel) -> dict:
    return {
        "id": session.id,
        "learner_id": session.learner_id,
        "mode": session.mode,
        "phase": session.phase,
        "topic": session.topic,
        "audience": session.audience,
        "language": session.language,
        "difficulty": session.difficulty,
        "current_action": json.loads(session.current_action_json) if session.current_action_json else None,
        "latest_diagnosis": json.loads(session.diagnosis.payload_json) if session.diagnosis else None,
        "latest_challenge": json.loads(session.challenge.payload_json) if session.challenge else None,
        "latest_comparison": json.loads(session.comparison.payload_json) if session.comparison else None,
        "created_at": _iso(session.created_at),
        "updated_at": _iso(session.updated_at),
    }


def _bank(db: Session, topic: str, role: str) -> QuestionBankItem | None:
    return (
        db.query(QuestionBankItem)
        .filter(QuestionBankItem.topic == topic, QuestionBankItem.role == role)
        .first()
    )


def _set_action(session: SessionModel, action: dict) -> None:
    session.current_action_json = json.dumps(action)
    session.updated_at = datetime.now(timezone.utc)


def _event(db: Session, session: SessionModel, event_type: str, payload: dict) -> None:
    db.add(
        SessionEvent(
            session_id=session.id,
            event_type=event_type,
            payload_json=json.dumps(payload),
        )
    )


async def _emit(session: SessionModel, event_type: str, payload: dict) -> None:
    await hub.broadcast(session.id, event_type, session.phase, payload)


def build_prompt_action(db: Session, session: SessionModel, role: str) -> dict:
    item = _bank(db, session.topic, role) or _bank(db, "Database Systems", role)
    prompt_text = item.prompt if item else "Explain the core idea behind this topic."
    rendered = render_prompt(prompt_text, language="en", role=role)
    if item:
        rendered["question_bank_id"] = item.id
    pressure = {
        "time_limit_sec": item.time_limit_sec if item else (20 if role != "baseline" else None),
        "interruption": False,
    }
    action = {
        "type": "show_question",
        "question_spec": rendered,
        "pressure_spec": pressure,
        "ui_hints": {"show_timer": bool(pressure["time_limit_sec"]), "show_evidence": role != "baseline"},
    }
    _set_action(session, action)
    return action


def advance_session(db: Session, session: SessionModel, from_phase: str) -> SessionModel:
    nxt = assert_can_advance(session.phase, from_phase)
    prev = session.phase
    session.phase = nxt
    session.updated_at = datetime.now(timezone.utc)

    if nxt in ("baseline_prompt",):
        action = build_prompt_action(db, session, "baseline")
        _event(db, session, "question", action)
    elif nxt == "baseline_recording":
        action = json.loads(session.current_action_json or "{}")
        action["type"] = "record"
        _set_action(session, action)
    elif nxt == "pressure_prompt":
        action = build_prompt_action(db, session, "pressure")
        _event(db, session, "pressure_applied", action.get("pressure_spec") or {})
    elif nxt == "pressure_recording":
        action = json.loads(session.current_action_json or "{}")
        action["type"] = "record"
        _set_action(session, action)
    elif nxt == "challenge_prompt":
        if session.challenge:
            action = {
                "type": "show_challenge",
                "question_spec": {"prompt_text": session.challenge.prompt_text, "language": "en"},
                "ui_hints": {"show_timer": True, "show_evidence": True},
            }
            _set_action(session, action)
    elif nxt == "replay_condition":
        action = {
            "type": "show_challenge",
            "ui_hints": {"show_timer": True, "show_evidence": True},
            "pressure_spec": {"time_limit_sec": 20, "interruption": False},
        }
        if session.challenge:
            action["question_spec"] = {"prompt_text": session.challenge.prompt_text, "language": "en"}
            action["training_spec"] = json.loads(session.challenge.training_spec_json)
        _set_action(session, action)
    elif nxt == "retry_recording":
        action = json.loads(session.current_action_json or "{}")
        action["type"] = "record_retry"
        _set_action(session, action)
    elif nxt == "diagnosing":
        _set_action(session, {"type": "wait_analysis", "ui_hints": {"show_timer": False, "show_evidence": True}})
        run_diagnosis_pipeline(db, session)
        session.phase = "challenge_prompt"
        if session.challenge:
            _set_action(
                session,
                {
                    "type": "show_challenge",
                    "question_spec": {"prompt_text": session.challenge.prompt_text, "language": "en"},
                    "ui_hints": {"show_timer": True, "show_evidence": True},
                },
            )
    elif nxt == "comparing":
        # Reached via advance from retry_recording (analysis job may also set this phase).
        run_comparison_pipeline(db, session)
        session.phase = "profile_updated"
        _set_action(session, {"type": "show_comparison", "ui_hints": {"show_timer": False, "show_evidence": True}})
    elif nxt == "profile_updated":
        # Common path: analysis job already moved phase to comparing; FE advances here.
        if not session.comparison:
            run_comparison_pipeline(db, session)
        _set_action(session, {"type": "show_comparison", "ui_hints": {"show_timer": False, "show_evidence": True}})
    elif nxt == "completed":
        _set_action(session, {"type": "done", "ui_hints": {"show_timer": False, "show_evidence": False}})

    _event(db, session, "phase_changed", {"from": prev, "to": session.phase})
    db.commit()
    db.refresh(session)
    return session


def create_attempt(db: Session, session: SessionModel, role: str) -> Attempt:
    expected = ROLE_FOR_RECORDING.get(session.phase)
    if expected and expected != role:
        raise ValueError(f"Role {role} not allowed in phase {session.phase}")
    action = json.loads(session.current_action_json or "{}")
    prompt = (action.get("question_spec") or {}).get("prompt_text") or ""
    pressure = action.get("pressure_spec") or {}
    attempt = Attempt(
        session_id=session.id,
        role=role,
        status="open",
        prompt=prompt,
        pressure_spec_json=json.dumps(pressure),
        analysis_status="pending",
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    return attempt


def analyze_attempt_job(session_id: str, attempt_id: str) -> None:
    from app.db import SessionLocal

    db = SessionLocal()
    try:
        session = db.get(SessionModel, session_id)
        attempt = db.get(Attempt, attempt_id)
        if not session or not attempt or not attempt.audio_path:
            return
        attempt.analysis_status = "queued"
        db.commit()

        item = _bank(db, session.topic, attempt.role)
        key_points = json.loads(item.key_points_json) if item else []

        transcriber = get_transcriber()
        analyzer = get_analyzer()
        transcript = transcriber.transcribe(attempt.audio_path, language_hint="en")
        if not transcript.text:
            transcript = Transcript(
                text=attempt.prompt or "No speech detected.",
                language="en",
                confidence=None,
                segments=[],
            )

        media = AttemptMedia(attempt_id=attempt.id, audio_path=attempt.audio_path, video_path=attempt.video_path)
        config = AnalysisConfig(
            practice_language="en",
            question_key_points=key_points,
            skip_vision=not bool(attempt.video_path),
            role=attempt.role,  # type: ignore[arg-type]
        )
        bundle = analyzer.analyze_attempt(media, transcript, config)

        if attempt.transcript:
            attempt.transcript.text = transcript.text
            attempt.transcript.language = transcript.language
            attempt.transcript.segments_json = json.dumps([s.model_dump() for s in transcript.segments])
        else:
            db.add(
                TranscriptRow(
                    attempt_id=attempt.id,
                    text=transcript.text,
                    language=transcript.language,
                    segments_json=json.dumps([s.model_dump() for s in transcript.segments]),
                )
            )

        if attempt.metrics:
            attempt.metrics.signal_bundle_json = bundle.model_dump_json()
        else:
            db.add(AttemptMetrics(attempt_id=attempt.id, signal_bundle_json=bundle.model_dump_json()))

        if attempt.role == "baseline":
            vec = baseline_vector(bundle)
            if session.baseline:
                session.baseline.vector_json = json.dumps(vec)
            else:
                db.add(Baseline(session_id=session.id, vector_json=json.dumps(vec)))
            if session.phase == "baseline_recording":
                session.phase = "baseline_analyzed"
                _set_action(session, {"type": "wait_analysis", "ui_hints": {"show_timer": False, "show_evidence": True}})

        if attempt.role == "pressure" and session.phase == "pressure_recording":
            session.phase = "pressure_analyzed"
            _set_action(session, {"type": "wait_analysis", "ui_hints": {"show_timer": False, "show_evidence": True}})

        if attempt.role == "retry" and session.phase == "retry_recording":
            session.phase = "comparing"

        attempt.analysis_status = "complete"
        attempt.status = "complete"
        update_from_bundle(db, session.learner_id, bundle)
        db.commit()

        import asyncio

        payload = {
            "attempt_id": attempt.id,
            "role": attempt.role,
            "fused": bundle.fused.model_dump(),
            "quality": bundle.quality.model_dump(),
        }
        try:
            asyncio.run(hub.broadcast(session.id, "attempt_scored", session.phase, payload))
        except RuntimeError:
            # Already inside a running loop (e.g. tests) — schedule best-effort.
            try:
                loop = asyncio.get_running_loop()
                loop.create_task(hub.broadcast(session.id, "attempt_scored", session.phase, payload))
            except Exception:
                pass
        except Exception:
            pass
    finally:
        db.close()


def run_diagnosis_pipeline(db: Session, session: SessionModel) -> None:
    attempts = {a.role: a for a in session.attempts}
    baseline_a = attempts.get("baseline")
    pressure_a = attempts.get("pressure")
    if not baseline_a or not pressure_a or not baseline_a.metrics or not pressure_a.metrics:
        return
    base_bundle = SignalBundle.model_validate_json(baseline_a.metrics.signal_bundle_json)
    press_bundle = SignalBundle.model_validate_json(pressure_a.metrics.signal_bundle_json)
    evidence, candidates = detect(base_bundle, press_bundle)

    db.query(EvidenceRow).filter(EvidenceRow.session_id == session.id).delete()
    db.query(FailureCandidateRow).filter(FailureCandidateRow.session_id == session.id).delete()
    for e in evidence:
        db.add(
            EvidenceRow(
                id=e.id,
                session_id=session.id,
                attempt_id=e.attempt_id,
                metric=e.metric,
                delta=str(e.delta),
                threshold=str(e.threshold),
                modality=e.modality,
                excerpt=e.excerpt,
                payload_json=e.model_dump_json(),
            )
        )
    for c in candidates:
        db.add(
            FailureCandidateRow(
                session_id=session.id,
                condition=c.condition,
                score=str(c.score),
                evidence_ids_json=json.dumps(c.evidence_ids),
            )
        )

    transcript = pressure_a.transcript.text if pressure_a.transcript else ""
    diagnosis = render_diagnosis(candidates, evidence, transcript)
    item = _bank(db, session.topic, "retry") or _bank(db, session.topic, "pressure")
    challenge = render_challenge(diagnosis, item.prompt if item else "Retry the same topic under 20 seconds.", "en")

    payload = diagnosis
    if session.diagnosis:
        session.diagnosis.condition = diagnosis["condition"]
        session.diagnosis.confidence = diagnosis["confidence"]
        session.diagnosis.rationale = diagnosis["rationale"]
        session.diagnosis.evidence_ids_json = json.dumps(diagnosis["evidence_ids"])
        session.diagnosis.payload_json = json.dumps(payload)
    else:
        db.add(
            DiagnosisRow(
                session_id=session.id,
                condition=diagnosis["condition"],
                confidence=diagnosis["confidence"],
                rationale=diagnosis["rationale"],
                evidence_ids_json=json.dumps(diagnosis["evidence_ids"]),
                payload_json=json.dumps(payload),
            )
        )

    if session.challenge:
        session.challenge.prompt_text = challenge["prompt_text"]
        session.challenge.training_spec_json = json.dumps(challenge["training_spec"])
        session.challenge.payload_json = json.dumps(challenge)
    else:
        db.add(
            ChallengeRow(
                session_id=session.id,
                prompt_text=challenge["prompt_text"],
                training_spec_json=json.dumps(challenge["training_spec"]),
                payload_json=json.dumps(challenge),
            )
        )
    db.commit()


def run_comparison_pipeline(db: Session, session: SessionModel) -> None:
    attempts = {a.role: a for a in session.attempts}
    pressure_a = attempts.get("pressure")
    retry_a = attempts.get("retry")
    if not pressure_a or not retry_a or not pressure_a.metrics or not retry_a.metrics:
        return
    press_bundle = SignalBundle.model_validate_json(pressure_a.metrics.signal_bundle_json)
    retry_bundle = SignalBundle.model_validate_json(retry_a.metrics.signal_bundle_json)
    report = compare_attempts(press_bundle, retry_bundle)
    if session.comparison:
        session.comparison.payload_json = json.dumps(report)
    else:
        db.add(ComparisonRow(session_id=session.id, payload_json=json.dumps(report)))
    db.commit()
