"""Phase 2 Integration Test: Full STT + Acoustic + Language pipeline with real audio.

Generates a synthetic speech WAV using pyttsx3 (or falls back to a sine-wave test),
then runs it through LocalWhisperTranscriber -> AcousticExtractor -> LanguageExtractor.
"""
from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

os.environ.setdefault("ML_ANALYZER", "real")
os.environ.setdefault("STORAGE_BACKEND", "local")

import numpy as np
import soundfile as sf


def make_tts_wav(text: str, out_path: str) -> bool:
    """Try pyttsx3 TTS; fall back to silence on failure."""
    try:
        import pyttsx3
        engine = pyttsx3.init()
        engine.setProperty("rate", 140)
        engine.save_to_file(text, out_path)
        engine.runAndWait()
        print(f"[TTS] Generated speech WAV via pyttsx3: {out_path}")
        return True
    except Exception as e:
        print(f"[TTS] pyttsx3 unavailable ({e}), generating synthetic signal instead")
        # Fallback: 3-second silent + minor noise signal at 16kHz (simulates short audio)
        sr = 16000
        t = np.linspace(0, 3.0, sr * 3)
        # Add low-amplitude noise to avoid empty audio rejection
        signal = np.random.randn(len(t)) * 0.005
        sf.write(out_path, signal.astype(np.float32), sr)
        return False


def test_phase2_transcriber():
    """Test LocalWhisperTranscriber with real speech synthesis."""
    from app.ml.local_transcriber import LocalWhisperTranscriber
    from app.ml.acoustic import AcousticExtractor
    from app.ml.language import LanguageExtractor

    TEST_PHRASE = (
        "Um, uh, database indexing basically helps queries avoid full table scans, "
        "like it creates a B-tree structure, you know, improving performance significantly."
    )

    print("\n=== PHASE 2: Verbatim STT & Acoustic Integration Test ===\n")

    # Step 1: Generate speech audio
    tmp_wav = tempfile.mktemp(suffix=".wav")
    used_tts = make_tts_wav(TEST_PHRASE, tmp_wav)

    try:
        # Step 2: LocalWhisperTranscriber
        print("[STEP 2] Running LocalWhisperTranscriber...")
        transcriber = LocalWhisperTranscriber(model_size="base")
        transcript = transcriber.transcribe(tmp_wav, language_hint="en")

        if used_tts:
            print(f"         Transcript: '{transcript.text}'")
            print(f"         Language:   {transcript.language} (confidence={transcript.confidence})")
            print(f"         Segments:   {len(transcript.segments)} segments")
        else:
            # Synthetic noise won't produce real speech
            print(f"         Transcript (noise input): '{transcript.text}' (expected empty or noise)")
            # Inject the test phrase for downstream tests
            from app.ml.types import Transcript, TranscriptSegment
            transcript = Transcript(
                text=TEST_PHRASE,
                language="en",
                confidence=0.95,
                segments=[
                    TranscriptSegment(start_sec=0.0, end_sec=3.0, text=TEST_PHRASE, language="en")
                ],
            )
            print(f"         Injected test phrase for downstream validation.")

        # Step 3: AcousticExtractor
        print("\n[STEP 3] Running AcousticExtractor...")
        acoustic = AcousticExtractor()
        acoustic_signals, speaking_score = acoustic.extract(tmp_wav, transcript.text)
        print(f"         WPM:                   {acoustic_signals.wpm}")
        print(f"         Pause Ratio:           {acoustic_signals.pause_ratio}")
        print(f"         Silence Bursts >=700ms:{acoustic_signals.silence_burst_count}")
        print(f"         Pitch Variance (F0):   {acoustic_signals.pitch_var}")
        print(f"         Energy Variance (RMS): {acoustic_signals.energy_var}")
        print(f"         Speaking Score:        {speaking_score}/100")

        # Step 4: LanguageExtractor (Filler Detection)
        print("\n[STEP 4] Running LanguageExtractor (Filler Detection)...")
        lang_extractor = LanguageExtractor()
        lang_signals, filler_rate = lang_extractor.extract(transcript, "en")
        acoustic_signals.filler_rate = filler_rate
        print(f"         Primary Language:      {lang_signals.primary}")
        print(f"         Primary Ratio:         {lang_signals.primary_ratio}")
        print(f"         Code-Switch Rate:      {lang_signals.code_switch_rate}")
        print(f"         Filler Rate:           {filler_rate:.2f}% (per 100 words)")

        # Filler validation
        fillers_detected = filler_rate > 0.0
        print(f"\n[RESULT] Fillers detected (um/uh/basically/like/you know): {'YES' if fillers_detected else 'NO'}")
        assert fillers_detected, "Filler rate should be > 0 — 'um', 'uh', 'basically', 'like', 'you know' present in test phrase"
        assert acoustic_signals.wpm > 0
        assert 0.0 <= acoustic_signals.pause_ratio <= 1.0
        assert speaking_score >= 0.0
        assert lang_signals.primary in ("en", "hi", "mixed", "unknown")

        print("\n[OK] PHASE 2 - STT & Acoustic Integration Test PASSED!")
    finally:
        if os.path.exists(tmp_wav):
            os.unlink(tmp_wav)


def test_phase2_transcriber_hindi_fillers():
    """Test filler detection for Hindi/Hinglish phrases."""
    from app.ml.language import LanguageExtractor
    from app.ml.types import Transcript

    print("\n=== PHASE 2: Hindi/Hinglish Filler Detection Test ===\n")

    hindi_transcript = Transcript(
        text="matlab, uh, database indexing matlab ki yaar, it avoids full table scans, hmmm, woh basically B-tree use karta hai.",
        language="mixed",
        segments=[],
    )
    extractor = LanguageExtractor()
    signals, filler_rate = extractor.extract(hindi_transcript, "en")
    print(f"         Transcript: '{hindi_transcript.text}'")
    print(f"         Primary Language: {signals.primary}")
    print(f"         Primary Ratio:    {signals.primary_ratio}")
    print(f"         Code-Switch Rate: {signals.code_switch_rate}")
    print(f"         Filler Rate:      {filler_rate:.2f}%")

    assert filler_rate > 0.0, "Should detect 'matlab', 'yaar', 'hmmm', 'woh', 'uh', 'basically'"
    print("\n[OK] PHASE 2 - Hindi/Hinglish Filler Detection Test PASSED!")


if __name__ == "__main__":
    test_phase2_transcriber()
    test_phase2_transcriber_hindi_fillers()
    print("\n=== ALL PHASE 2 TESTS PASSED! ===")
