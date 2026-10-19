"""Isolated product regression tests. Provider responses are explicit test doubles."""
import json
import os
import tempfile
from pathlib import Path
from unittest.mock import patch

_TEST_DIR = tempfile.TemporaryDirectory(prefix="pitchground-tests-")
os.environ["DATABASE_URL"] = "sqlite:///" + str(Path(_TEST_DIR.name) / "test.db")
os.environ["JWT_SECRET"] = "isolated-regression-test-secret-with-32-characters"
os.environ["STORAGE_BACKEND"] = "local"

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db import SessionLocal, engine
from app.ml.types import Transcript, TranscriptWord, TranscriptSegment
from app.ml.language import LanguageExtractor

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as client:
        yield client
    engine.dispose()
    _TEST_DIR.cleanup()

@pytest.fixture(scope="module")
def headers(client):
    r = client.post("/auth/signup", json={"name": "Learner", "email": "Learner@example.com", "password": "unique-test-password"})
    assert r.status_code == 200, r.text
    return {"Authorization": "Bearer " + r.json()["access_token"]}

def test_login_and_identity(client, headers):
    r = client.post("/auth/login", json={"email": "LEARNER@example.com", "password": "unique-test-password"})
    assert r.status_code == 200, r.text
    me = client.get("/auth/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["learner_id"]
    assert client.post("/auth/login", json={"email": "learner@example.com", "password": "wrong"}).status_code == 401
    assert client.get("/auth/me", headers={"Authorization": "Bearer invalid"}).status_code == 401

def test_new_profile_has_no_demo_scores(client, headers):
    learner = client.get("/auth/me", headers=headers).json()["learner_id"]
    p = client.get(f"/v1/learners/{learner}/profile", headers=headers).json()
    assert p["sessions_completed"] == 0
    assert p["dimensions"] == []
    assert p["progress"] == []

@pytest.mark.parametrize("mode", ["interview", "debate", "impromptu", "language-diagnostic", "recovery-training"])
def test_arbitrary_domain_question(client, headers, mode):
    generated = dict(prompt_text="How would you explain colour harmony to a new artist?", key_points=["contrast", "balance"], reference_answer="Colour harmony balances contrast and related hues.", expected_duration_sec=60)
    with patch("app.agents.interviewer.chat_json", return_value=generated) as provider:
        r = client.post("/v1/sessions", headers=headers, json={"mode":mode,"topic":"Fine arts","language":"Hindi"})
        assert r.status_code == 201, r.text
        session = r.json()
        if mode == "interview":
            session = client.post(f"/v1/sessions/{session['id']}/advance", headers=headers, json={"from_phase":"created"}).json()
        assert session["current_action"]["question_spec"]["prompt_text"] == generated["prompt_text"]
        assert "answer_rubric" not in session["current_action"]
        assert "Fine arts" in provider.call_args.args[1]
        assert "Hindi" in provider.call_args.args[1]

def test_generation_failure_does_not_return_canned_question(client, headers):
    with patch("app.agents.interviewer.chat_json", return_value=None):
        r = client.post("/v1/sessions", headers=headers, json={"mode":"impromptu","topic":"Medicine"})
    assert r.status_code == 503


def test_interview_start_is_persisted_and_duplicate_transitions_are_safe(client, headers):
    session=client.post("/v1/sessions",headers=headers,json={"topic":"Home gardening"}).json()
    url=f"/v1/sessions/{session['id']}"
    generated=dict(prompt_text="How would you explain plant care to a beginner?",key_points=["Water and light"],reference_answer="Plants need suitable water and light.",expected_duration_sec=60)
    with patch("app.agents.interviewer.chat_json",return_value=generated) as provider:
        prompt=client.post(url+"/advance",headers=headers,json={"from_phase":"created"})
        assert prompt.status_code==200,prompt.text
        assert prompt.json()["phase"]=="baseline_prompt"
        assert client.get(url,headers=headers).json()["phase"]=="baseline_prompt"
        duplicate=client.post(url+"/advance",headers=headers,json={"from_phase":"created"})
        assert duplicate.status_code==200
        assert duplicate.json()["current_action"]==prompt.json()["current_action"]
        assert provider.call_count==1
    for _ in range(2):
        recording=client.post(url+"/advance",headers=headers,json={"from_phase":"baseline_prompt"})
        assert recording.status_code==200,recording.text
        assert recording.json()["phase"]=="baseline_recording"
    attempt=client.post(url+"/attempts",headers=headers,json={"role":"baseline"})
    assert attempt.status_code==201,attempt.text


def test_failed_interview_generation_can_retry_from_created(client, headers):
    from app.agents.llm_client import LLMError
    session=client.post("/v1/sessions",headers=headers,json={"topic":"History"}).json()
    url=f"/v1/sessions/{session['id']}"
    with patch("app.agents.interviewer.chat_json",side_effect=LLMError("provider_unavailable","questions")):
        assert client.post(url+"/advance",headers=headers,json={"from_phase":"created"}).status_code==503
    assert client.get(url,headers=headers).json()["phase"]=="created"
    generated=dict(prompt_text="How would you explain history to a new student?",key_points=["Evidence"],reference_answer="History examines evidence about the past.",expected_duration_sec=60)
    with patch("app.agents.interviewer.chat_json",return_value=generated):
        assert client.post(url+"/advance",headers=headers,json={"from_phase":"created"}).json()["phase"]=="baseline_prompt"


def test_debate_opponent_uses_groq_role_and_actual_exchange(client,headers):
    payload=dict(topic="Public transport",user_position="Against",language="Hindi",turn=2,user_transcript="The cost is too high.",history=[dict(speaker="user",text="Construction is expensive."),dict(speaker="opponent",text="Consider long-term access.")])
    with patch("app.api.rest.debate.chat_json",return_value={"counter_argument":"Compare construction costs with long-term access and reduced congestion."}) as provider:
        response=client.post("/v1/debate/counter",headers=headers,json=payload)
    assert response.status_code==200,response.text
    assert provider.call_args.kwargs["role"]=="debate"
    sent=json.loads(provider.call_args.args[1])
    assert sent["opponent_position"]=="For"
    assert sent["user_transcript"]==payload["user_transcript"]
    assert sent["history"]==payload["history"]


def test_debate_does_not_generate_without_an_argument_or_accept_invalid_reply(client,headers):
    with patch("app.api.rest.debate.chat_json") as provider:
        assert client.post("/v1/debate/counter",headers=headers,json={"topic":"Gardening","user_transcript":" "}).status_code==422
        provider.assert_not_called()
    with patch("app.api.rest.debate.chat_json",return_value={"counter_argument":123}):
        assert client.post("/v1/debate/counter",headers=headers,json={"topic":"Gardening","user_transcript":"Plants need water."}).status_code==503
    assert client.post("/v1/debate/counter",json={"topic":"Gardening","user_transcript":"Plants need water."}).status_code==401

def test_client_cannot_submit_fake_metrics(client, headers):
    r = client.post("/v1/sessions", headers=headers, json={"topic":"History"})
    r = client.post(f"/v1/sessions/{r.json()['id']}/complete", headers=headers, json={"metrics":{"overallScore":99}})
    assert r.status_code == 422

def test_pauses_and_articles_are_not_counted_as_fillers():
    transcript = Transcript(text="I am a speaker um you know", language="en", words=[TranscriptWord(word="I",start_sec=0,end_sec=.2),TranscriptWord(word="am",start_sec=2,end_sec=2.2)])
    _, rate = LanguageExtractor().extract(transcript)
    assert rate == round(2/7*100,2)

def test_language_ratio_uses_requested_target():
    transcript = Transcript(text="hello नमस्ते", language="mixed", segments=[TranscriptSegment(start_sec=0,end_sec=2,text="hello नमस्ते")])
    language, _ = LanguageExtractor().extract(transcript, "hi")
    assert language.primary_ratio == .5
    assert language.code_switch_rate == 30

def test_content_validation_rejects_invalid_provider_scores():
    from app.ml.content import ContentEvaluator
    with patch("app.ml.content.chat_json", return_value={"correctness": 12}):
        assert ContentEvaluator().validate_answer("answer", "question", ["criterion"], "reference") is None

def test_no_deterioration_is_not_a_failure():
    from app.ml.types import SignalBundle, AcousticSignals, LanguageSignals, FusedDimensions, QualityFlags
    from app.services.detector import detect
    from app.agents.diagnosis import render_diagnosis
    bundle = SignalBundle(attempt_id="test",transcript=Transcript(text="hello"),acoustic=AcousticSignals(),language=LanguageSignals(),fused=FusedDimensions(),quality=QualityFlags(audio_ok=True))
    evidence, candidates = detect(bundle,bundle)
    assert candidates == []
    assert render_diagnosis(candidates,evidence,"hello")["condition"] == "no_measured_deterioration"


def test_failed_audio_does_not_update_profile(client, headers):
    from app.models import Attempt, Session as SessionModel, LearnerDimensionScore
    from app.orchestration.orchestrator import analyze_attempt_job
    from app.ml.types import SignalBundle, AcousticSignals, LanguageSignals, FusedDimensions, QualityFlags
    session = client.post("/v1/sessions", headers=headers, json={"topic":"Astronomy"}).json()
    with SessionLocal() as db:
        a = Attempt(session_id=session["id"],role="baseline",audio_path="missing-audio.wav",analysis_status="pending",prompt="Explain a planet")
        db.add(a); db.commit(); aid=a.id
    invalid = SignalBundle(attempt_id=aid,transcript=Transcript(text=""),acoustic=AcousticSignals(),language=LanguageSignals(),fused=FusedDimensions(),quality=QualityFlags(audio_ok=False))
    with patch("app.orchestration.orchestrator.get_transcriber") as transcriber, patch("app.orchestration.orchestrator.get_analyzer") as analyzer:
        transcriber.return_value.transcribe.return_value=Transcript(text="")
        analyzer.return_value.analyze_attempt.return_value=invalid
        analyze_attempt_job(session["id"],aid)
    with SessionLocal() as db:
        assert db.get(Attempt,aid).analysis_status=="failed"
        assert db.get(SessionModel,session["id"]).baseline is None
        assert db.query(LearnerDimensionScore).count()==0


def test_actual_silent_audio_has_no_speech(tmp_path):
    import numpy as np
    import soundfile as sf
    from app.ml.acoustic import AcousticExtractor
    path=tmp_path/"silence.wav"
    sf.write(path,np.zeros(16000,dtype=np.float32),16000)
    signals,_=AcousticExtractor().extract(str(path),"")
    assert signals.wpm==0
    assert signals.speech_duration_sec==0
    assert signals.pause_ratio==1
    assert signals.response_latency_sec is None


def test_vision_no_subject_returns_unavailable(tmp_path):
    import cv2
    import numpy as np
    from app.ml.vision import VisionExtractor
    path=tmp_path/"empty.avi"
    writer=cv2.VideoWriter(str(path),cv2.VideoWriter_fourcc(*"MJPG"),5,(320,240))
    assert writer.isOpened()
    for _ in range(5): writer.write(np.zeros((240,320,3),dtype=np.uint8))
    writer.release()
    extractor=VisionExtractor()
    if not (extractor.model_dir/"face_landmarker.task").exists():
        pytest.skip("Run download_vision_models.py to exercise MediaPipe runtime.")
    # Fail the test on initialization/inference errors; an empty scene is expected to have no subject.
    with patch("app.ml.vision.logger.exception") as errors:
        signals,score=extractor.extract(str(path))
        assert signals is None and score is None
        errors.assert_not_called()


def test_content_validation_accepts_bounded_answer_review():
    from app.ml.content import ContentEvaluator
    reviewed=dict(structure=.5,correctness=.2,relevance=.8,coverage=.3,specificity=.4,feedback="The answer omits a needed example.")
    with patch("app.ml.content.chat_json",return_value=reviewed):
        result=ContentEvaluator().validate_answer("answer","question",["criterion"],"reference")
    assert result.correctness==.2
    assert result.validation_status=="llm_reviewed"


def test_question_generation_rejects_malformed_provider_output(client,headers):
    with patch("app.agents.interviewer.chat_json", return_value={"prompt_text":"x","key_points":[],"expected_duration_sec":-1}):
        r=client.post("/v1/sessions",headers=headers,json={"mode":"debate","topic":"Architecture"})
        assert r.status_code==503


def test_stt_requires_authentication(client):
    assert client.post("/v1/stt/transcribe",files={"audio":("audio.wav",b"x"*1000,"audio/wav")}).status_code == 401


def test_websocket_requires_authentication(client):
    from starlette.websockets import WebSocketDisconnect
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/v1/sessions/not-owned/ws"):
            pass


def test_profile_is_private(client,headers):
    assert client.get("/v1/learners/not-owned/profile",headers=headers).status_code == 404


def test_reports_require_recorded_evidence(client,headers):
    session=client.post("/v1/sessions",headers=headers,json={"topic":"Physics"}).json()
    assert client.get(f"/v1/sessions/{session['id']}/report",headers=headers).status_code == 409


def test_report_uses_persisted_takes_and_caches_coaching(client,headers):
    from app.models import Attempt, AttemptMetrics, DiagnosisRow
    from app.ml.types import SignalBundle, AcousticSignals, LanguageSignals, FusedDimensions, QualityFlags
    generated=dict(prompt_text="Explain how to care for an indoor plant.",key_points=["light","water"],reference_answer="Provide suitable light and appropriate watering.",expected_duration_sec=60)
    with patch("app.agents.interviewer.chat_json",return_value=generated):
        created=client.post("/v1/sessions",headers=headers,json={"mode":"debate","topic":"Plant care"}).json()
    sid=created["id"]
    def persist(role,fluency):
        with SessionLocal() as db:
            attempt=Attempt(session_id=sid,role=role,prompt=generated["prompt_text"],analysis_status="complete",status="complete")
            db.add(attempt); db.flush()
            bundle=SignalBundle(attempt_id=attempt.id,transcript=Transcript(text="Plants need appropriate light and water."),acoustic=AcousticSignals(wpm=120,duration_sec=10,speech_duration_sec=8),language=LanguageSignals(),provenance={"source":"recorded_media"},fused=FusedDimensions(fluency=fluency,composure=.5,language_stability=.5),quality=QualityFlags(audio_ok=True))
            db.add(AttemptMetrics(attempt_id=attempt.id,signal_bundle_json=bundle.model_dump_json()))
            db.commit()
            return attempt.id
    opening=persist("opening",0)
    closing=persist("closing",1)
    coaching=dict(diagnosis=dict(headline="Review your delivery",explanation="The measured recordings have different fluency values."),challenge=dict(objective="Practice a clear explanation",framework=["Point","Reason"],prompt="An unrelated generated prompt must not replace the comparable take.",timeLimitSeconds=30,weaknessTargeted="Clarity"))
    with patch("app.services.practice_report.chat_json",return_value=coaching) as provider:
        first=client.get(f"/v1/sessions/{sid}/report",headers=headers)
        assert first.status_code==200,first.text
        data=first.json()
        assert data["attempt_ids"]==[opening,closing]
        assert data["analysis"]["argumentation"] is None
        assert data["analysis"]["rebuttal"] is None
        assert data["analysis"]["openingScore"]==33
        assert data["analysis"]["rebuttalScore"]==67
        assert data["challenge"]["prompt"]==generated["prompt_text"]
        assert data["diagnosis"]["confidence"] is None
        assert client.get(f"/v1/sessions/{sid}/report",headers=headers).json()==data
        assert provider.call_count==1
        retry=persist("retry",.8)
        refreshed=client.get(f"/v1/sessions/{sid}/report",headers=headers)
        assert refreshed.status_code==200,refreshed.text
        assert refreshed.json()["attempt_ids"]==[opening,closing,retry]
        assert provider.call_count==2
    with SessionLocal() as db:
        assert db.query(DiagnosisRow).filter(DiagnosisRow.session_id==sid).count()==1


def test_other_learner_cannot_read_session_or_profile(client,headers):
    primary=client.get("/auth/me",headers=headers).json()["learner_id"]
    session=client.post("/v1/sessions",headers=headers,json={"topic":"History"}).json()["id"]
    other=client.post("/auth/signup",json={"name":"Other","email":"other@example.com","password":"another-test-password"}).json()
    other_headers={"Authorization":"Bearer "+other["access_token"]}
    assert client.get(f"/v1/learners/{primary}/profile",headers=other_headers).status_code==403
    assert client.get(f"/v1/sessions/{session}",headers=other_headers).status_code==403
    from starlette.websockets import WebSocketDisconnect
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect(f"/v1/sessions/{session}/ws?token={other['access_token']}"):
            pass


def test_challenge_preserves_question_and_uses_validated_coaching():
    from app.agents.challenge import render_challenge
    with patch("app.agents.challenge.chat_json", return_value={"objective":"Explain the main point clearly","framework":["State your point","Give an example"],"coaching":"Use your own example to support the explanation."}):
        challenge=render_challenge({"condition":"no_measured_deterioration"},"Explain how a garden grows.","Hindi",transcript="Plants need water.",difficulty="Easy")
    assert challenge["prompt_text"]=="Explain how a garden grows."
    assert challenge["framework"]==["State your point","Give an example"]
    assert challenge["training_spec"]["language"]=="Hindi"
    assert challenge["training_spec"]["difficulty"]=="Easy"
    assert challenge["training_spec"]["replay_condition"]=="same_prompt"


def test_challenge_generation_failure_is_explicit():
    from app.agents.challenge import render_challenge
    with patch("app.agents.challenge.chat_json", return_value=None):
        with pytest.raises(RuntimeError):
            render_challenge({"condition":"fluency_breakdown"},"Explain a plant.")


def test_historical_unverified_scores_are_not_presented_as_real_data(client,headers):
    from app.models import LearnerDimensionScore, Session as SessionModel, Attempt, AttemptMetrics
    me=client.get("/auth/me",headers=headers).json()
    with SessionLocal() as db:
        session=SessionModel(learner_id=me["learner_id"],topic="Historical demo",mode="interview",phase="completed")
        db.add(session);db.flush()
        attempt=Attempt(session_id=session.id,role="baseline",prompt="Old demo",analysis_status="complete")
        db.add(attempt);db.flush()
        db.add(AttemptMetrics(attempt_id=attempt.id,signal_bundle_json=json.dumps({"overallScore":99})))
        db.add(LearnerDimensionScore(learner_id=me["learner_id"],dimension="fabricated_dimension",score=99,n=10))
        db.commit();sid=session.id
    profile=client.get(f"/v1/learners/{me['learner_id']}/profile",headers=headers).json()
    assert all(d["id"]!="fabricated_dimension" for d in profile["dimensions"])
    old=next(s for s in profile["recent_sessions"] if s["id"]==sid)
    assert old["overall_score"] is None
    assert old["metrics_verified"] is False


def test_provider_stage_error_is_exposed_without_secrets(client,headers):
    from app.agents.llm_client import LLMError
    with patch("app.agents.interviewer.chat_json",side_effect=LLMError("rate_limited","questions",15)):
        result=client.post("/v1/sessions",headers=headers,json={"mode":"impromptu","topic":"Gardening"})
    assert result.status_code==429
    assert result.headers["retry-after"]=="15"
    assert result.json()["stage"]=="questions"


def test_incomplete_ml_values_remain_unavailable():
    from app.ml.types import FusedDimensions,VisualSignals,LanguageSignals,QualityFlags
    assert all(v is None for v in FusedDimensions().model_dump().values())
    assert VisualSignals().gaze_away is None
    assert LanguageSignals().primary_ratio is None
    assert QualityFlags().audio_ok is False


def test_session_policy_cannot_override_server_configuration(client, headers):
    response=client.post("/v1/sessions",headers=headers,json={"topic":"History","policy":{"mode":"debate","language":"Hindi"}})
    assert response.status_code==422


def test_missing_transcription_media_is_explicit(tmp_path):
    from app.ml.local_transcriber import LocalWhisperTranscriber
    with pytest.raises(ValueError,match="missing"):
        LocalWhisperTranscriber().transcribe(str(tmp_path/"absent.wav"))


def test_invalid_answer_review_cannot_complete_real_analysis():
    from types import SimpleNamespace
    from unittest.mock import Mock
    from app.ml.real_analyzer import RealAnalyzer
    from app.ml.types import AcousticSignals, LanguageSignals, AttemptMedia, AnalysisConfig
    from app.agents.llm_client import LLMError
    analyzer=RealAnalyzer.__new__(RealAnalyzer)
    analyzer.acoustic=SimpleNamespace(extract=Mock(return_value=(AcousticSignals(wpm=90,duration_sec=3,speech_duration_sec=2),None)))
    analyzer.language=LanguageExtractor()
    analyzer.content=SimpleNamespace(validate_answer=Mock(return_value=None))
    with pytest.raises(LLMError) as failure:
        analyzer.analyze_attempt(AttemptMedia(attempt_id="fixture",audio_path="fixture.wav"),Transcript(text="Plants need water",language="en"),AnalysisConfig(skip_vision=True))
    assert failure.value.code=="invalid_response"
    assert failure.value.role=="answers"


def test_guest_sessions_do_not_share_an_identity(client,monkeypatch):
    monkeypatch.setenv("DEMO_AUTH","1")
    first=client.post("/auth/demo").json()
    second=client.post("/auth/demo").json()
    assert first["learner_id"]!=second["learner_id"]
    assert first["email"]!=second["email"]


def test_oauth_state_is_signed_expiring_and_browser_bound(client,monkeypatch):
    from app import auth
    import jwt
    from urllib.parse import urlparse,parse_qs
    monkeypatch.setenv("GOOGLE_CLIENT_ID","test-client")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET","test-secret")
    response=client.get("/auth/google?next=//untrusted.invalid",follow_redirects=False)
    assert response.status_code==307
    state=parse_qs(urlparse(response.headers["location"]).query)["state"][0]
    payload=jwt.decode(state,os.environ["JWT_SECRET"],algorithms=["HS256"])
    assert payload["next"]=="/dashboard"
    assert payload["purpose"]=="google_oauth_state"
    assert "exp" in payload
    client.cookies.delete(auth.OAUTH_STATE_COOKIE)
    with patch("app.auth.httpx.post") as provider:
        callback=client.get("/auth/google/callback",params={"code":"test-code","state":state},follow_redirects=False)
        assert "/login?error=google" in callback.headers["location"]
        provider.assert_not_called()


def test_topic_migration_preserves_existing_rows(tmp_path,monkeypatch):
    import sqlalchemy as sa
    from alembic import command
    from alembic.config import Config
    from app import config as app_config
    from app.db import Base
    database=tmp_path/"migration.db"
    url="sqlite:///"+str(database)
    engine=sa.create_engine(url)
    metadata=sa.MetaData()
    for table in Base.metadata.sorted_tables: table.to_metadata(metadata)
    metadata.tables["sessions"].c.topic.type=sa.String(128)
    metadata.create_all(engine)
    with engine.begin() as connection:
        connection.execute(metadata.tables["learners"].insert().values(id="migration-learner",email="migration@example.com",display_name="Migration learner"))
        connection.execute(metadata.tables["sessions"].insert().values(id="migration-session",learner_id="migration-learner",topic="Preserve this topic"))
    monkeypatch.setattr(app_config,"DATABASE_URL",url)
    configuration=Config(str(Path(__file__).resolve().parents[1]/"alembic.ini"))
    configuration.set_main_option("script_location",str(Path(__file__).resolve().parents[1]/"alembic"))
    command.upgrade(configuration,"head")
    with engine.connect() as connection:
        assert connection.execute(sa.text("select topic from sessions where id='migration-session'")).scalar()=="Preserve this topic"
    topic=next(c for c in sa.inspect(engine).get_columns("sessions") if c["name"]=="topic")
    assert topic["type"].length==2000
    engine.dispose()


def test_analysis_retry_reuses_transcript_and_updates_current_profile(client, headers):
    from app.models import Attempt, TranscriptRow, LearnerDimensionScore
    from app.orchestration.orchestrator import analyze_attempt_job
    from app.agents.llm_client import LLMError
    from app.ml.types import SignalBundle, AcousticSignals, LanguageSignals, FusedDimensions, QualityFlags
    # All media/model values here are isolated test fixtures, never production samples.
    session=client.post("/v1/sessions",headers=headers,json={"topic":"Plant care"}).json()
    with SessionLocal() as db:
        attempt=Attempt(session_id=session["id"],role="baseline",audio_path="test-fixture.wav",prompt="Explain plant care")
        db.add(attempt);db.commit();aid=attempt.id
    transcript=Transcript(text="Plants need water",language="en",segments=[TranscriptSegment(start_sec=0,end_sec=2,text="Plants need water",words=[TranscriptWord(word="Plants",start_sec=0,end_sec=.5)])])
    bundle=SignalBundle(attempt_id=aid,transcript=transcript,acoustic=AcousticSignals(wpm=90,duration_sec=3,speech_duration_sec=2),language=LanguageSignals(),fused=FusedDimensions(fluency=.6),quality=QualityFlags(audio_ok=True),provenance={"source":"recorded_media"})
    with patch("app.orchestration.orchestrator.get_transcriber") as transcriber, patch("app.orchestration.orchestrator.get_analyzer") as analyzer:
        transcriber.return_value.transcribe.return_value=transcript
        analyzer.return_value.analyze_attempt.side_effect=[LLMError("rate_limited","answers",1),bundle]
        analyze_attempt_job(session["id"],aid)
        with SessionLocal() as db:
            assert db.get(Attempt,aid).analysis_status=="failed"
            assert db.query(TranscriptRow).filter_by(attempt_id=aid).count()==1
        analyze_attempt_job(session["id"],aid)
        assert transcriber.return_value.transcribe.call_count==1
        assert analyzer.return_value.analyze_attempt.call_args.args[1].words[0].word=="Plants"
    with SessionLocal() as db:
        assert db.get(Attempt,aid).analysis_status=="complete"
        assert db.query(TranscriptRow).filter_by(attempt_id=aid).count()==1
        dimension=db.query(LearnerDimensionScore).filter_by(learner_id=session["learner_id"],dimension="fluency").one()
        assert dimension.score==60


def test_opponent_voice_endpoint_requires_auth_and_returns_audio(client,headers):
    with patch('app.api.rest.debate.synthesize',return_value=b'RIFF-test-audio') as voice:
        assert client.post('/v1/debate/speech',json={'text':'My argument'}).status_code==401
        response=client.post('/v1/debate/speech',headers=headers,json={'text':'मेरा तर्क','language':'Hindi'})
        assert response.status_code==200
        assert response.headers['content-type']=='audio/wav'
        assert response.headers['cache-control']=='private, no-store'
        voice.assert_called_once_with('मेरा तर्क','Hindi')
        assert client.post('/v1/debate/speech',headers=headers,json={'text':' '*5}).status_code==422
        assert client.post('/v1/debate/speech',headers=headers,json={'text':'x'*2001}).status_code==422


def test_queued_transcript_is_available_before_scoring(client,headers):
    from app.models import Attempt, TranscriptRow
    from app.ml.speech_quality import SPEECH_PIPELINE_VERSION
    session=client.post('/v1/sessions',headers=headers,json={'topic':'Transport'}).json()
    with SessionLocal() as db:
        attempt=Attempt(session_id=session['id'],role='opening',prompt='Discuss transport',analysis_status='queued',pressure_spec_json=json.dumps({'transcription':{'pipeline_version':SPEECH_PIPELINE_VERSION}}))
        attempt.transcript=TranscriptRow(text='Transport helps students.',language='en',segments_json='[]')
        db.add(attempt);db.commit();aid=attempt.id
    response=client.get(f"/v1/sessions/{session['id']}/attempts/{aid}",headers=headers)
    assert response.status_code==200
    assert response.json()['transcript_validated'] is True
    assert response.json()['analysis_status']=='queued'
    assert response.json()['metrics'] is None
    with SessionLocal() as db:
        db.get(Attempt,aid).pressure_spec_json='{}';db.commit()
    assert client.get(f"/v1/sessions/{session['id']}/attempts/{aid}",headers=headers).json()['transcript_validated'] is False


@pytest.mark.parametrize('speech,detected,setting,expected,reply', [
    ('मुफ्त बसों से छात्रों को मदद मिलेगी।','hi','English','Hindi','लेकिन सार्वजनिक परिवहन के रखरखाव का खर्च कौन उठाएगा?'),
    ('Transport needs public funding.','en','Hindi','English','However, funding must also cover reliable maintenance.'),
    ('സൗജന്യ യാത്ര വിദ്യാർത്ഥികളെ സഹായിക്കും.','ml','English','Malayalam','പക്ഷേ സേവനത്തിന്റെ ചെലവ് സർക്കാർ എങ്ങനെ വഹിക്കും?'),
    ('बसों की funding भी जरूरी है।','hi','English','Mixed','लेकिन funding के लिए टिकाऊ योजना भी जरूरी है।'),
    ('muft bus se chhatron ko madad milegi','hi','English','Hindi','लेकिन इस योजना के लिए टिकाऊ बजट भी जरूरी है।'),
])
def test_opponent_follows_latest_spoken_language(client,headers,speech,detected,setting,expected,reply):
    with patch('app.api.rest.debate.chat_json',return_value={'counter_argument':reply}) as provider:
        response=client.post('/v1/debate/counter',headers=headers,json={'topic':'Public transport','language':setting,'spoken_language':detected,'user_transcript':speech,'turn':2})
    assert response.status_code==200,response.text
    assert response.json()['language']==expected
    assert json.loads(provider.call_args.args[1])['response_language']==expected


def test_opponent_retries_wrong_language_then_rejects_it(client,headers):
    payload={'topic':'Transport','language':'English','user_transcript':'छात्रों के लिए बस मुफ्त होनी चाहिए।'}
    with patch('app.api.rest.debate.chat_json',side_effect=[{'counter_argument':'This is an English reply.'},{'counter_argument':'लेकिन इस सेवा की लागत कौन वहन करेगा?'}]) as provider:
        response=client.post('/v1/debate/counter',headers=headers,json=payload)
        assert response.status_code==200
        assert response.json()['language']=='Hindi'
        assert provider.call_count==2
    with patch('app.api.rest.debate.chat_json',return_value={'counter_argument':'An incorrect English reply.'}):
        assert client.post('/v1/debate/counter',headers=headers,json=payload).status_code==503


def test_language_prompt_translation_is_private_cached_and_preserves_rubric(client,headers):
    generated=dict(prompt_text='पौधों के लिए पानी क्यों जरूरी है?',key_points=['growth'],reference_answer='Water supports growth and nutrient transport.',expected_duration_sec=60)
    with patch('app.agents.interviewer.chat_json',return_value=generated):
        session=client.post('/v1/sessions',headers=headers,json={'mode':'language-diagnostic','topic':'Plants','language':'Hindi'}).json()
    url=f"/v1/sessions/{session['id']}/english-prompt"
    assert client.post(url).status_code==401
    with patch('app.api.rest.sessions.chat_json',return_value={'prompt':'Why do plants need water?'}) as provider:
        translated=client.post(url,headers=headers)
        assert translated.status_code==200,translated.text
        assert translated.json()['prompt']=='Why do plants need water?'
        assert client.post(url,headers=headers).json()==translated.json()
        assert provider.call_count==1
        assert json.loads(provider.call_args.args[1])['question']==generated['prompt_text']
    from app.models import Session as SessionModel
    with SessionLocal() as db:
        action=json.loads(db.get(SessionModel,session['id']).current_action_json)
        assert action['answer_rubric']['key_points']==['growth']
        assert action['question_spec']['prompt_text']==generated['prompt_text']
    other=client.post('/auth/demo').json()['token']
    assert client.post(url,headers={'Authorization':'Bearer '+other}).status_code==404


def test_answer_review_uses_recorded_language_and_retries_wrong_language():
    from app.ml.content import ContentEvaluator
    reviewed=dict(structure=.5,correctness=.5,relevance=.5,coverage=.5,specificity=.5,feedback='An incorrect English feedback response.')
    hindi={**reviewed,'feedback':'अपने उत्तर में एक स्पष्ट उदाहरण और निष्कर्ष जोड़ें।'}
    with patch('app.ml.content.chat_json',side_effect=[reviewed,hindi]) as provider:
        result=ContentEvaluator().validate_answer('पानी से पौधों को पोषण मिलता है।','Why do plants need water?',['growth'],'Water supports growth.','hi')
        assert result.feedback==hindi['feedback']
        assert provider.call_count==2
        assert json.loads(provider.call_args.args[1])['feedback_language']=='Hindi'
    with patch('app.ml.content.chat_json',return_value=reviewed):
        assert ContentEvaluator().validate_answer('पौधों को पानी चाहिए।','Question',['growth'],'Reference','hi') is None


def test_impromptu_timeline_uses_full_recording_and_actual_language():
    from types import SimpleNamespace
    from app.services.practice_report import report
    from app.ml.types import SignalBundle, AcousticSignals, LanguageSignals, FusedDimensions, QualityFlags
    transcript=Transcript(text='नमस्ते दुनिया',language='hi',words=[TranscriptWord(word='नमस्ते',start_sec=0,end_sec=1),TranscriptWord(word='दुनिया',start_sec=2,end_sec=3)])
    bundle=SignalBundle(attempt_id='isolated-fixture',transcript=transcript,acoustic=AcousticSignals(wpm=4.8,duration_sec=25,speech_duration_sec=3),language=LanguageSignals(primary='hi'),fused=FusedDimensions(fluency=.5,structure=.5),quality=QualityFlags(audio_ok=True),provenance={'source':'recorded_media'})
    attempt=SimpleNamespace(id='isolated-fixture',prompt='एक परिचय दें।',analysis_status='complete',metrics=SimpleNamespace(signal_bundle_json=bundle.model_dump_json()))
    coaching=dict(diagnosis=dict(headline='उत्तर में विस्तार करें',explanation='अपने परिचय में एक उदाहरण और स्पष्ट निष्कर्ष जोड़ें।'),challenge=dict(objective='एक स्पष्ट परिचय दें',framework=['परिचय','उदाहरण'],prompt='एक स्पष्ट परिचय दें।',timeLimitSeconds=30,weaknessTargeted='स्पष्टता'))
    with patch('app.services.practice_report.chat_json',return_value=coaching) as provider:
        result=report(SimpleNamespace(topic='Introduction',mode='impromptu',language='English'),[attempt])
        assert json.loads(provider.call_args.args[1])['feedback_language']=='Hindi'
    analysis=result['analysis']
    assert analysis['language']=='Hindi'
    assert analysis['transcript']=='नमस्ते दुनिया'
    assert analysis['durationSeconds']==25
    assert [p['second'] for p in analysis['fluencyTimeline']]==[0,10,20]
    assert [p['wpm'] for p in analysis['fluencyTimeline']]==[12,0,0]
    assert analysis['fillerCount'] is None



def test_sarvam_is_only_exposed_for_debate_agent(client):
    assert client.post('/v1/speech',json={'text':'Practice question'}).status_code==404


def test_practice_coaching_preserves_multiple_provider_weakness_labels():
    from types import SimpleNamespace
    from app.services.practice_report import report
    from app.ml.types import SignalBundle, AcousticSignals, LanguageSignals, FusedDimensions, QualityFlags
    bundle=SignalBundle(attempt_id='coaching-fixture',transcript=Transcript(text='Plants need water.',language='en'),acoustic=AcousticSignals(wpm=18,duration_sec=10,speech_duration_sec=3),language=LanguageSignals(primary='en'),fused=FusedDimensions(fluency=.5),quality=QualityFlags(audio_ok=True),provenance={'source':'recorded_media'})
    attempt=SimpleNamespace(id='coaching-fixture',prompt='Explain why plants need water.',analysis_status='complete',metrics=SimpleNamespace(signal_bundle_json=bundle.model_dump_json()))
    coaching=dict(diagnosis=dict(headline='Explain your reasoning',explanation='Add a reason and an example to develop your explanation.'),challenge=dict(objective='Explain a reason clearly',framework=['Claim','Reason'],prompt='Explain why plants need water.',timeLimitSeconds=30,weaknessTargeted=['content depth','logical structure']))
    with patch('app.services.practice_report.chat_json',return_value=coaching):
        result=report(SimpleNamespace(topic='Plants',mode='impromptu',language='English'),[attempt])
    assert result['challenge']['weaknessTargeted']=='content depth, logical structure'
