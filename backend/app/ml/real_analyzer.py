from __future__ import annotations

import logging
from app.ml.acoustic import AcousticExtractor
from app.ml.content import ContentEvaluator
from app.ml.language import LanguageExtractor
from app.ml.protocols import AttemptAnalyzerProtocol
from app.ml.types import (
    AnalysisConfig,
    AttemptMedia,
    FusedDimensions,
    QualityFlags,
    SignalBundle,
    Transcript,
)
from app.ml.vision import VisionExtractor

logger = logging.getLogger(__name__)


class RealAnalyzer(AttemptAnalyzerProtocol):
    """Production ML Analyzer combining local Computer Vision, Acoustic Prosody, 
    Linguistic Disfluencies (fillers), and Semantic Content evaluation.
    No hardcoded scores or fixture shortcuts.
    """

    def __init__(self):
        self.vision = VisionExtractor(sample_fps=5.0)
        self.acoustic = AcousticExtractor()
        self.language = LanguageExtractor()
        self.content = ContentEvaluator()

    def analyze_attempt(
        self,
        media: AttemptMedia,
        transcript: Transcript,
        config: AnalysisConfig,
    ) -> SignalBundle:
        warnings: list[str] = []

        # 1. Linguistic & Filler Analysis (Preserves verbatim disfluencies from model)
        lang_signals, filler_rate = self.language.extract(transcript, config.practice_language)

        # 2. Acoustic Prosody & Speaking Rate from Audio (Librosa)
        acoustic_signals, speaking_score = self.acoustic.extract(media.audio_path, transcript.text)
        acoustic_signals.filler_rate = filler_rate

        # 3. Computer Vision & Stress Analysis (MediaPipe Face Mesh + Pose)
        visual_signals = None
        if not config.skip_vision and media.video_path:
            visual_signals, _ = self.vision.extract(media.video_path)
            if visual_signals is None:
                warnings.append("video_processing_failed")
        else:
            warnings.append("skip_vision_active")

        # 4. Content Key-Point Coverage
        content_signals = self.content.evaluate(transcript.text, config.question_key_points)

        # 5. Multimodal Signal Fusion (Computed dynamically, 0.0 to 1.0)
        has_speech = bool(transcript.text.strip()) and (acoustic_signals.wpm > 0.0 or len(transcript.text.split()) > 0)

        if not has_speech:
            warnings.append("no_speech_detected")
            fused = FusedDimensions(
                fluency=0.0,
                composure=0.0,
                presence=round(0.50 * (1.0 - visual_signals.gaze_away), 2) if visual_signals else 0.0,
                structure=0.0,
                language_stability=0.0,
                content=0.0,
            )
            return SignalBundle(
                attempt_id=media.attempt_id,
                transcript=transcript,
                acoustic=acoustic_signals,
                language=lang_signals,
                visual=visual_signals,
                content=content_signals,
                fused=fused,
                quality=QualityFlags(
                    audio_ok=False,
                    video_ok=visual_signals is not None,
                    warnings=warnings,
                ),
            )

        # Fluency: Pacing (120-150 WPM optimal), low pauses, low filler rate
        norm_wpm = min(1.0, acoustic_signals.wpm / 140.0) if acoustic_signals.wpm > 0 else 0.1
        fluency = round(
            0.40 * norm_wpm
            + 0.35 * max(0.0, 1.0 - acoustic_signals.pause_ratio)
            + 0.25 * max(0.0, 1.0 - (acoustic_signals.filler_rate / 10.0)),
            2,
        )

        # Composure: Vocal stability (low energy & pitch jitter) + physical composure (no freeze panic)
        freeze_val = visual_signals.freeze_ratio if visual_signals else 0.05
        composure = round(
            0.50 * max(0.0, 1.0 - min(1.0, acoustic_signals.energy_var * 2.0))
            + 0.50 * (1.0 - freeze_val),
            2,
        )

        # Presence: Camera eye contact + expressive hand gestures (or vocal delivery confidence if audio-only)
        if visual_signals:
            presence = round(
                0.50 * (1.0 - visual_signals.gaze_away)
                + 0.30 * (1.0 - visual_signals.head_down)
                + 0.20 * visual_signals.gesture_energy,
                2,
            )
        else:
            presence = round(0.50 * (speaking_score / 100.0) + 0.50 * composure, 2)

        # Structure: Logical progression, key point alignment, absence of rambling
        structure = round(min(1.0, (content_signals.coverage * 0.55) + (fluency * 0.45)), 2)

        # Language Stability: Target language adherence without unintended code-switching
        lang_stability = round(max(0.0, lang_signals.primary_ratio - (lang_signals.code_switch_rate * 0.5)), 2)

        fused = FusedDimensions(
            fluency=max(0.0, min(1.0, fluency)),
            composure=max(0.0, min(1.0, composure)),
            presence=max(0.0, min(1.0, presence)),
            structure=max(0.0, min(1.0, structure)),
            language_stability=max(0.0, min(1.0, lang_stability)),
            content=max(0.0, min(1.0, content_signals.coverage)),
        )

        return SignalBundle(
            attempt_id=media.attempt_id,
            transcript=transcript,
            acoustic=acoustic_signals,
            language=lang_signals,
            visual=visual_signals,
            content=content_signals,
            fused=fused,
            quality=QualityFlags(
                audio_ok=True,
                video_ok=visual_signals is not None,
                warnings=warnings,
            ),
        )
