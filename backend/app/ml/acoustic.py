from __future__ import annotations

import logging
from pathlib import Path
import librosa
import numpy as np

from app.ml.types import AcousticSignals
from app.storage.media import resolve_local_path
from app.ml.speech_quality import lexical_words

logger = logging.getLogger(__name__)


class AcousticExtractor:
    """Extracts acoustic prosody, speech pace (WPM), silence hesitations, and speaking score from real audio."""

    def extract(self, audio_path: str, transcript_text: str) -> tuple[AcousticSignals, float | None]:
        local_path = resolve_local_path(audio_path)
        path = Path(local_path) if local_path else Path(audio_path)

        if not path.exists() or path.stat().st_size < 500:
            raise ValueError("The audio is missing, unreadable or too short for analysis.")

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
                    for output_frame in resampled:
                        chunks.append(output_frame.to_ndarray()[0])
                container.close()
                if chunks:
                    y = np.concatenate(chunks).astype(np.float32)
            except Exception as exc:
                logger.warning("Failed to load audio %s with librosa/av: %s", path, exc)
                raise ValueError("The audio is missing, unreadable or too short for analysis.")

        if y is None or len(y) == 0:
            raise ValueError("The audio is missing, unreadable or too short for analysis.")

        total_duration = float(librosa.get_duration(y=y, sr=sr))
        if total_duration < 0.3:
            raise ValueError("The audio is missing, unreadable or too short for analysis.")

        # Neural speech detection distinguishes speech from energy/noise. Keep original times.
        from faster_whisper.vad import VadOptions, get_speech_timestamps
        spans = get_speech_timestamps(y, VadOptions(threshold=.35, min_speech_duration_ms=100,
            min_silence_duration_ms=500, speech_pad_ms=200), sampling_rate=sr) if np.max(np.abs(y)) > 1e-5 else []
        intervals = np.array([[s["start"], s["end"]] for s in spans], dtype=int).reshape(-1, 2)
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
        words = lexical_words(transcript_text)
        # Speaking rate includes pauses; articulation rate is a separate diagnostic.
        wpm = round(len(words)*60/total_duration, 1) if speech_duration > 0 and words else 0.0
        articulation_wpm = round(len(words)*60/speech_duration, 1) if speech_duration > 0 and words else None

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

        return AcousticSignals(
            wpm=wpm,
            articulation_wpm=articulation_wpm,
            word_count=len(words),
            pause_ratio=pause_ratio,
            filler_rate=None,  # Requires the independent waveform filler detector.
            pitch_var=pitch_var,
            energy_var=energy_var,
            silence_burst_count=silence_burst_count,
            duration_sec=total_duration,
            speech_duration_sec=speech_duration,
            pause_count=max(0, len(intervals) - 1),
            response_latency_sec=float(intervals[0][0] / sr) if len(intervals) else None,
        ), None
