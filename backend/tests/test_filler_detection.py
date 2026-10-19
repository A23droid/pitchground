"""Signal grouping/integration fixtures; not claims about model accuracy on people."""
from unittest.mock import patch
import numpy as np
from app.ml.fillers import FillerDetector, lexical_events, merge_evidence, probabilities_to_events
from app.ml.types import AcousticSignals, FillerEvent, Transcript, TranscriptWord


def test_silence_and_word_gaps_alone_do_not_create_fillers():
    assert probabilities_to_events(np.zeros(100),2)==[]
    transcript=Transcript(text='a clear answer',words=[TranscriptWord(word='a',start_sec=0,end_sec=.1),TranscriptWord(word='clear',start_sec=2,end_sec=2.5),TranscriptWord(word='answer',start_sec=4,end_sec=5)])
    assert lexical_events(transcript)==[]
    # User-supplied spelling never becomes a regex shortcut for missing acoustic evidence.
    assert lexical_events(Transcript(text='aaa aaa'))==[]


def test_one_vocal_event_is_counted_once_instead_of_once_per_positive_frame():
    frames=np.r_[np.zeros(20),np.ones(20)*.9,np.zeros(20)]
    events=probabilities_to_events(frames,1.2)
    assert len(events)==1
    assert events[0].start_sec==.4
    assert events[0].end_sec==.8
    assert events[0].confidence==.9
    assert events[0].text is None


def test_separate_vocal_events_are_kept_and_brief_prediction_flicker_is_merged():
    assert len(probabilities_to_events(np.r_[np.zeros(10),np.ones(10)*.9,np.zeros(20),np.ones(10)*.9,np.zeros(10)],1.2))==2
    assert len(probabilities_to_events(np.r_[np.zeros(10),np.ones(10)*.9,np.zeros(2),np.ones(10)*.9,np.zeros(10)],1))==1
    assert probabilities_to_events(np.r_[np.zeros(10),.9,np.zeros(10)],1)==[]


def test_transcribed_and_audio_filler_evidence_is_not_double_counted():
    acoustic=[FillerEvent(start_sec=1,end_sec=1.8,confidence=.91,source='audio')]
    lexical=[FillerEvent(start_sec=1.1,end_sec=1.5,source='transcript',text='um')]
    events=merge_evidence(acoustic,lexical)
    assert len(events)==1
    assert events[0].source=='audio+transcript'
    assert events[0].text=='um'
    assert events[0].confidence==.91


def test_unavailable_audio_detector_is_not_presented_as_zero():
    with patch('faster_whisper.audio.decode_audio',return_value=np.ones(16000,dtype=np.float32)),patch('app.ml.fillers.load_model',side_effect=RuntimeError('test-only missing model')):
        acoustic=FillerDetector().apply(AcousticSignals(),'fixture.wav',Transcript(text='a clear answer'))
    assert acoustic.filler_count is None
    assert acoustic.filler_rate is None
    assert acoustic.lexical_filler_count==0
    assert acoustic.filler_detection['status']=='unavailable'


def test_exact_silence_has_no_audio_fillers():
    with patch('faster_whisper.audio.decode_audio',return_value=np.zeros(16000,dtype=np.float32)),patch('app.ml.fillers.load_model') as model:
        acoustic=FillerDetector().apply(AcousticSignals(),'fixture.wav',Transcript(text=''))
    model.assert_not_called()
    assert acoustic.filler_count==0
    assert acoustic.filler_detection['status']=='complete'


def test_legacy_text_only_zero_cannot_be_compared_to_waveform_measurements():
    from app.ml.types import SignalBundle,LanguageSignals,FusedDimensions,QualityFlags
    from app.services.detector import detect
    from app.services.comparison import compare_attempts
    baseline=SignalBundle(attempt_id='before',transcript=Transcript(text='clear words'),acoustic=AcousticSignals(filler_rate=0),language=LanguageSignals(),fused=FusedDimensions(),quality=QualityFlags(audio_ok=True))
    observed=baseline.model_copy(deep=True)
    observed.attempt_id='after'
    observed.acoustic.filler_rate=20
    observed.acoustic.filler_detection={'status':'complete'}
    evidence,_=detect(baseline,observed)
    assert not any(event.metric=='acoustic.filler_rate' for event in evidence)
    assert not any(row['metric']=='acoustic.filler_rate' for row in compare_attempts(baseline,observed)['rows'])


def test_streamed_int8_loader_uses_checkpoint_values_and_restores_linear_class(tmp_path):
    import torch
    from torch import nn
    from safetensors.torch import save_file
    from app.ml.low_memory_frame_model import load_quantized_classifier
    # Resolve lazy Transformers exports before installing explicit test doubles.
    from transformers import Wav2Vec2BertConfig, Wav2Vec2BertForAudioFrameClassification

    class TinyClassifier(nn.Module):
        def __init__(self,config=None):
            super().__init__()
            self.normalizer=nn.LayerNorm(4)
            self.projection=nn.Linear(4,2)
        def forward(self,x): return self.projection(self.normalizer(x))

    # Explicit checkpoint fixture, isolated from the downloaded production model.
    reference=TinyClassifier().eval()
    with torch.no_grad():
        reference.normalizer.weight.copy_(torch.tensor([1.,2.,1.,2.]))
        reference.projection.weight.copy_(torch.tensor([[.1,.2,.3,.4],[.4,.3,.2,.1]]))
        reference.projection.bias.copy_(torch.tensor([.2,-.2]))
    save_file(reference.state_dict(),str(tmp_path/'model.safetensors'))
    original=nn.Linear
    with patch('transformers.Wav2Vec2BertConfig.from_pretrained',return_value=None),patch('transformers.Wav2Vec2BertForAudioFrameClassification',TinyClassifier):
        loaded=load_quantized_classifier(tmp_path)
    assert nn.Linear is original
    assert isinstance(loaded.projection,torch.ao.nn.quantized.dynamic.Linear)
    samples=torch.tensor([[1.,2.,3.,4.],[-2.,1.,0.,3.]])
    assert torch.allclose(loaded(samples),reference(samples),atol=.03)
    assert torch.equal(loaded.normalizer.weight,reference.normalizer.weight)
