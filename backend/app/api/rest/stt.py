from __future__ import annotations

import shutil
import tempfile
from pathlib import Path
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from app.deps import get_current_learner
from app.models import Learner
from app.ml import sagemaker
from app.storage.upload_limits import validate_upload

router = APIRouter(prefix="/v1/stt", tags=["stt"])


@router.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...), language_hint: str | None = Form(default=None),
                           learner: Learner = Depends(get_current_learner)):
    await validate_upload(audio, "audio")
    with tempfile.TemporaryDirectory(prefix="pitchground-stt-") as directory:
        path = Path(directory) / ("audio" + (Path(audio.filename or "audio.webm").suffix or ".webm"))
        # The upload is already spooled to disk; never materialize the whole recording in RAM.
        from fastapi.concurrency import run_in_threadpool
        def process():
            with path.open("wb") as output:
                shutil.copyfileobj(audio.file, output, 64 * 1024)
            if sagemaker.enabled():
                return sagemaker.submit(learner.id, "speech", str(path), payload={"language_hint": language_hint or "auto"})
            from app.ml.speech_service import speech_response
            return speech_response(str(path), language_hint or "auto")
        try:
            result = await run_in_threadpool(process)
            return JSONResponse(status_code=202 if sagemaker.enabled() else 200, content=result)
        except sagemaker.SageMakerError:
            raise
        except ValueError as exc:
            raise HTTPException(status_code=415, detail=str(exc)) from exc
        except RuntimeError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/jobs/{job_id}")
def speech_job(job_id: str, learner: Learner = Depends(get_current_learner)):
    if not sagemaker.enabled():
        raise HTTPException(status_code=404, detail="Analysis job not found")
    return sagemaker.poll(learner.id, job_id)
