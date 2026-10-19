from __future__ import annotations

import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.ml.acoustic import AcousticExtractor
from app.ml.content import ContentEvaluator
from app.ml.language import LanguageExtractor
from app.ml.real_analyzer import RealAnalyzer
from app.ml.types import AnalysisConfig, AttemptMedia, SignalBundle, Transcript, TranscriptSegment, VisualSignals
from app.ml.vision import VisionExtractor


def test_language_fillers():
    extractor = LanguageExtractor()
    sample = Transcript(
        text="Um, uh, basically database indexing helps query speed, matlab, avoiding full table scans, like you know.",
        language="en",
        segments=[],
    )
    signals, filler_rate = extractor.extract(sample, "en")
    print(f"[TEST 1] Language signals: {signals}")
    print(f"[TEST 1] Filler rate: {filler_rate:.2f}%")
    assert filler_rate > 0.0, "Filler rate should detect 'um', 'uh', 'matlab', 'like you know'"
    assert signals.primary in ("en", "mixed")
    print("[OK] Language & Filler test passed!")


def test_content_evaluation():
    evaluator = ContentEvaluator()
    key_points = [
        "Avoids full table scans",
        "Uses B-tree index structures",
        "Improves read query performance",
    ]
    transcript = "Database indexing creates a B-tree structure that avoids full table scans and speeds up reads."
    signals = evaluator.evaluate(transcript, key_points)
    print(f"[TEST 2] Content coverage: {signals.coverage}, specificity: {signals.specificity}")
    assert signals.coverage >= 0.5, "Should match key points"
    print("[OK] Content evaluation test passed!")


def test_vision_fallback():
    vision = VisionExtractor()
    signals, stress = vision.extract("non_existent_file.webm")
    print(f"[TEST 3] Vision missing video result: {signals}, stress score: {stress}")
    assert signals is None
    assert stress == 0.0
    print("[OK] Vision missing video test passed (no hardcoded fallback)!")


def test_vision_video_motion_and_scores():
    import cv2
    import numpy as np

    temp_video = Path("data/media/test_motion_video.avi")
    temp_video.parent.mkdir(parents=True, exist_ok=True)

    fourcc = cv2.VideoWriter_fourcc(*"XVID")
    out = cv2.VideoWriter(str(temp_video), fourcc, 15.0, (320, 240))
    # Generate 30 frames: 15 moving, 15 still
    for i in range(30):
        img = np.zeros((240, 320, 3), dtype=np.uint8)
        offset = (i * 4) if i < 15 else 60
        # Draw face circle
        cv2.circle(img, (120 + offset, 100), 30, (200, 200, 200), -1)
        out.write(img)
    out.release()

    try:
        vision = VisionExtractor(sample_fps=5.0)
        signals, stress = vision.extract(str(temp_video))
        print(f"[TEST 3b] Real video CV extraction -> Signals: {signals}, Stress: {stress}")
        assert isinstance(signals, VisualSignals)
        assert signals.gesture_energy > 0.0, "Real video with motion must produce gesture energy"
        assert stress > 0.0, "Stress score must be calculated from non-verbal frames"
        print("[OK] Real video CV extraction test passed!")
    finally:
        temp_video.unlink(missing_ok=True)


def test_acoustic_fallback():
    acoustic = AcousticExtractor()
    signals, score = acoustic.extract("non_existent_file.webm", "Hello this is a test speech sample.")
    print(f"[TEST 4] Acoustic signals: {signals}, speaking score: {score}")
    assert signals.wpm == 0.0
    assert signals.pause_ratio == 1.0
    print("[OK] Acoustic fallback test passed!")


def test_real_analyzer_bundle():
    analyzer = RealAnalyzer()
    media = AttemptMedia(attempt_id="test-attempt-1", audio_path="data/media/dummy.webm")
    transcript = Transcript(
        text="Um, uh, indexing reduces disk I/O, you know, by keeping pointers in order.",
        language="en",
        segments=[
            TranscriptSegment(start_sec=0.0, end_sec=3.5, text="Um, uh, indexing reduces disk I/O", language="en"),
            TranscriptSegment(start_sec=3.6, end_sec=6.0, text="you know, by keeping pointers in order.", language="en"),
        ],
    )
    config = AnalysisConfig(
        practice_language="en",
        question_key_points=["Reduces disk I/O", "Ordered pointers"],
        skip_vision=True,
    )
    bundle = analyzer.analyze_attempt(media, transcript, config)
    print(f"[TEST 5] Bundle created: attempt_id={bundle.attempt_id}")
    print(f"         Fused dimensions: {bundle.fused.model_dump()}")
    print(f"         Acoustic signals: {bundle.acoustic.model_dump()}")
    print(f"         Language signals: {bundle.language.model_dump()}")
    print(f"         Quality flags:    {bundle.quality.model_dump()}")

    assert isinstance(bundle, SignalBundle)
    assert bundle.fused.fluency > 0.0
    assert bundle.fused.composure > 0.0
    assert bundle.acoustic.filler_rate > 0.0
    assert bundle.visual is None
    assert bundle.quality.video_ok is False
    print("[OK] Full RealAnalyzer pipeline test passed!")


def test_real_analyzer_with_video():
    import cv2
    import numpy as np

    temp_video = Path("data/media/test_full_cv_video.avi")
    temp_video.parent.mkdir(parents=True, exist_ok=True)

    fourcc = cv2.VideoWriter_fourcc(*"XVID")
    out = cv2.VideoWriter(str(temp_video), fourcc, 15.0, (320, 240))
    for i in range(30):
        img = np.zeros((240, 320, 3), dtype=np.uint8)
        offset = (i * 3) if i < 15 else 45
        cv2.circle(img, (120 + offset, 100), 30, (200, 200, 200), -1)
        out.write(img)
    out.release()

    try:
        analyzer = RealAnalyzer()
        media = AttemptMedia(
            attempt_id="test-attempt-video",
            audio_path="data/media/dummy.webm",
            video_path=str(temp_video),
        )
        transcript = Transcript(
            text="Indexing reduces disk I/O significantly by ordering search keys.",
            language="en",
            segments=[
                TranscriptSegment(start_sec=0.0, end_sec=3.0, text="Indexing reduces disk I/O", language="en"),
            ],
        )
        config = AnalysisConfig(
            practice_language="en",
            question_key_points=["Reduces disk I/O"],
            skip_vision=False,
        )
        bundle = analyzer.analyze_attempt(media, transcript, config)
        print(f"[TEST 6] Video Bundle created: attempt_id={bundle.attempt_id}")
        print(f"         Visual signals: {bundle.visual.model_dump() if bundle.visual else None}")
        print(f"         Fused presence:  {bundle.fused.presence}")
        print(f"         Fused composure: {bundle.fused.composure}")
        print(f"         Quality flags:   {bundle.quality.model_dump()}")

        assert bundle.visual is not None, "Visual signals must be extracted when video is provided"
        assert bundle.quality.video_ok is True
        assert bundle.visual.gesture_energy > 0.0
        assert 0.0 <= bundle.visual.freeze_ratio <= 1.0
        assert 0.0 <= bundle.visual.gaze_away <= 1.0
        assert 0.0 <= bundle.visual.head_down <= 1.0
        assert bundle.fused.presence > 0.0
        assert bundle.fused.composure > 0.0
        print("[OK] RealAnalyzer with dynamic CV video test passed!")
    finally:
        temp_video.unlink(missing_ok=True)


if __name__ == "__main__":
    test_language_fillers()
    test_content_evaluation()
    test_vision_fallback()
    test_vision_video_motion_and_scores()
    test_acoustic_fallback()
    test_real_analyzer_bundle()
    test_real_analyzer_with_video()
    print("\nALL 7 LOCAL ML PIPELINE TESTS PASSED!")
