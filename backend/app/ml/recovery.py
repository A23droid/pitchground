from __future__ import annotations

import tempfile
from pathlib import Path
import av
import numpy as np
import soundfile as sf
from app.ml.types import AttemptMedia, Transcript, TranscriptWord, TranscriptSegment
from app.storage.media import resolve_local_path


def measure_recovery(audio_path, transcript, config, interruption_sec, analyzer):
    if interruption_sec is None or interruption_sec <= 0:
        raise ValueError("The recording has no interruption timestamp.")
    before = [w for w in transcript.words if w.end_sec <= interruption_sec]
    after = [w for w in transcript.words if w.start_sec >= interruption_sec]
    if not before or not after:
        raise ValueError("Record speech both before and after the interruption.")
    with av.open(resolve_local_path(audio_path) or audio_path) as container:
        resampler = av.AudioResampler(format="fltp",layout="mono",rate=16000)
        chunks = [out.to_ndarray()[0] for frame in container.decode(audio=0) for out in resampler.resample(frame)]
    if not chunks: raise ValueError("Audio decoding failed.")
    samples = np.concatenate(chunks)
    cut = round(interruption_sec*16000)
    results = []
    with tempfile.TemporaryDirectory(prefix="pitchground-recovery-") as directory:
        for index, (audio, words, offset) in enumerate([(samples[:cut],before,0),(samples[cut:],after,interruption_sec)]):
            path = Path(directory)/f"{index}.wav"
            sf.write(path,audio,16000)
            text = " ".join(w.word for w in words)
            adjusted = [w.model_copy(update={"start_sec":max(0,w.start_sec-offset),"end_sec":max(0,w.end_sec-offset)}) for w in words]
            t = Transcript(text=text,language=transcript.language,words=adjusted,
                           segments=[TranscriptSegment(start_sec=0,end_sec=len(audio)/16000,text=text,language=transcript.language,words=adjusted)])
            b = analyzer.analyze_attempt(AttemptMedia(attempt_id=f"recovery-{index}",audio_path=str(path)),t,
                                        config.model_copy(update={"skip_vision":True}))
            if not b.quality.audio_ok: raise ValueError("One side of the interruption contains no usable speech.")
            results.append(b)
    first,last = results
    fluency_drop = (first.fused.fluency-last.fused.fluency)*100
    relevance = last.content.relevance>=.6 if last.content and last.content.relevance is not None else None
    return dict(preInterruption=dict(structure=round(first.fused.structure*100) if first.fused.structure is not None else None,fluency=round(first.fused.fluency*100)),
                postInterruption=dict(structure=round(last.fused.structure*100) if last.fused.structure is not None else None,fluency=round(last.fused.fluency*100)),
                recoverySeconds=max(0,after[0].start_sec-interruption_sec),relevanceMaintained=relevance,
                verdict="strong-recovery" if fluency_drop<=8 else "partial-recovery" if fluency_drop<=20 else "weak-recovery")
