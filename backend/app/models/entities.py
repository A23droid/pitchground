from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Learner(Base):
    __tablename__ = "learners"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    google_sub: Mapped[str | None] = mapped_column(String(128), unique=True, nullable=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(255))
    practice_language: Mapped[str] = mapped_column(String(8), default="en")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    sessions: Mapped[list[Session]] = relationship(back_populates="learner")
    dimension_scores: Mapped[list[LearnerDimensionScore]] = relationship(back_populates="learner")
    profile_snapshots: Mapped[list[ProfileSnapshot]] = relationship(back_populates="learner")


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    learner_id: Mapped[str] = mapped_column(ForeignKey("learners.id"), index=True)
    mode: Mapped[str] = mapped_column(String(32), default="interview")
    topic: Mapped[str] = mapped_column(String(128), default="Database Systems")
    audience: Mapped[str] = mapped_column(String(64), default="")
    language: Mapped[str] = mapped_column(String(32), default="English")
    difficulty: Mapped[str] = mapped_column(String(32), default="Standard")
    phase: Mapped[str] = mapped_column(String(64), default="created")
    policy_json: Mapped[str] = mapped_column(Text, default="{}")
    current_action_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    learner: Mapped[Learner] = relationship(back_populates="sessions")
    attempts: Mapped[list[Attempt]] = relationship(back_populates="session")
    events: Mapped[list[SessionEvent]] = relationship(back_populates="session")
    baseline: Mapped[Baseline | None] = relationship(back_populates="session", uselist=False)
    diagnosis: Mapped[DiagnosisRow | None] = relationship(back_populates="session", uselist=False)
    challenge: Mapped[ChallengeRow | None] = relationship(back_populates="session", uselist=False)
    comparison: Mapped[ComparisonRow | None] = relationship(back_populates="session", uselist=False)


class SessionEvent(Base):
    __tablename__ = "session_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id"), index=True)
    event_type: Mapped[str] = mapped_column(String(64))
    payload_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    session: Mapped[Session] = relationship(back_populates="events")


class Attempt(Base):
    __tablename__ = "attempts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id"), index=True)
    role: Mapped[str] = mapped_column(String(32))  # baseline | pressure | retry
    status: Mapped[str] = mapped_column(String(32), default="pending")
    prompt: Mapped[str] = mapped_column(Text, default="")
    pressure_spec_json: Mapped[str] = mapped_column(Text, default="{}")
    audio_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    video_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    analysis_status: Mapped[str] = mapped_column(String(32), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    session: Mapped[Session] = relationship(back_populates="attempts")
    transcript: Mapped[TranscriptRow | None] = relationship(back_populates="attempt", uselist=False)
    metrics: Mapped[AttemptMetrics | None] = relationship(back_populates="attempt", uselist=False)


class TranscriptRow(Base):
    __tablename__ = "transcripts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    attempt_id: Mapped[str] = mapped_column(ForeignKey("attempts.id"), unique=True)
    text: Mapped[str] = mapped_column(Text, default="")
    language: Mapped[str] = mapped_column(String(16), default="unknown")
    confidence: Mapped[str | None] = mapped_column(String(32), nullable=True)
    segments_json: Mapped[str] = mapped_column(Text, default="[]")

    attempt: Mapped[Attempt] = relationship(back_populates="transcript")


class AttemptMetrics(Base):
    __tablename__ = "attempt_metrics"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    attempt_id: Mapped[str] = mapped_column(ForeignKey("attempts.id"), unique=True)
    signal_bundle_json: Mapped[str] = mapped_column(Text, default="{}")

    attempt: Mapped[Attempt] = relationship(back_populates="metrics")


class Baseline(Base):
    __tablename__ = "baselines"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id"), unique=True)
    vector_json: Mapped[str] = mapped_column(Text, default="{}")

    session: Mapped[Session] = relationship(back_populates="baseline")


class EvidenceRow(Base):
    __tablename__ = "evidence"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id"), index=True)
    attempt_id: Mapped[str] = mapped_column(ForeignKey("attempts.id"), index=True)
    metric: Mapped[str] = mapped_column(String(128))
    delta: Mapped[str] = mapped_column(String(64), default="0")
    threshold: Mapped[str] = mapped_column(String(64), default="0")
    modality: Mapped[str] = mapped_column(String(32), default="fused")
    excerpt: Mapped[str | None] = mapped_column(Text, nullable=True)
    payload_json: Mapped[str] = mapped_column(Text, default="{}")


class FailureCandidateRow(Base):
    __tablename__ = "failure_candidates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id"), index=True)
    condition: Mapped[str] = mapped_column(String(64))
    score: Mapped[str] = mapped_column(String(32), default="0")
    evidence_ids_json: Mapped[str] = mapped_column(Text, default="[]")


class DiagnosisRow(Base):
    __tablename__ = "diagnoses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id"), unique=True)
    condition: Mapped[str] = mapped_column(String(64))
    confidence: Mapped[str] = mapped_column(String(16), default="medium")
    rationale: Mapped[str] = mapped_column(Text, default="")
    evidence_ids_json: Mapped[str] = mapped_column(Text, default="[]")
    payload_json: Mapped[str] = mapped_column(Text, default="{}")

    session: Mapped[Session] = relationship(back_populates="diagnosis")


class ChallengeRow(Base):
    __tablename__ = "challenges"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id"), unique=True)
    prompt_text: Mapped[str] = mapped_column(Text, default="")
    training_spec_json: Mapped[str] = mapped_column(Text, default="{}")
    payload_json: Mapped[str] = mapped_column(Text, default="{}")

    session: Mapped[Session] = relationship(back_populates="challenge")


class ComparisonRow(Base):
    __tablename__ = "comparisons"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id"), unique=True)
    payload_json: Mapped[str] = mapped_column(Text, default="{}")

    session: Mapped[Session] = relationship(back_populates="comparison")


class LearnerDimensionScore(Base):
    __tablename__ = "learner_dimension_scores"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    learner_id: Mapped[str] = mapped_column(ForeignKey("learners.id"), index=True)
    dimension: Mapped[str] = mapped_column(String(64))
    score: Mapped[float] = mapped_column(default=50.0)
    n: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    learner: Mapped[Learner] = relationship(back_populates="dimension_scores")


class ProfileSnapshot(Base):
    __tablename__ = "profile_snapshots"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    learner_id: Mapped[str] = mapped_column(ForeignKey("learners.id"), index=True)
    payload_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    learner: Mapped[Learner] = relationship(back_populates="profile_snapshots")


class QuestionBankItem(Base):
    __tablename__ = "question_bank"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    topic: Mapped[str] = mapped_column(String(128), index=True)
    role: Mapped[str] = mapped_column(String(32), default="baseline")
    prompt: Mapped[str] = mapped_column(Text)
    key_points_json: Mapped[str] = mapped_column(Text, default="[]")
    language: Mapped[str] = mapped_column(String(8), default="en")
    time_limit_sec: Mapped[int | None] = mapped_column(Integer, nullable=True)
