from __future__ import annotations

import logging
from pathlib import Path
import librosa
import numpy as np

from app.ml.types import AcousticSignals
from app.storage.media import resolve_local_path

logger = logging.getLogger(__name__)


class AcousticExtractor:
    """Extracts acoustic prosody, speech pace (WPM), silence hesitations, and speaking score from real audio."""

    def extract(self, audio_path: str, transcript_text: str) -> tuple[AcousticSignals, float]:
        local_path = resolve_local_path(audio_path)
        path = Path(local_path) if local_path else Path(audio_path)

        if not path.exists() or path.stat().st_size < 500:
            return AcousticSignals(wpm=0.0, pause_ratio=1.0, filler_rate=0.0, pitch_var=None, energy_var=0.0, silence_burst_count=0), 0.0

        y = None
        sr = 16000
        try:
            y, sr = librosa.load(str(path), sr=16000, mono=True)
        except Exception:
            try:
                import av
                container = av.open(str(path))
                resampler = av.AudioResampler(format="fltp", layout="mono", rate=16000)
                chunks = []
                for frame in container.decode(audio=0):
                    resampled = resampler.resample(frame)
                    if resampled:
                        chunks.append(resampled.to_ndarray()[0])
                container.close()
                if chunks:
                    y = np.concatenate(chunks).astype(np.float32)
            except Exception as exc:
                logger.warning("Failed to load audio %s with librosa/av: %s", path, exc)
                return AcousticSignals(wpm=0.0, pause_ratio=1.0, filler_rate=0.0, pitch_var=None, energy_var=0.0, silence_burst_count=0), 0.0

        if y is None or len(y) == 0:
            return AcousticSignals(wpm=0.0, pause_ratio=1.0, filler_rate=0.0, pitch_var=None, energy_var=0.0, silence_burst_count=0), 0.0

        total_duration = float(librosa.get_duration(y=y, sr=sr))
        if total_duration < 0.3:
            return AcousticSignals(wpm=0.0, pause_ratio=1.0, filler_rate=0.0, pitch_var=None, energy_var=0.0, silence_burst_count=0), 0.0

        # 1. Voice Activity Detection (top_db=25 threshold)
        intervals = librosa.effects.split(y, top_db=25)
        speech_duration = float(sum((end - start) / sr for start, end in intervals)) if len(intervals) > 0 else 0.0
        silence_duration = max(0.0, total_duration - speech_duration)
        pause_ratio = round(min(1.0, silence_duration / max(total_duration, 1e-4)), 3)

        # 2. Silence bursts >= 700 ms (hesitations)
        silence_burst_count = 0
        for i in range(len(intervals) - 1):
            pause_len = (intervals[i + 1][0] - intervals[i][1]) / sr
            if pause_len >= 0.70:
                silence_burst_count += 1

        # 3. Words Per Minute (WPM) calculated from actual transcribed words
        words = [w for w in transcript_text.split() if w.strip() and not (w.startswith("[") and w.endswith("]"))]
        if speech_duration > 0.4 and len(words) > 0:
            wpm = round(len(words) / (speech_duration / 60.0), 1)
        else:
            wpm = 0.0

        # 4. Pitch variability (F0 via Yin algorithm over voiced frames)
        pitch_var: float | None = None
        try:
            f0 = librosa.yin(y, fmin=65, fmax=350, sr=sr)
            voiced_f0 = f0[~np.isnan(f0)]
            if len(voiced_f0) > 10:
                pitch_var = round(float(np.std(voiced_f0)), 2)
        except Exception:
            pitch_var = None

        # 5. Energy (RMS) variability
        rms = librosa.feature.rms(y=y)[0]
        energy_var = round(float(np.std(rms)), 3) if len(rms) > 0 else 0.0

        # 6. Composite Speaking Score (0 to 100)
        if len(words) == 0 or speech_duration < 0.4:
            speaking_score = 0.0
        else:
            # Optimal speaking rate is 125-150 WPM
            pacing_penalty = abs(wpm - 135.0) * 0.4
            pause_penalty = max(0.0, pause_ratio - 0.20) * 60.0
            burst_penalty = min(20.0, silence_burst_count * 3.0)
            speaking_score = max(0.0, min(100.0, 100.0 - (pacing_penalty + pause_penalty + burst_penalty)))

        return AcousticSignals(
            wpm=wpm,
            pause_ratio=pause_ratio,
            filler_rate=0.0,  # Filled dynamically by LanguageExtractor
            pitch_var=pitch_var,
            energy_var=energy_var,
            silence_burst_count=silence_burst_count,
        ), round(speaking_score, 1)
