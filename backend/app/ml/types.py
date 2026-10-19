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
    provenance: dict = Field(default_factory=dict)


class AttemptMedia(BaseModel):
    attempt_id: str
    audio_path: str
    video_path: str | None = None


class AnalysisConfig(BaseModel):
    practice_language: str = "en"
    question_key_points: list[str] = Field(default_factory=list)
    question_prompt: str = ""
    reference_answer: str = ""
    sample_fps: float = 5
    skip_vision: bool = True
    role: str = "baseline"


class FillerEvent(BaseModel):
    start_sec: float | None = None
    end_sec: float | None = None
    confidence: float | None = Field(default=None, ge=0, le=1)
    source: Literal["audio", "transcript", "audio+transcript"]
    text: str | None = None


class AcousticSignals(BaseModel):
    wpm: float = 0.0
    articulation_wpm: float | None = None
    word_count: int = 0
    pause_ratio: float = 0.0
    filler_rate: float | None = None
    pitch_var: float | None = None
    energy_var: float = 0.0
    silence_burst_count: int = 0
    duration_sec: float = 0.0
    speech_duration_sec: float = 0.0
    pause_count: int = 0
    response_latency_sec: float | None = None
    filler_count: int | None = None
    lexical_filler_count: int = 0
    filler_events: list[FillerEvent] = Field(default_factory=list)
    filler_detection: dict = Field(default_factory=dict)


class LanguageSignals(BaseModel):
    primary: str = "unknown"
    primary_ratio: float | None = None
    code_switch_rate: float | None = None


class VisualSignals(BaseModel):
    gaze_away: float | None = None
    head_down: float | None = None
    freeze_ratio: float | None = None
    gesture_energy: float | None = None
    stress_score: float | None = None
    upper_body_motion: float | None = None
    facial_tension: float | None = None
    facial_blendshapes: dict[str, float] = Field(default_factory=dict)
    face_detection_ratio: float | None = None
    hand_detection_ratio: float | None = None


class ContentSignals(BaseModel):
    coverage: float | None = None
    specificity: float | None = None
    structure: float | None = Field(default=None, ge=0, le=1)
    correctness: float | None = Field(default=None, ge=0, le=1)
    relevance: float | None = Field(default=None, ge=0, le=1)
    feedback: str | None = None
    reference_answer: str | None = None
    validation_status: str = "not_validated"


class FusedDimensions(BaseModel):
    fluency: float | None = None
    composure: float | None = None
    presence: float | None = None
    structure: float | None = None
    language_stability: float | None = None
    content: float | None = None


class QualityFlags(BaseModel):
    audio_ok: bool = False
    video_ok: bool = False
    warnings: list[str] = Field(default_factory=list)


class SignalBundle(BaseModel):
    provenance: dict[str, Any] = Field(default_factory=dict)
    recovery: dict[str, Any] | None = None
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
