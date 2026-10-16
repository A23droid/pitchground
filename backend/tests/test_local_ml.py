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
from app.ml.types import AnalysisConfig, AttemptMedia, SignalBundle, Transcript, TranscriptSegment
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
    print(f"[TEST 3] Vision fallback signals: {signals}, stress score: {stress}")
    assert signals.gaze_away == 0.10
    assert stress > 0.0
    print("[OK] Vision fallback test passed!")


def test_acoustic_fallback():
    acoustic = AcousticExtractor()
    signals, score = acoustic.extract("non_existent_file.webm", "Hello this is a test speech sample.")
    print(f"[TEST 4] Acoustic signals: {signals}, speaking score: {score}")
    assert signals.wpm > 0
    assert score > 0.0
    print("[OK] Acoustic test passed!")


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
    print("[OK] Full RealAnalyzer pipeline test passed!")


if __name__ == "__main__":
    test_language_fillers()
    test_content_evaluation()
    test_vision_fallback()
    test_acoustic_fallback()
    test_real_analyzer_bundle()
    print("\nALL 5 LOCAL ML PIPELINE TESTS PASSED!")
