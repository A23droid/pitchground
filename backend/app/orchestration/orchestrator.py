from __future__ import annotations

import json
import logging
import tempfile
from pathlib import Path
from app.storage.media import resolve_local_path, NHOST_PREFIX
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.agents.llm_client import LLMError
from app.agents.challenge import render_challenge
from app.agents.diagnosis import render_diagnosis
from app.agents.interviewer import render_prompt
from app.ml.factory import get_analyzer, get_transcriber
from app.ml.types import AnalysisConfig, AttemptMedia, SignalBundle, Transcript, TranscriptSegment
from app.ml.speech_quality import SPEECH_PIPELINE_VERSION
from app.models import (
    Attempt,
    AttemptMetrics,
    Baseline,
    ChallengeRow,
    ComparisonRow,
    DiagnosisRow,
    EvidenceRow,
    FailureCandidateRow,
    Session as SessionModel,
    SessionEvent,
    TranscriptRow,
)
from app.orchestration.state_machine import ROLE_FOR_RECORDING, assert_can_advance
from app.services.baseline import baseline_vector
from app.services.comparison import compare_attempts
from app.services.detector import detect, _get as metric_value
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
        "current_action": {k: v for k, v in json.loads(session.current_action_json).items() if k != "answer_rubric"} if session.current_action_json else None,
        "latest_diagnosis": json.loads(session.diagnosis.payload_json) if session.diagnosis else None,
        "latest_challenge": json.loads(session.challenge.payload_json) if session.challenge else None,
        "latest_comparison": json.loads(session.comparison.payload_json) if session.comparison else None,
        "created_at": _iso(session.created_at),
        "updated_at": _iso(session.updated_at),
    }


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
    rendered = render_prompt(session.topic, language=session.language, role=role,
                             mode=session.mode, audience=session.audience, difficulty=session.difficulty)
    pressure = {
        "time_limit_sec": 20 if role != "baseline" else None,
        "interruption": False,
    }
    action = {
        "type": "show_question",
        "question_spec": {k: v for k, v in rendered.items() if k not in ("key_points", "reference_answer")},
        "answer_rubric": {k: rendered[k] for k in ("key_points", "reference_answer")},
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
            spec = action["training_spec"]
            action["pressure_spec"] = {"time_limit_sec": spec.get("time_limit_sec"), "interruption": spec.get("interruption", False)}
            pressure_attempt = next((a for a in reversed(session.attempts) if a.role == "pressure"), None)
            if pressure_attempt:
                action["answer_rubric"] = json.loads(pressure_attempt.pressure_spec_json or "{}").get("answer_rubric", {})
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


def create_attempt(db: Session, session: SessionModel, role: str, language: str | None = None, prompt: str | None = None, interruption_sec: float | None = None) -> Attempt:
    expected = ROLE_FOR_RECORDING.get(session.phase)
    if session.mode == "interview" and (not expected or expected != role):
        raise ValueError(f"Role {role} not allowed in phase {session.phase}")
    action = json.loads(session.current_action_json or "{}")
    prompt = prompt or (action.get("question_spec") or {}).get("prompt_text") or ""
    pressure = action.get("pressure_spec") or {}
    pressure = {**pressure, "answer_rubric": action.get("answer_rubric", {}), "language": language, "interruption_sec": interruption_sec}
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
    downloads = []
    try:
        session = db.get(SessionModel, session_id)
        attempt = db.get(Attempt, attempt_id)
        if not session or not attempt or not attempt.audio_path:
            return
        attempt.analysis_status = "queued"
        db.commit()

        metadata = json.loads(attempt.pressure_spec_json or "{}")
        rubric = metadata.get("answer_rubric", {})
        key_points = rubric.get("key_points", [])

        local_audio = resolve_local_path(attempt.audio_path)
        local_video = resolve_local_path(attempt.video_path) if attempt.video_path else None
        for original, resolved in ((attempt.audio_path, local_audio), (attempt.video_path, local_video)):
            if original and original.startswith(NHOST_PREFIX) and resolved:
                downloads.append(Path(resolved))
        transcriber = get_transcriber()
        analyzer = get_analyzer()
        lang_hint = metadata.get("language") or {"Hindi": "hi", "English": "en", "Malayalam": "ml", "Mixed": "auto"}.get(session.language, "auto")
        cached_stt = metadata.get("transcription", {})
        model_name = getattr(transcriber, "model_size", None)
        same_model = not isinstance(model_name, str) or cached_stt.get("model") == model_name
        if attempt.transcript and attempt.transcript.text and same_model and cached_stt.get("pipeline_version") == SPEECH_PIPELINE_VERSION:
            segments=[TranscriptSegment.model_validate(s) for s in json.loads(attempt.transcript.segments_json or "[]")]
            transcript=Transcript(text=attempt.transcript.text,language=attempt.transcript.language,segments=segments,
                                  words=[word for segment in segments for word in segment.words],
                                  confidence=cached_stt.get("confidence"),provenance=cached_stt)
        else:
            transcript = transcriber.transcribe(local_audio, language_hint=lang_hint)
            if transcript.text.strip():
                if attempt.transcript:
                    attempt.transcript.text=transcript.text
                    attempt.transcript.language=transcript.language
                    attempt.transcript.segments_json=json.dumps([s.model_dump() for s in transcript.segments])
                else:
                    attempt.transcript=TranscriptRow(text=transcript.text,language=transcript.language,
                                                    segments_json=json.dumps([s.model_dump() for s in transcript.segments]))
                metadata["transcription"]={**transcript.provenance,"pipeline_version":SPEECH_PIPELINE_VERSION,"confidence":transcript.confidence}
                attempt.pressure_spec_json=json.dumps(metadata)
                db.commit()
        if not transcript.text:
            transcript = Transcript(
                text="",
                language=transcript.language or ("hi" if lang_hint == "hi" else "en"),
                confidence=0.0,
                segments=[],
                words=[],
            )

        media = AttemptMedia(attempt_id=attempt.id, audio_path=local_audio, video_path=local_video)
        practice_lang = lang_hint
        config = AnalysisConfig(
            practice_language=practice_lang,
            question_key_points=key_points,
            question_prompt=attempt.prompt,
            reference_answer=rubric.get("reference_answer", ""),
            skip_vision=not bool(attempt.video_path),
            role=attempt.role,  # type: ignore[arg-type]
        )
        bundle = analyzer.analyze_attempt(media, transcript, config)
        if not bundle.quality.audio_ok:
            raise ValueError("No usable speech was detected. Check your microphone and record again.")
        if session.mode == "recovery-training":
            from app.ml.recovery import measure_recovery
            bundle.recovery = measure_recovery(local_audio, transcript, config, metadata.get("interruption_sec"), analyzer)


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
            attempt.metrics = AttemptMetrics(signal_bundle_json=bundle.model_dump_json())

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
    except Exception as exc:
        logging.getLogger(__name__).exception("Attempt analysis failed for %s", attempt_id)
        db.rollback()
        attempt = db.get(Attempt, attempt_id)
        if attempt:
            attempt.analysis_status = "failed"
            attempt.status = "failed"
            db.add(SessionEvent(session_id=session_id, event_type="analysis_failed",
                                payload_json=json.dumps({"attempt_id": attempt_id, "message": str(exc) if isinstance(exc, (LLMError, ValueError)) else "Analysis failed. Please retry.", "code": exc.code if isinstance(exc, LLMError) else "analysis_failed", "retry_after": exc.retry_after if isinstance(exc, LLMError) else None})))
            db.commit()
    finally:
        db.close()
        for download in downloads:
            if download.resolve().parent == Path(tempfile.gettempdir()).resolve():
                download.unlink(missing_ok=True)


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
    item = (
        _bank(db, session.topic, "retry")
        or _bank(db, session.topic, "pressure")
        or _bank(db, "Database Systems", "retry")
    )
    challenge = render_challenge(
        diagnosis,
        pressure_a.prompt,
        session.language or "en",
        transcript=transcript,
        difficulty=session.difficulty,
    )

    # The replay must preserve the actual question and pressure; coaching cannot change the experiment.
    challenge["prompt_text"] = pressure_a.prompt
    original_pressure = json.loads(pressure_a.pressure_spec_json or "{}")
    challenge["training_spec"].update(time_limit_sec=original_pressure.get("time_limit_sec"),
                                      interruption=original_pressure.get("interruption", False),
                                      replay_condition="same_prompt")
    diagnosis["attempt_count"] = 2
    diagnosis["metric_rows"] = [{"metric":e.metric,"a":metric_value(base_bundle,e.metric),"b":metric_value(press_bundle,e.metric)} for e in evidence]
    payload = diagnosis
    if session.diagnosis:
        session.diagnosis.condition = diagnosis["condition"]
        session.diagnosis.confidence = "uncalibrated"
        session.diagnosis.rationale = diagnosis["rationale"]
        session.diagnosis.evidence_ids_json = json.dumps(diagnosis["evidence_ids"])
        session.diagnosis.payload_json = json.dumps(payload)
    else:
        db.add(
            DiagnosisRow(
                session_id=session.id,
                condition=diagnosis["condition"],
                confidence="uncalibrated",
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
