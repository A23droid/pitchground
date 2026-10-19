from __future__ import annotations

from app.agents.llm_client import LLMError, settings_for
from app.ml.acoustic import AcousticExtractor
from app.ml.content import ContentEvaluator
from app.ml.language import LanguageExtractor
from app.ml.protocols import AttemptAnalyzerProtocol
from app.ml.scoring_policy import load_policy
from app.ml.types import AnalysisConfig, AttemptMedia, FusedDimensions, QualityFlags, SignalBundle, Transcript
from app.ml.vision import VisionExtractor
from app.ml.speech_quality import validate_transcript, SPEECH_PIPELINE_VERSION
from app.ml.fillers import FillerDetector


def weighted(values, weights):
    available=[(values[key],weight) for key,weight in weights.items() if values.get(key) is not None]
    total=sum(weight for _,weight in available)
    return round(sum(value*weight for value,weight in available)/total,3) if total else None


class RealAnalyzer(AttemptAnalyzerProtocol):
    def __init__(self):
        self.vision=VisionExtractor()
        self.acoustic=AcousticExtractor()
        self.language=LanguageExtractor()
        self.content=ContentEvaluator()

    def analyze_attempt(self,media:AttemptMedia,transcript:Transcript,config:AnalysisConfig)->SignalBundle:
        policy=load_policy()
        warnings=["heuristic_fusion_uncalibrated", "stress_model_not_calibrated"]
        language,_=self.language.extract(transcript,config.practice_language)
        acoustic,_=self.acoustic.extract(media.audio_path,transcript.text)
        if transcript.text.strip(): validate_transcript(transcript, acoustic.duration_sec)
        if transcript.text.strip():
            FillerDetector().apply(acoustic,media.audio_path,transcript)
            if acoustic.filler_detection.get("status")!="complete": warnings.append("waveform_filler_detection_unavailable")
            warnings.extend(acoustic.filler_detection.get("warnings",[]))
        filler_rate=acoustic.filler_rate
        visual=None
        if not config.skip_vision and media.video_path:
            self.vision.sample_fps=config.sample_fps
            visual,_=self.vision.extract(media.video_path)
            if visual is None: warnings.append("visual_measurements_unavailable")
        else: warnings.append("no_video")
        valid=bool(transcript.text.strip()) and acoustic.wpm>0 and acoustic.speech_duration_sec>0
        provenance=dict(source="recorded_media",scoring_policy=policy,answer_model=settings_for("answers").model,
                        speech_pipeline=SPEECH_PIPELINE_VERSION, transcription=transcript.provenance,
                        filler_detection=acoustic.filler_detection,
                        modalities={"audio":valid,"video":visual is not None})
        if not valid:
            return SignalBundle(attempt_id=media.attempt_id,transcript=transcript,acoustic=acoustic,
                language=language,visual=visual,fused=FusedDimensions(),
                quality=QualityFlags(audio_ok=False,video_ok=visual is not None,warnings=warnings+["no_usable_speech"]),provenance=provenance)
        content=self.content.validate_answer(transcript.text,config.question_prompt,config.question_key_points,config.reference_answer,transcript.language)
        if content is None:
            raise LLMError("invalid_response", "answers")
        fluency=weighted(dict(pace=min(1,acoustic.wpm/policy["pace_reference_wpm"]),
                             continuity=1-acoustic.pause_ratio,
                             fillers=max(0,1-filler_rate/policy["filler_reference_per_100_words"]) if filler_rate is not None else None),policy["fluency_weights"])
        # Retain only observed terms. Natural stillness and absent hands are not failures.
        composure=max(0,1-acoustic.energy_var/policy["energy_variability_reference"])
        presence=weighted(dict(camera_orientation=1-visual.gaze_away if visual and visual.gaze_away is not None else None,
                               head_orientation=1-visual.head_down if visual and visual.head_down is not None else None),policy["presence_weights"])
        content_values=[x for x in (content.correctness,content.relevance,content.coverage) if x is not None] if content else []
        fused=FusedDimensions(fluency=fluency,composure=composure,presence=presence,
            structure=content.structure if content else None,language_stability=language.primary_ratio,
            content=round(sum(content_values)/len(content_values),3) if content_values else None)
        return SignalBundle(attempt_id=media.attempt_id,transcript=transcript,acoustic=acoustic,
            language=language,visual=visual,content=content,fused=fused,provenance=provenance,
            quality=QualityFlags(audio_ok=True,video_ok=visual is not None,warnings=warnings))
