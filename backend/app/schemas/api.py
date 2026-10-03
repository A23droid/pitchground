from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class LearnerCreate(BaseModel):
    display_name: str
    practice_language: Literal["en", "hi"] = "en"


class LearnerOut(BaseModel):
    id: str
    display_name: str
    practice_language: str
    email: str | None = None
    created_at: str | None = None


class SessionCreate(BaseModel):
    learner_id: str | None = None
    mode: Literal["interview", "debate", "impromptu", "language-diagnostic"] = "interview"
    topic: str = "Database Systems"
    audience: str = ""
    language: str = "English"
    difficulty: str = "Standard"
    policy: dict[str, Any] | None = None


class AdvanceBody(BaseModel):
    from_phase: str


class AttemptCreate(BaseModel):
    role: Literal["baseline", "pressure", "retry"]


class SessionFinish(BaseModel):
    phase: str = "completed"
    diagnosis: dict[str, Any] | None = None
    transcript: str | None = None
    metrics: dict[str, Any] | None = None


class ErrorBody(BaseModel):
    error: dict[str, Any]

