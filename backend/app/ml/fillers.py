"""Waveform filled-pause detection; ASR words are neither synthesized nor rewritten."""
from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from threading import Lock
import numpy as np
from app.config import BASE_DIR
from app.ml.types import FillerEvent, Transcript
from app.ml.language import LanguageExtractor
from app.ml.speech_quality import lexical_words

logger = logging.getLogger(__name__)
POLICY = json.loads(Path(__file__).with_name("filler_policy.json").read_text(encoding="utf-8"))
_model = None
_model_lock = Lock()
_inference_lock = Lock()


def model_directory() -> Path:
    return Path(os.getenv("FILLER_MODEL_DIR", str(BASE_DIR / "models" / "filled_pause")))


def load_model():
    global _model
    with _model_lock:
        if _model is None:
            directory = model_directory()
            if not (directory / "model.safetensors").is_file():
                raise RuntimeError("The waveform filler model is not installed.")
            import torch
            from transformers import AutoFeatureExtractor
            from app.ml.low_memory_frame_model import load_quantized_classifier
            torch.set_num_threads(int(os.getenv("FILLER_CPU_THREADS", "4")))
            processor = AutoFeatureExtractor.from_pretrained(str(directory), local_files_only=True, trust_remote_code=False)
            model = load_quantized_classifier(directory)
            _model = (processor, model)
        return _model


def probabilities_to_events(probabilities, duration_sec: float, policy=POLICY) -> list[FillerEvent]:
    """Group actual frame probabilities; time gaps alone never create detections."""
    probs = np.asarray(probabilities, dtype=float)
    if probs.ndim != 1 or not np.all(np.isfinite(probs)) or np.any((probs < 0) | (probs > 1)):
        raise ValueError("Invalid filler-model frame probabilities")
    frame_sec = policy["frame_sec"]
    runs = []
    start = None
    for i, positive in enumerate(np.append(probs >= policy["probability_threshold"], False)):
        if positive and start is None: start = i
        if not positive and start is not None:
            begin, end = start * frame_sec, min(i * frame_sec, duration_sec)
            if begin < end: runs.append((begin, end, list(probs[start:i])))
            start = None
    merged = []
    for begin, end, values in runs:
        if merged and begin - merged[-1][1] <= policy["merge_gap_sec"] + 1e-8:
            old_begin, _, old_values = merged.pop()
            merged.append((old_begin, end, old_values + values))
        else: merged.append((begin, end, values))
    return [FillerEvent(start_sec=round(begin, 3), end_sec=round(end, 3), confidence=round(float(np.mean(values)), 3), source="audio")
            for begin, end, values in merged if end-begin >= policy["min_duration_sec"] - 1e-8]


def lexical_events(transcript: Transcript) -> list[FillerEvent]:
    # Use actual word alignment to deduplicate audio detections already present in ASR.
    if transcript.words:
        parts=[]; positions=[]; cursor=0
        for word in transcript.words:
            parts.append(word.word)
            positions.append((cursor,cursor+len(word.word),word))
            cursor += len(word.word)+1
        text=" ".join(parts)
        events=[]
        for match in LanguageExtractor._FILLERS.finditer(text):
            words=[word for start,end,word in positions if end>match.start() and start<match.end()]
            events.append(FillerEvent(start_sec=min(w.start_sec for w in words),end_sec=max(w.end_sec for w in words),
                                      source="transcript",text=match.group()))
        return events
    return [FillerEvent(source="transcript",text=m.group()) for m in LanguageExtractor._FILLERS.finditer(transcript.text)]


def merge_evidence(audio_events: list[FillerEvent], text_events: list[FillerEvent]) -> list[FillerEvent]:
    events=[event.model_copy() for event in audio_events]
    for lexical in text_events:
        overlaps=[event for event in events if lexical.start_sec is not None and event.start_sec is not None
                  and min(event.end_sec,lexical.end_sec)>max(event.start_sec,lexical.start_sec)]
        if overlaps:
            event=overlaps[0]
            event.source="audio+transcript"
            event.text=lexical.text
        else: events.append(lexical)
    return sorted(events,key=lambda e: e.start_sec if e.start_sec is not None else float("inf"))


class FillerDetector:
    def detect(self, audio_path: str, transcript: Transcript) -> tuple[list[FillerEvent], dict]:
        text_events=lexical_events(transcript)
        metadata={**POLICY,"inference":"cpu_dynamic_int8_linears","lexical_count":len(text_events),"rate_unit":"events_per_100_recognized_words",
                  "warnings": [] if transcript.language in POLICY["validated_languages"] else ["cross_language_filler_accuracy_unvalidated"]}
        try:
            from faster_whisper.audio import decode_audio
            samples=decode_audio(audio_path,sampling_rate=POLICY["sample_rate"])
            if len(samples)==0: raise ValueError("No audio samples")
            duration=len(samples)/POLICY["sample_rate"]
            metadata["duration_sec"]=duration
            # Exact digital silence has no vocal filler; do not normalize it into noise.
            if not np.any(samples): return text_events,{**metadata,"status":"complete","audio_count":0}
            processor, model=load_model()
            import torch
            sums=np.zeros(int(np.ceil(duration/POLICY["frame_sec"])),dtype=np.float64)
            counts=np.zeros_like(sums)
            window=int(POLICY["window_sec"]*POLICY["sample_rate"])
            hop=int(POLICY["hop_sec"]*POLICY["sample_rate"])
            with _inference_lock, torch.inference_mode():
                for start in range(0,len(samples),hop):
                    chunk=samples[start:start+window]
                    inputs=processor(chunk,sampling_rate=POLICY["sample_rate"],return_tensors="pt")
                    logits=model(**inputs).logits
                    if logits.ndim!=3 or logits.shape[-1]!=2: raise ValueError("Unexpected filler model output")
                    probabilities=torch.softmax(logits,dim=-1)[0,:,1].cpu().numpy()
                    offset=round(start/POLICY["sample_rate"]/POLICY["frame_sec"])
                    usable=min(len(probabilities),len(sums)-offset)
                    sums[offset:offset+usable]+=probabilities[:usable]
                    counts[offset:offset+usable]+=1
                    if start+window>=len(samples): break
            averaged=np.divide(sums,counts,out=np.zeros_like(sums),where=counts>0)
            audio_events=probabilities_to_events(averaged,duration)
            events=merge_evidence(audio_events,text_events)
            return events,{**metadata,"status":"complete","audio_count":len(audio_events)}
        except Exception:
            logger.exception("Waveform filler detection unavailable")
            return text_events,{**metadata,"status":"unavailable","reason":"Waveform filler detection could not run; transcript matches are only a lower bound."}

    def apply(self, acoustic, audio_path: str, transcript: Transcript):
        events,metadata=self.detect(audio_path,transcript)
        acoustic.lexical_filler_count=metadata["lexical_count"]
        acoustic.filler_events=events
        acoustic.filler_detection=metadata
        acoustic.filler_count=len(events) if metadata["status"]=="complete" else None
        denominator=len(lexical_words(transcript.text))
        acoustic.filler_rate=round(len(events)*100/denominator,2) if metadata["status"]=="complete" and denominator else None
        return acoustic
