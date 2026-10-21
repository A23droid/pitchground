"""AWS transport and orchestration contracts; all provider/model outputs are explicit test doubles."""
import io
import json
import os
import subprocess
import sys
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from app.ml import sagemaker as sm


class FakeS3:
    def __init__(self):
        self.objects = {}

    def put_object(self, Bucket, Key, Body, **kwargs):
        self.objects[Key] = Body

    def upload_file(self, source, bucket, key, **kwargs):
        assert kwargs["Config"].use_threads is False
        self.objects[key] = Path(source).read_bytes()

    def list_objects_v2(self, Bucket, Prefix, MaxKeys):
        return {"Contents": [{"Key": k} for k in sorted(self.objects) if k.startswith(Prefix)][:MaxKeys]}

    def get_object(self, Bucket, Key):
        return {"Body": io.BytesIO(self.objects[Key])}

    def head_object(self, Bucket, Key):
        return {"ContentLength": len(self.objects[Key])}

    def download_file(self, bucket, key, path, **kwargs):
        Path(path).write_bytes(self.objects[key])


@pytest.fixture
def aws(monkeypatch, tmp_path):
    for key, value in {"ML_EXECUTION_MODE": "sagemaker", "AWS_REGION": "us-east-1",
        "SAGEMAKER_ENDPOINT_NAME": "test-ml", "SAGEMAKER_BUCKET": "test-pitchground",
        "SAGEMAKER_JOB_PREFIX": "pitchground/jobs", "SAGEMAKER_OUTPUT_PREFIX": "pitchground/results"}.items():
        monkeypatch.setenv(key, value)
    s3 = FakeS3()
    def invoke(**kwargs):
        manifest = json.loads(s3.objects[kwargs["InputLocation"].split("test-pitchground/")[1]])
        assert manifest["job_id"] == kwargs["InferenceId"]
        assert kwargs["InvocationTimeoutSeconds"] == 900
        return {"OutputLocation": f"s3://test-pitchground/pitchground/results/output/{manifest['job_id']}.out",
                "FailureLocation": f"s3://test-pitchground/pitchground/results/failure/{manifest['job_id']}.error"}
    runtime = SimpleNamespace(invoke_endpoint_async=Mock(side_effect=invoke))
    monkeypatch.setattr(sm, "clients", lambda cfg: (s3, runtime))
    audio = tmp_path / "audio.webm"
    audio.write_bytes(b"explicit-test-recording" * 30)
    return s3, runtime, audio


def test_submission_polling_language_and_ownership(aws):
    s3, runtime, audio = aws
    job = sm.submit("learner-1", "speech", str(audio), payload={"language_hint": "hi"})
    manifest = next(json.loads(v) for k, v in s3.objects.items() if k.endswith("request.json"))
    assert manifest["payload"]["language_hint"] == "hi"
    assert sm.poll("learner-1", job["job_id"])["status"] == "queued"
    with pytest.raises(sm.SageMakerError) as missing:
        sm.poll("other-learner", job["job_id"])
    assert missing.value.status == 404
    output = {"text": "नमस्ते", "language": "hi", "metrics": {"filler_count": 2}}
    s3.objects[f"pitchground/results/output/{job['job_id']}.out"] = json.dumps({"version": 1, "job_id": job["job_id"], "result": output}).encode()
    assert sm.poll("learner-1", job["job_id"])["result"] == output
    assert runtime.invoke_endpoint_async.call_count == 1


@pytest.mark.parametrize("failure", ["worker", "aws", "timeout", "wrong_job"])
def test_job_failures_are_not_fake_metrics(aws, monkeypatch, failure):
    s3, _, audio = aws
    job = sm.submit("learner", "speech", str(audio))
    if failure == "worker":
        s3.objects[f"pitchground/results/output/{job['job_id']}.out"] = json.dumps({"version": 1, "job_id": job["job_id"], "error": {"message": "Retry speech", "code": "invalid_recording"}}).encode()
    elif failure == "aws":
        s3.objects[f"pitchground/results/failure/{job['job_id']}.error"] = b'{}'
    elif failure == "timeout":
        monkeypatch.setattr(sm.time, "time", lambda: 1e12)
    else:
        s3.objects[f"pitchground/results/output/{job['job_id']}.out"] = b'{"version":1,"job_id":"another-job","result":{}}'
        with pytest.raises(sm.SageMakerError):
            sm.poll("learner", job["job_id"])
        return
    result = sm.poll("learner", job["job_id"])
    assert result["status"] == "failed"
    assert "result" not in result


def test_rejects_foreign_output_bucket_and_sanitizes_aws_error(aws):
    _, runtime, audio = aws
    runtime.invoke_endpoint_async.side_effect = None
    runtime.invoke_endpoint_async.return_value = {"OutputLocation": "s3://foreign/results/output"}
    with pytest.raises(sm.SageMakerError):
        sm.submit("learner", "speech", str(audio))
    runtime.invoke_endpoint_async.side_effect = RuntimeError("secret-credential-details")
    with pytest.raises(sm.SageMakerError) as error:
        sm.submit("learner", "speech", str(audio))
    assert "secret-credential-details" not in str(error.value)


@pytest.fixture
def practice_db(tmp_path):
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session
    from app.db import Base
    from app.models import Learner, Session as Practice, Attempt
    engine = create_engine("sqlite:///" + str(tmp_path / "isolated.db"), connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        learner = Learner(email="aws-test@example.com", display_name="AWS test")
        db.add(learner)
        db.flush()
        practice = Practice(learner_id=learner.id, topic="Plants", mode="interview", language="Hindi", phase="baseline_recording")
        db.add(practice)
        db.flush()
        attempt = Attempt(session_id=practice.id, role="baseline", prompt="पौधों को पानी क्यों चाहिए?",
            pressure_spec_json=json.dumps({"answer_rubric": {"key_points": ["growth"], "reference_answer": "Water supports growth."}}))
        db.add(attempt)
        db.commit()
        yield db, learner, practice, attempt
    engine.dispose()


def fixture_bundle(attempt):
    from app.ml.types import SignalBundle, Transcript, TranscriptWord, AcousticSignals, LanguageSignals, FusedDimensions, QualityFlags
    return SignalBundle(attempt_id=attempt.id,
        transcript=Transcript(text="पानी पोषण देता है", language="hi", words=[TranscriptWord(word="पानी", start_sec=0, end_sec=1)], provenance={"model": "test-double"}),
        acoustic=AcousticSignals(wpm=24, duration_sec=10, speech_duration_sec=5, filler_count=2),
        language=LanguageSignals(primary="hi"), fused=FusedDimensions(fluency=.5),
        quality=QualityFlags(audio_ok=True), provenance={"source": "recorded_media"})


@pytest.mark.parametrize("mode", ["interview", "debate", "impromptu", "language-diagnostic", "recovery-training"])
def test_all_modes_send_full_analysis_contract(aws, practice_db, mode):
    from app.orchestration.sagemaker_jobs import submit_attempt
    s3, _, audio = aws
    db, learner, practice, attempt = practice_db
    practice.mode = mode
    attempt.audio_path = str(audio)
    db.commit()
    submit_attempt(db, practice, attempt)
    manifest = next(json.loads(v) for k, v in s3.objects.items() if k.endswith("request.json"))
    payload = manifest["payload"]
    assert payload["config"]["question_key_points"] == ["growth"]
    assert payload["config"]["reference_answer"] == "Water supports growth."
    assert payload["language_hint"] == "hi"
    assert payload["recovery"] == (mode == "recovery-training")
    assert attempt.analysis_status == "queued"
    assert json.loads(attempt.pressure_spec_json)["sagemaker_job_id"] == manifest["job_id"]


def test_remote_result_advances_phase_and_persists_once(aws, practice_db):
    from app.orchestration.sagemaker_jobs import submit_attempt, refresh_attempt
    from app.models import ProfileSnapshot, TranscriptRow, AttemptMetrics
    s3, runtime, audio = aws
    db, learner, practice, attempt = practice_db
    attempt.audio_path = str(audio)
    db.commit()
    submit_attempt(db, practice, attempt)
    submit_attempt(db, practice, attempt)
    assert runtime.invoke_endpoint_async.call_count == 1
    job_id = json.loads(attempt.pressure_spec_json)["sagemaker_job_id"]
    bundle = fixture_bundle(attempt)
    s3.objects[f"pitchground/results/output/{job_id}.out"] = json.dumps({"version": 1, "job_id": job_id, "result": bundle.model_dump()}).encode()
    refresh_attempt(db, practice, attempt)
    refresh_attempt(db, practice, attempt)
    assert attempt.analysis_status == "complete"
    assert practice.phase == "baseline_analyzed"
    assert attempt.transcript.language == "hi"
    assert json.loads(attempt.metrics.signal_bundle_json)["acoustic"]["filler_count"] == 2
    assert db.query(ProfileSnapshot).count() == db.query(TranscriptRow).count() == db.query(AttemptMetrics).count() == 1


def test_failed_submission_leaves_attempt_retryable(aws, practice_db):
    from app.orchestration.sagemaker_jobs import submit_attempt
    _, runtime, audio = aws
    db, _, practice, attempt = practice_db
    attempt.audio_path = str(audio)
    db.commit()
    runtime.invoke_endpoint_async.side_effect = RuntimeError("test outage")
    with pytest.raises(sm.SageMakerError):
        submit_attempt(db, practice, attempt)
    assert attempt.analysis_status == "pending"
    assert "sagemaker_job_id" not in json.loads(attempt.pressure_spec_json)


def test_worker_preserves_output_and_removes_downloads(aws, monkeypatch):
    import boto3
    from app import sagemaker_worker as worker
    from app.ml import speech_service
    s3, _, audio = aws
    job = sm.submit("learner", "speech", str(audio), payload={"language_hint": "hi"})
    request = next(json.loads(v) for k, v in s3.objects.items() if k.endswith("request.json"))
    monkeypatch.setattr(boto3, "client", lambda service: s3)
    monkeypatch.setattr(worker, "validate_duration", lambda path: None)
    paths = []
    expected = {"text": "नमस्ते", "language": "hi", "metrics": {"filler_count": 2}}
    def speech(path, hint):
        assert Path(path).exists() and hint == "hi"
        paths.append(path)
        return expected
    monkeypatch.setattr(speech_service, "speech_response", speech)
    response = worker.execute(request)
    assert response == {"version": 1, "job_id": job["job_id"], "result": expected}
    assert not Path(paths[0]).exists()
    request["audio"] = "pitchground/jobs/another/recording.webm"
    assert worker.execute(request)["error"]["code"] == "invalid_recording"


def test_api_can_start_with_model_imports_blocked(tmp_path):
    code = '''
import importlib.abc, sys
class BlockModels(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, *args):
        if fullname.split(".")[0] in {"numpy", "torch", "transformers", "librosa", "cv2", "mediapipe", "faster_whisper", "av", "soundfile"}:
            raise RuntimeError("Heavy ML dependency imported on Render: " + fullname)
sys.meta_path.insert(0, BlockModels())
from app.main import app
from fastapi.testclient import TestClient
with TestClient(app) as client:
    assert client.get("/health").json()["ok"]
from app.ml.factory import get_analyzer
try:
    get_analyzer()
except RuntimeError as exc:
    assert "local model loading is disabled" in str(exc)
else:
    raise AssertionError("Local model was loaded")
print("API started without model runtimes")
'''
    env = {**os.environ, "ML_EXECUTION_MODE": "sagemaker", "AWS_REGION": "us-east-1",
        "SAGEMAKER_BUCKET": "test-pitchground", "SAGEMAKER_ENDPOINT_NAME": "test-ml",
        "DATABASE_URL": "sqlite:///" + str(tmp_path / "startup.db"), "JWT_SECRET": "isolated-sagemaker-test-secret-with-32-characters"}
    result = subprocess.run([sys.executable, "-c", code], env=env, cwd=Path(__file__).resolve().parents[1], capture_output=True, text=True, timeout=60)
    assert result.returncode == 0, result.stdout + result.stderr


def test_stt_api_queues_and_authenticates_job(aws, monkeypatch):
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from app.api.rest import stt
    from app.deps import get_current_learner
    api = FastAPI()
    api.include_router(stt.router)
    api.dependency_overrides[get_current_learner] = lambda: SimpleNamespace(id="learner")
    with TestClient(api) as client:
        response = client.post("/v1/stt/transcribe", files={"audio": ("recording.webm", b"test audio"*100)}, data={"language_hint": "hi"})
        assert response.status_code == 202
        job_id = response.json()["job_id"]
        assert client.get(f"/v1/stt/jobs/{job_id}").json()["status"] == "queued"
        monkeypatch.setenv("MAX_AUDIO_UPLOAD_MB", "0")
        assert client.post("/v1/stt/transcribe", files={"audio": ("audio.webm", b"a"*400)}).status_code == 413
    api.dependency_overrides.clear()
    assert TestClient(api).get(f"/v1/stt/jobs/{job_id}").status_code == 401


def test_attempt_http_roundtrip_and_learner_isolation(aws, practice_db, monkeypatch):
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from app.api.rest import attempts
    from app.db import get_db
    from app.deps import get_current_learner
    s3, _, audio = aws
    db, learner, practice, attempt = practice_db
    attempt.audio_path = str(audio)
    db.commit()
    api = FastAPI()
    api.include_router(attempts.router)
    api.dependency_overrides[get_db] = lambda: db
    api.dependency_overrides[get_current_learner] = lambda: learner
    def forbidden(*args, **kwargs):
        raise AssertionError("Render must never run local inference")
    monkeypatch.setattr(attempts, "analyze_attempt_job", forbidden)
    url = f"/v1/sessions/{practice.id}/attempts/{attempt.id}"
    with TestClient(api) as client:
        assert client.post(url + "/complete").status_code == 202
        assert client.get(url).json()["analysis_status"] == "queued"
        job_id = json.loads(attempt.pressure_spec_json)["sagemaker_job_id"]
        s3.objects[f"pitchground/results/output/{job_id}.out"] = json.dumps({"version": 1, "job_id": job_id, "result": fixture_bundle(attempt).model_dump()}).encode()
        result = client.get(url)
        assert result.status_code == 200, result.text
        assert result.json()["analysis_status"] == "complete"
        assert result.json()["transcript_validated"]
        api.dependency_overrides[get_current_learner] = lambda: SimpleNamespace(id="another-learner")
        assert client.get(url).status_code == 403


def test_deployment_and_invocation_match_aws_sdk_schema(aws):
    import importlib.util
    from botocore.session import get_session
    from botocore.validate import validate_parameters
    path = Path(__file__).resolve().parents[2] / "deploy" / "sagemaker" / "deploy_endpoint.py"
    spec = importlib.util.spec_from_file_location("deployment", path)
    deployment = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(deployment)
    plan = deployment.build_plan(SimpleNamespace(endpoint="test-ml", region="us-east-1", bucket="test-pitchground",
        image="123456789012.dkr.ecr.us-east-1.amazonaws.com/pitchground-ml:v1",
        role_arn="arn:aws:iam::123456789012:role/TestRole", secret_arn="arn:aws:secretsmanager:us-east-1:123456789012:secret:groq-test",
        instance_type="ml.m5.xlarge"))
    service = get_session().get_service_model("sagemaker")
    for key, operation in (("model", "CreateModel"), ("config", "CreateEndpointConfig"), ("endpoint", "CreateEndpoint")):
        validate_parameters(plan[key], service.operation_model(operation).input_shape)
    _, runtime, audio = aws
    sm.submit("learner", "speech", str(audio))
    service = get_session().get_service_model("sagemaker-runtime")
    validate_parameters(runtime.invoke_endpoint_async.call_args.kwargs, service.operation_model("InvokeEndpointAsync").input_shape)


def test_worker_attempt_keeps_vision_and_recovery_on_aws(aws, practice_db, monkeypatch):
    import boto3
    from app import sagemaker_worker as worker
    from app.ml import local_transcriber, real_analyzer, recovery
    from app.orchestration.sagemaker_jobs import submit_attempt
    s3, _, audio = aws
    db, _, practice, attempt = practice_db
    practice.mode = "recovery-training"
    attempt.audio_path = str(audio)
    video = audio.with_name("video.webm")
    video.write_bytes(b"explicit-video-test-double" * 30)
    attempt.video_path = str(video)
    db.commit()
    submit_attempt(db, practice, attempt)
    request = next(json.loads(v) for k, v in s3.objects.items() if k.endswith("request.json"))
    bundle = fixture_bundle(attempt)
    monkeypatch.setattr(boto3, "client", lambda service: s3)
    monkeypatch.setattr(worker, "validate_duration", lambda path: None)
    transcriber = Mock()
    transcriber.transcribe.return_value = bundle.transcript
    analyzer = Mock()
    analyzer.analyze_attempt.return_value = bundle
    monkeypatch.setattr(local_transcriber, "LocalWhisperTranscriber", lambda: transcriber)
    monkeypatch.setattr(real_analyzer, "RealAnalyzer", lambda: analyzer)
    measure = Mock(return_value={"source": "explicit-test-double"})
    monkeypatch.setattr(recovery, "measure_recovery", measure)
    output = worker.execute(request)
    assert "error" not in output, json.dumps({"output": output, "request": request}, ensure_ascii=False)
    media, transcript, config = analyzer.analyze_attempt.call_args.args
    assert not config.skip_vision and media.video_path
    assert config.practice_language == "hi" and transcript.language == "hi"
    assert output["result"]["recovery"] == {"source": "explicit-test-double"}
    assert measure.call_count == 1
    assert not Path(media.video_path).exists() and not Path(media.audio_path).exists()
