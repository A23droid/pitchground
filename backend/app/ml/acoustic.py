from __future__ import annotations

import logging
from pathlib import Path
import librosa
import numpy as np

from app.ml.types import AcousticSignals
from app.storage.media import resolve_local_path

logger = logging.getLogger(__name__)


class AcousticExtractor:
    """Extracts acoustic prosody, speech pace (WPM), silence hesitations, and speaking score."""

    def extract(self, audio_path: str, transcript_text: str) -> tuple[AcousticSignals, float]:
        local_path = resolve_local_path(audio_path)
        path = Path(local_path) if local_path else Path(audio_path)

        if not path.exists() or path.stat().st_size < 1000:
            return AcousticSignals(wpm=120.0, pause_ratio=0.15, filler_rate=2.0, pitch_var=12.0, energy_var=0.2, silence_burst_count=1), 70.0

        try:
            y, sr = librosa.load(str(path), sr=16000, mono=True)
        except Exception as exc:
            logger.warning("Failed to load audio %s with librosa: %s", path, exc)
            return AcousticSignals(wpm=120.0, pause_ratio=0.15, filler_rate=2.0, pitch_var=12.0, energy_var=0.2, silence_burst_count=1), 70.0

        total_duration = float(librosa.get_duration(y=y, sr=sr))
        if total_duration < 0.5:
            return AcousticSignals(wpm=100.0, pause_ratio=0.2, filler_rate=2.0, pitch_var=10.0, energy_var=0.15, silence_burst_count=0), 60.0

        # 1. Voice Activity Detection (top_db=25 threshold)
        intervals = librosa.effects.split(y, top_db=25)
        speech_duration = float(sum((end - start) / sr for start, end in intervals)) if len(intervals) > 0 else 1e-4
        silence_duration = max(0.0, total_duration - speech_duration)
        pause_ratio = round(min(1.0, silence_duration / max(total_duration, 1e-4)), 3)

        # 2. Silence bursts >= 700 ms (severe hesitations)
        silence_burst_count = 0
        for i in range(len(intervals) - 1):
            pause_len = (intervals[i + 1][0] - intervals[i][1]) / sr
            if pause_len >= 0.70:
                silence_burst_count += 1

        # 3. Words Per Minute (WPM)
        words = [w for w in transcript_text.split() if w.strip()]
        if speech_duration > 0.8 and len(words) > 0:
            wpm = round((len(words) / (speech_duration / 60.0)), 1)
        else:
            wpm = 120.0

        # 4. Pitch variability (F0 via Yin)
        try:
            f0 = librosa.yin(y, fmin=65, fmax=350, sr=sr)
            voiced_f0 = f0[~np.isnan(f0)]
            pitch_var = round(float(np.std(voiced_f0)), 2) if len(voiced_f0) > 10 else 12.0
        except Exception:
            pitch_var = 12.0

        # 5. Energy (RMS) variability
        rms = librosa.feature.rms(y=y)[0]
        energy_var = round(float(np.std(rms)), 3) if len(rms) > 0 else 0.20

        # Default placeholder filler rate (updated when paired with LanguageExtractor)
        filler_rate = 2.0

        # Composite Speaking Score (0 to 100)
        # Optimal speaking rate is 125-145 WPM; penalize long pauses and extreme pacing
        pacing_penalty = abs(wpm - 135.0) * 0.35
        pause_penalty = max(0.0, pause_ratio - 0.15) * 60.0
        speaking_score = max(0.0, min(100.0, 100.0 - (pacing_penalty + pause_penalty)))

        return AcousticSignals(
            wpm=wpm,
            pause_ratio=pause_ratio,
            filler_rate=filler_rate,
            pitch_var=pitch_var,
            energy_var=energy_var,
            silence_burst_count=silence_burst_count,
        ), round(speaking_score, 1)
