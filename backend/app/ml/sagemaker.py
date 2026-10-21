"""SageMaker async/S3 transport. This module never imports a model runtime."""
from __future__ import annotations
import json
import logging
import os
import re
import time
import uuid
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from urllib.parse import urlsplit

logger = logging.getLogger(__name__)


class SageMakerError(RuntimeError):
    def __init__(self, message, status=503, code="sagemaker_unavailable"):
        super().__init__(message)
        self.status, self.code = status, code


def enabled():
    mode = os.getenv("ML_EXECUTION_MODE", "local").strip().lower()
    if mode not in ("local", "sagemaker"):
        raise ValueError("ML_EXECUTION_MODE must be local or sagemaker")
    return mode == "sagemaker"


@dataclass(frozen=True)
class Settings:
    region: str
    endpoint: str
    bucket: str
    prefix: str
    output_prefix: str
    invocation_timeout: int
    queue_timeout: int


def settings():
    region = os.getenv("AWS_REGION", "") or os.getenv("AWS_DEFAULT_REGION", "")
    endpoint = os.getenv("SAGEMAKER_ENDPOINT_NAME", "").strip()
    bucket = os.getenv("SAGEMAKER_BUCKET", "").strip()
    prefix = os.getenv("SAGEMAKER_JOB_PREFIX", "pitchground/jobs").strip("/")
    output = os.getenv("SAGEMAKER_OUTPUT_PREFIX", "pitchground/results").strip("/")
    if not region or not re.fullmatch(r"[A-Za-z0-9-]{1,63}", endpoint) or not re.fullmatch(r"[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]", bucket):
        raise ValueError("Set AWS_REGION, SAGEMAKER_ENDPOINT_NAME and SAGEMAKER_BUCKET")
    for value in (prefix, output):
        if not value or any(part in ("", ".", "..") for part in value.split("/")):
            raise ValueError("SageMaker S3 prefixes must be non-empty relative paths")
    timeout = int(os.getenv("SAGEMAKER_INVOCATION_TIMEOUT_SECONDS", "900"))
    queue = int(os.getenv("SAGEMAKER_QUEUE_TIMEOUT_SECONDS", "900"))
    if not 1 <= timeout <= 3600 or not 60 <= queue <= 21600:
        raise ValueError("Invalid SageMaker invocation or queue timeout")
    return Settings(region, endpoint, bucket, prefix, output, timeout, queue)


@lru_cache(maxsize=4)
def clients(cfg):
    import boto3
    from botocore.config import Config
    # Credentials come from the standard AWS credential chain; never accept them from a browser.
    session = boto3.Session(region_name=cfg.region)
    options = Config(connect_timeout=10, read_timeout=30, retries={"max_attempts": 2, "mode": "standard"})
    return session.client("s3", config=options), session.client("sagemaker-runtime", config=options)


def _owner(owner):
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,80}", owner):
        raise ValueError("Invalid learner identifier")
    return owner


def _job_prefix(cfg, owner, job_id):
    if not re.fullmatch(r"[0-9a-f]{32}", job_id):
        raise SageMakerError("Analysis job not found", 404, "job_not_found")
    return f"{cfg.prefix}/{_owner(owner)}/{job_id}"


def _put_json(s3, bucket, key, value):
    s3.put_object(Bucket=bucket, Key=key, Body=json.dumps(value).encode(), ContentType="application/json", ServerSideEncryption="AES256")


def _read_json(s3, bucket, key):
    # Prefix-scoped ListBucket avoids S3's ambiguous 403 for a missing object.
    listed = s3.list_objects_v2(Bucket=bucket, Prefix=key, MaxKeys=1)
    if not any(item["Key"] == key for item in listed.get("Contents", [])):
        return None
    try:
        response = s3.get_object(Bucket=bucket, Key=key)
    except Exception as exc:
        if getattr(exc, "response", {}).get("Error", {}).get("Code") in ("NoSuchKey", "404", "NotFound"):
            return None
        raise
    body = response["Body"]
    try:
        raw = body.read(8 * 1024 * 1024 + 1)
        if len(raw) > 8 * 1024 * 1024:
            raise ValueError("Analysis response exceeded the JSON size limit")
        return json.loads(raw)
    finally:
        body.close()


def _output_key(cfg, uri):
    parsed = urlsplit(uri)
    key = parsed.path.lstrip("/")
    if parsed.scheme != "s3" or parsed.netloc != cfg.bucket or not key.startswith(cfg.output_prefix + "/"):
        raise ValueError("SageMaker output must use the configured bucket and output prefix")
    return key


def submit(owner: str, operation: str, audio_path: str, *, video_path: str | None = None, payload: dict | None = None):
    cfg = settings()
    if operation not in ("speech", "attempt"):
        raise ValueError("Unsupported ML job operation")
    if not audio_path:
        raise SageMakerError("Media missing audio", 415, "invalid_recording")
    job_id = uuid.uuid4().hex
    prefix = _job_prefix(cfg, owner, job_id)
    try:
        from boto3.s3.transfer import TransferConfig
        s3, runtime = clients(cfg)
        manifest = {"version": 1, "operation": operation, "job_id": job_id, "owner": owner,
                    "bucket": cfg.bucket, "payload": payload or {}}
        for kind, source in (("audio", audio_path), ("video", video_path)):
            if source:
                key = f"{prefix}/{kind}{Path(source).suffix or '.webm'}"
                s3.upload_file(str(source), cfg.bucket, key, ExtraArgs={"ServerSideEncryption": "AES256"},
                    Config=TransferConfig(use_threads=False, max_concurrency=1, multipart_chunksize=8*1024*1024))
                manifest[kind] = key
        _put_json(s3, cfg.bucket, f"{prefix}/request.json", manifest)
        accepted = runtime.invoke_endpoint_async(EndpointName=cfg.endpoint, ContentType="application/json", Accept="application/json",
            InputLocation=f"s3://{cfg.bucket}/{prefix}/request.json", InferenceId=job_id,
            InvocationTimeoutSeconds=cfg.invocation_timeout, RequestTTLSeconds=cfg.queue_timeout)
        output_key = _output_key(cfg, accepted["OutputLocation"])
        failure_key = _output_key(cfg, accepted["FailureLocation"]) if accepted.get("FailureLocation") else None
        ticket = {"job_id": job_id, "owner": owner, "operation": operation, "output_key": output_key,
                  "failure_key": failure_key, "expires_at": time.time()+cfg.invocation_timeout+cfg.queue_timeout+60}
        _put_json(s3, cfg.bucket, f"{prefix}/ticket.json", ticket)
        return {"job_id": job_id, "status": "queued"}
    except SageMakerError:
        raise
    except Exception as exc:
        logger.exception("SageMaker submission failed")
        raise SageMakerError("Could not submit ML analysis. Check AWS credentials, endpoint and S3 permissions.") from exc


def poll(owner: str, job_id: str):
    cfg = settings()
    prefix = _job_prefix(cfg, owner, job_id)
    try:
        s3, _ = clients(cfg)
        ticket = _read_json(s3, cfg.bucket, f"{prefix}/ticket.json")
        if not ticket or ticket.get("owner") != owner:
            raise SageMakerError("Analysis job not found", 404, "job_not_found")
        key = ticket["output_key"]
        if not key.startswith(cfg.output_prefix + "/"):
            raise ValueError("Invalid output key")
        result = _read_json(s3, cfg.bucket, key)
        if result is not None:
            if result.get("version") != 1 or result.get("job_id") != job_id:
                raise ValueError("Invalid worker protocol response")
            if result.get("error"):
                return {"job_id": job_id, "status": "failed", "error": result["error"]}
            return {"job_id": job_id, "status": "complete", "result": result["result"]}
        failure = ticket.get("failure_key")
        if failure and failure.startswith(cfg.output_prefix + "/") and _read_json(s3, cfg.bucket, failure) is not None:
            return {"job_id": job_id, "status": "failed", "error": {"message": "SageMaker inference failed. Check the endpoint's CloudWatch logs.", "code": "sagemaker_failed"}}
        if time.time() > ticket["expires_at"]:
            return {"job_id": job_id, "status": "failed", "error": {"message": "SageMaker analysis timed out. Retry this recording.", "code": "sagemaker_timeout"}}
        return {"job_id": job_id, "status": "queued"}
    except SageMakerError:
        raise
    except Exception as exc:
        logger.exception("SageMaker result retrieval failed")
        raise SageMakerError("Could not retrieve ML analysis. Check the configured S3 output permissions.") from exc
