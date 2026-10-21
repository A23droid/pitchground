"""SageMaker container contract: /ping and /invocations on port 8080."""
from __future__ import annotations
import json
import logging
import os
import re
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path
from threading import BoundedSemaphore

from fastapi import FastAPI, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from app.config import BASE_DIR

logger = logging.getLogger(__name__)
_slot = BoundedSemaphore(1)


def load_provider_secret():
    arn = os.getenv("PITCHGROUND_LLM_SECRET_ARN", "").strip()
    if not arn:
        return
    import boto3
    secret = json.loads(boto3.client("secretsmanager").get_secret_value(SecretId=arn)["SecretString"])
    allowed = {"GROQ_API_KEY", "GROQ_BASE_URL", "GROQ_MODEL", "GROQ_ANSWERS_API_KEY", "GROQ_ANSWERS_MODEL",
               "OPENAI_API_KEY", "OPENAI_BASE_URL", "OPENAI_MODEL"}
    for key, value in secret.items():
        if key in allowed and isinstance(value, str):
            os.environ[key] = value
    # Legacy OPENAI settings are imported by llm_client; update that module before model imports.
    import app.agents.llm_client as llm
    for key in ("OPENAI_API_KEY", "OPENAI_BASE_URL", "OPENAI_MODEL"):
        if key in secret:
            setattr(llm, key, secret[key])


@asynccontextmanager
async def lifespan(app):
    load_provider_secret()
    if os.getenv("SAGEMAKER_REQUIRE_ASSETS", "1") == "1":
        assets = [BASE_DIR / "models" / f"{name}_landmarker.task" for name in ("face", "pose", "hand")]
        assets.append(Path(os.getenv("FILLER_MODEL_DIR", str(BASE_DIR / "models" / "filled_pause"))) / "model.safetensors")
        if not all(path.is_file() for path in assets) or not any((BASE_DIR / "models" / "whisper").rglob("model.bin")):
            raise RuntimeError("Full-model assets are missing from the SageMaker image")
    yield


app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)


@app.get("/ping")
def ping():
    return {"ok": True, "service": "pitchground-sagemaker", "protocol_version": 1}


def _download(s3, request, kind, directory):
    from boto3.s3.transfer import TransferConfig
    bucket = os.environ.get("SAGEMAKER_BUCKET", "")
    prefix = os.getenv("SAGEMAKER_JOB_PREFIX", "pitchground/jobs").strip("/")
    owner, job_id = request["owner"], request["job_id"]
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,80}", owner) or not re.fullmatch(r"[0-9a-f]{32}", job_id):
        raise ValueError("Invalid ML request identity")
    key = request.get(kind)
    if key is None and kind == "video":
        return None
    allowed = f"{prefix}/{owner}/{job_id}/{kind}"
    if request["bucket"] != bucket or not isinstance(key, str) or not key.startswith(allowed + ".") or "/" in key[len(allowed):]:
        raise ValueError("ML media must belong to this job in the configured bucket")
    maximum = int(os.getenv(f"MAX_{kind.upper()}_UPLOAD_MB", "16" if kind == "audio" else "64")) * 1024**2
    size = s3.head_object(Bucket=bucket, Key=key)["ContentLength"]
    if size <= 0 or size > maximum:
        raise ValueError(f"The {kind} recording exceeds the configured media limit")
    path = Path(directory) / f"{kind}{Path(key).suffix or '.webm'}"
    s3.download_file(bucket, key, str(path), Config=TransferConfig(use_threads=False, max_concurrency=1))
    if path.stat().st_size > maximum:
        raise ValueError("Media download exceeded its declared size")
    return str(path)


def validate_duration(path):
    import av
    maximum = float(os.getenv("MAX_RECORDING_SECONDS", "360"))
    if maximum <= 0:
        raise ValueError("Invalid MAX_RECORDING_SECONDS configuration")
    try:
        with av.open(path) as container:
            duration = 0.0
            for frame in container.decode(audio=0):
                duration += frame.samples / frame.sample_rate
                if duration > maximum:
                    raise ValueError(f"Recording exceeds the {maximum:g}-second analysis limit")
    except av.error.FFmpegError as exc:
        raise ValueError("Recording does not contain decodable audio") from exc


def execute(request: dict):
    envelope = {"version": 1, "job_id": request.get("job_id")}
    try:
        if request.get("version") != 1 or request.get("operation") not in ("speech", "attempt"):
            raise ValueError("Unsupported ML request protocol")
        import boto3
        s3 = boto3.client("s3")
        with tempfile.TemporaryDirectory(prefix="pitchground-inference-") as directory:
            audio = _download(s3, request, "audio", directory)
            validate_duration(audio)
            payload = request.get("payload", {})
            if request["operation"] == "speech":
                from app.ml.speech_service import speech_response
                result = speech_response(audio, payload.get("language_hint", "auto"))
            else:
                from app.ml.local_transcriber import LocalWhisperTranscriber
                from app.ml.real_analyzer import RealAnalyzer
                from app.ml.types import AnalysisConfig, AttemptMedia
                config = AnalysisConfig.model_validate(payload["config"])
                video = _download(s3, request, "video", directory)
                transcript = LocalWhisperTranscriber().transcribe(audio, payload.get("language_hint", "auto"))
                analyzer = RealAnalyzer()
                result = analyzer.analyze_attempt(AttemptMedia(attempt_id=payload["attempt_id"], audio_path=audio, video_path=video), transcript, config)
                if not result.quality.audio_ok:
                    raise ValueError("No usable speech was detected. Check the microphone and record again.")
                if payload.get("recovery"):
                    from app.ml.recovery import measure_recovery
                    result.recovery = measure_recovery(audio, transcript, config, payload.get("interruption_sec"), analyzer)
                result = result.model_dump()
        return {**envelope, "result": result}
    except Exception as exc:
        from app.agents.llm_client import LLMError
        logger.exception("SageMaker ML job failed")
        error = {"message": "The ML pipeline failed. Check SageMaker CloudWatch logs and model assets.", "code": "ml_failed"}
        if isinstance(exc, (ValueError, LLMError)):
            error = {"message": str(exc), "code": exc.code if isinstance(exc, LLMError) else "invalid_recording"}
            if isinstance(exc, LLMError):
                error["retry_after"] = exc.retry_after
        return {**envelope, "error": error}


@app.post("/invocations")
async def invoke(request: Request):
    # SageMaker IAM authenticates access; this port must never be publicly exposed.
    if not _slot.acquire(blocking=False):
        raise HTTPException(status_code=503, detail="One inference is already running")
    try:
        data = bytearray()
        async for chunk in request.stream():
            data.extend(chunk)
            if len(data) > 2 * 1024**2:
                raise HTTPException(status_code=413, detail="ML request manifest is too large")
        try:
            parsed = json.loads(data)
            if not isinstance(parsed, dict):
                raise ValueError()
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Invalid ML request manifest") from exc
        return await run_in_threadpool(execute, parsed)
    finally:
        _slot.release()
