"""Isolated decoder contract/measurement tests; fixtures are not accuracy benchmarks."""
from types import SimpleNamespace
from unittest.mock import Mock, patch
import pytest
from app.ml.types import Transcript, TranscriptWord
from app.ml.speech_quality import lexical_words, validate_transcript


def test_hindi_is_not_forced_to_english_and_decoder_preserves_original_times(tmp_path):
    from app.ml.local_transcriber import LocalWhisperTranscriber
    audio=tmp_path/'fixture.wav';audio.write_bytes(b'fixture-only'*100)
    words=[SimpleNamespace(word='नमस्ते',start=.4,end=.9,probability=.95),SimpleNamespace(word='दोस्तों',start=2,end=2.8,probability=.9)]
    segment=SimpleNamespace(text='नमस्ते दोस्तों',start=.4,end=2.8,words=words,avg_logprob=-.1,no_speech_prob=.01)
    model=Mock()
    model.transcribe.return_value=(iter([segment]),SimpleNamespace(language='hi',language_probability=.99,duration=3,duration_after_vad=2))
    with patch('app.ml.local_transcriber.get_whisper_model',return_value=model):
        transcript=LocalWhisperTranscriber('small').transcribe(str(audio),language_hint='en')
    options=model.transcribe.call_args.kwargs
    assert options['language'] is None
    assert options['task']=='transcribe'
    assert options['condition_on_previous_text'] is False
    assert options['vad_filter'] is True
    assert options['initial_prompt'] is None
    assert transcript.language=='hi'
    assert transcript.text=='नमस्ते दोस्तों'
    assert transcript.words[1].start_sec-transcript.words[0].end_sec==1.1
    assert transcript.provenance['language_probability']==.99


def test_repetition_loop_is_rejected_but_real_short_repetitions_are_preserved():
    with pytest.raises(ValueError,match='repetition loop'):
        validate_transcript(Transcript(text='Food, '*100),23.399)
    with pytest.raises(ValueError,match='repetition loop'):
        validate_transcript(Transcript(text='thank you '*20),23.399)
    transcript=Transcript(text='मैं मैं मैं अपनी बात फिर से कहता हूँ उम मतलब')
    validate_transcript(transcript,10)
    assert transcript.text.startswith('मैं मैं मैं')
    assert lexical_words('मैं ठीक हूँ। ...')==['मैं','ठीक','हूँ।']


def test_wpm_includes_pauses_instead_of_dividing_by_short_voiced_intervals(tmp_path):
    import numpy as np
    import soundfile as sf
    from app.ml.acoustic import AcousticExtractor
    path=tmp_path/'fixture.wav'
    sf.write(path,np.ones(16000*30,dtype=np.float32)*.01,16000)
    with patch('faster_whisper.vad.get_speech_timestamps',return_value=[dict(start=16000*5,end=16000*15)]):
        acoustic,_=AcousticExtractor().extract(str(path),' '.join('word'+str(i) for i in range(60)))
    assert acoustic.wpm==120
    assert acoustic.articulation_wpm==360
    assert acoustic.duration_sec==30
    assert acoustic.speech_duration_sec==10
    assert acoustic.word_count==60


def test_bad_alignment_and_excessive_recognized_word_count_are_not_scored():
    with pytest.raises(ValueError,match='duration'):
        validate_transcript(Transcript(text=' '.join('word'+str(i) for i in range(100))),1)
    with pytest.raises(ValueError,match='timing'):
        validate_transcript(Transcript(text='valid words',words=[TranscriptWord(word=str(i),start_sec=0,end_sec=0) for i in range(12)]),5)


def test_known_hallucinated_historical_metrics_are_excluded():
    from app.ml.types import SignalBundle, AcousticSignals, LanguageSignals, FusedDimensions, QualityFlags
    from app.services.verified_metrics import verified_bundle
    bundle=SignalBundle(attempt_id='fixture',transcript=Transcript(text='food, '*100),acoustic=AcousticSignals(wpm=1092,duration_sec=23.399,speech_duration_sec=6.375),language=LanguageSignals(),fused=FusedDimensions(fluency=.75),quality=QualityFlags(audio_ok=True),provenance={'source':'recorded_media'})
    assert verified_bundle(SimpleNamespace(signal_bundle_json=bundle.model_dump_json())) is None


def test_model_cache_changes_when_requested_model_changes(monkeypatch):
    from app.ml import local_transcriber
    monkeypatch.setattr(local_transcriber,'_MODEL_INSTANCE',None)
    monkeypatch.setattr(local_transcriber,'_MODEL_KEY',None)
    with patch('faster_whisper.WhisperModel') as constructor:
        first=local_transcriber.get_whisper_model('small')
        assert local_transcriber.get_whisper_model('small') is first
        local_transcriber.get_whisper_model('medium')
        assert constructor.call_count==2
        assert constructor.call_args.args[0]=='medium'


def test_unreliable_transcript_never_reaches_answer_review():
    from app.ml.real_analyzer import RealAnalyzer
    from app.ml.types import AcousticSignals, AttemptMedia, AnalysisConfig
    from app.ml.language import LanguageExtractor
    analyzer=RealAnalyzer.__new__(RealAnalyzer)
    analyzer.acoustic=SimpleNamespace(extract=Mock(return_value=(AcousticSignals(wpm=1092,duration_sec=23.399,speech_duration_sec=6.375),None)))
    analyzer.language=LanguageExtractor()
    analyzer.content=Mock()
    analyzer.vision=Mock()
    with pytest.raises(ValueError,match='repetition loop'):
        analyzer.analyze_attempt(AttemptMedia(attempt_id='fixture',audio_path='fixture.wav'),Transcript(text='food, '*100),AnalysisConfig())
    analyzer.content.validate_answer.assert_not_called()


def test_english_only_models_cannot_be_used_for_multilingual_practice():
    from app.ml.local_transcriber import LocalWhisperTranscriber
    with pytest.raises(ValueError,match='multilingual'):
        LocalWhisperTranscriber('small.en')
