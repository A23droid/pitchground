from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.rest import attempts, learners, sessions
from app.api.ws import sessions as ws_sessions
from app.auth import router as auth_router
from app.config import CORS_ORIGINS, ensure_data_dirs
from app.db import Base, SessionLocal, engine
from app.seed import seed_question_bank


@asynccontextmanager
async def lifespan(_: FastAPI):
    ensure_data_dirs()
    # Import models so metadata is registered
    import app.models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_question_bank(db)
    finally:
        db.close()
    yield


app = FastAPI(title="Pitchground API", version="0.2.0", lifespan=lifespan)

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


@app.get("/health")
def health():
    return {"ok": True, "service": "pitchground-backend"}
