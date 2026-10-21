from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from app.agents.llm_client import LLMError
from fastapi.middleware.cors import CORSMiddleware

from app.api.rest import attempts, debate, learners, sessions, stt
from app.api.ws import sessions as ws_sessions
from app.auth import router as auth_router
from app.config import CORS_ORIGINS, ensure_data_dirs
from app.db import Base, SessionLocal, engine
from app.ml.sagemaker import SageMakerError, enabled, settings


@asynccontextmanager
async def lifespan(_: FastAPI):
    if enabled():
        settings()
    ensure_data_dirs()
    # Import models so metadata is registered
    import app.models  # noqa: F401
    try:
        import app.models as _extra_models  # noqa: F401
    except Exception:
        pass

    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="Pitchground API", version="0.2.0", lifespan=lifespan)


@app.exception_handler(SageMakerError)
def sagemaker_error_response(request: Request, exc: SageMakerError):
    return JSONResponse(status_code=exc.status, content={"detail": str(exc), "code": exc.code})

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(learners.router)
app.include_router(sessions.router)
app.include_router(attempts.router)
app.include_router(ws_sessions.router)
app.include_router(stt.router)
app.include_router(debate.router)


@app.get("/health")
def health():
    return {"ok": True, "service": "pitchground-backend"}


@app.exception_handler(LLMError)
def llm_error_response(request: Request, exc: LLMError):
    headers = {"Retry-After": str(exc.retry_after)} if exc.retry_after else {}
    return JSONResponse(status_code=429 if exc.code=="rate_limited" else 503,
                        content={"detail":str(exc),"code":exc.code,"stage":exc.role,"retry_after":exc.retry_after},headers=headers)
