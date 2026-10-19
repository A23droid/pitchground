"""Only recorded-media results with provenance may contribute learner statistics."""
from app.ml.types import SignalBundle
from app.ml.speech_quality import validate_transcript

def verified_bundle(metrics):
    if not metrics: return None
    try: bundle=SignalBundle.model_validate_json(metrics.signal_bundle_json)
    except ValueError: return None
    if not bundle.quality.audio_ok or bundle.provenance.get("source")!="recorded_media": return None
    if not bundle.transcript.text.strip() or bundle.acoustic.duration_sec<=0 or bundle.acoustic.speech_duration_sec<=0 or bundle.acoustic.wpm<=0 or bundle.fused.fluency is None: return None
    try: validate_transcript(bundle.transcript, bundle.acoustic.duration_sec)
    except ValueError: return None
    return bundle

def verified_attempts(attempts):
    return [(a,b) for a in attempts if a.analysis_status=="complete" and (b:=verified_bundle(a.metrics)) is not None]
