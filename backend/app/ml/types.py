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


class TranscriptWord(BaseModel):
    word: str
    start_sec: float
    end_sec: float
    probability: float | None = None


class TranscriptSegment(BaseModel):
    start_sec: float
    end_sec: float
    text: str
    language: str = "en"
    words: list[TranscriptWord] = Field(default_factory=list)


class Transcript(BaseModel):
    text: str
    language: str = "en"
    confidence: float | None = None
    segments: list[TranscriptSegment] = Field(default_factory=list)
    words: list[TranscriptWord] = Field(default_factory=list)


class AttemptMedia(BaseModel):
    attempt_id: str
    audio_path: str
    video_path: str | None = None


class AnalysisConfig(BaseModel):
    practice_language: str = "en"
    question_key_points: list[str] = Field(default_factory=list)
    sample_fps: float = 5
    skip_vision: bool = True
    role: Literal["baseline", "pressure", "retry"] = "baseline"


class AcousticSignals(BaseModel):
    wpm: float = 0.0
    pause_ratio: float = 0.0
    filler_rate: float = 0.0
    pitch_var: float | None = None
    energy_var: float = 0.0
    silence_burst_count: int = 0


class LanguageSignals(BaseModel):
    primary: str = "en"
    primary_ratio: float = 1.0
    code_switch_rate: float = 0.0


class VisualSignals(BaseModel):
    gaze_away: float = 0.0
    head_down: float = 0.0
    freeze_ratio: float = 0.0
    gesture_energy: float = 0.0


class ContentSignals(BaseModel):
    coverage: float = 0.0
    specificity: float = 0.0


class FusedDimensions(BaseModel):
    fluency: float = 0.0
    composure: float = 0.0
    presence: float = 0.0
    structure: float = 0.0
    language_stability: float = 0.0
    content: float = 0.0


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
