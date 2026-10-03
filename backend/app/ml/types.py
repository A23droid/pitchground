from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

FailureCondition = Literal[
    "freeze",
    "fluency_breakdown",
    "language_instability",
    "knowledge_gap",
    "delivery_collapse",
    "ramble",
]


class TranscriptSegment(BaseModel):
    start_sec: float
    end_sec: float
    text: str
    language: Literal["en", "hi", "unknown"] = "unknown"


class Transcript(BaseModel):
    text: str
    language: Literal["en", "hi", "mixed", "unknown"] = "unknown"
    confidence: float | None = None
    segments: list[TranscriptSegment] = Field(default_factory=list)


class AttemptMedia(BaseModel):
    attempt_id: str
    audio_path: str
    video_path: str | None = None


class AnalysisConfig(BaseModel):
    practice_language: Literal["en", "hi"] = "en"
    question_key_points: list[str] = Field(default_factory=list)
    sample_fps: float = 5
    skip_vision: bool = True
    role: Literal["baseline", "pressure", "retry"] = "baseline"


class AcousticSignals(BaseModel):
    wpm: float = 120
    pause_ratio: float = 0.15
    filler_rate: float = 2.0
    pitch_var: float | None = 12.0
    energy_var: float = 0.2
    silence_burst_count: int = 1


class LanguageSignals(BaseModel):
    primary: Literal["en", "hi", "mixed", "unknown"] = "en"
    primary_ratio: float = 0.9
    code_switch_rate: float = 0.1


class VisualSignals(BaseModel):
    gaze_away: float = 0.1
    head_down: float = 0.1
    freeze_ratio: float = 0.05
    gesture_energy: float = 0.4


class ContentSignals(BaseModel):
    coverage: float = 0.7
    specificity: float = 0.6


class FusedDimensions(BaseModel):
    fluency: float = 0.7
    composure: float = 0.7
    presence: float = 0.7
    structure: float = 0.7
    language_stability: float = 0.8
    content: float = 0.7


class QualityFlags(BaseModel):
    audio_ok: bool = True
    video_ok: bool = False
    warnings: list[str] = Field(default_factory=list)


class SignalBundle(BaseModel):
    attempt_id: str
    transcript: Transcript
    acoustic: AcousticSignals
    language: LanguageSignals
    visual: VisualSignals | None = None
    content: ContentSignals | None = None
    fused: FusedDimensions
    quality: QualityFlags


class Evidence(BaseModel):
    id: str
    attempt_id: str
    metric: str
    delta: float
    threshold: float
    modality: str
    excerpt: str | None = None
    span: dict[str, float] | None = None


class CandidateFailure(BaseModel):
    condition: FailureCondition
    score: float
    evidence_ids: list[str]


def bundle_to_dict(bundle: SignalBundle) -> dict[str, Any]:
    return bundle.model_dump()
