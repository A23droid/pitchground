"""Sarvam provider boundary tests; generated WAVs exist only as test fixtures."""
import base64
import io
import wave
from unittest.mock import patch
import httpx
import pytest
from fastapi import HTTPException
from app.services.opponent_voice import synthesize


def audio():
    out = io.BytesIO()
    with wave.open(out, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(22050); w.writeframes(b'\x00\x00' * 2205)
    return base64.b64encode(out.getvalue()).decode()


@pytest.mark.parametrize('language,text,code', [('English','My argument','en-IN'),('Hindi','मेरा तर्क','hi-IN'),('Malayalam','എന്റെ വാദം','ml-IN'),('Mixed','मेरा argument','hi-IN')])
def test_real_contract(language,text,code):
    with patch('app.services.opponent_voice.config.SARVAM_API_KEY','test-only-key'), patch('app.services.opponent_voice.httpx.post', return_value=httpx.Response(200,json={'audios':[audio(),audio()]})) as post:
        raw=synthesize(text,language)
        with wave.open(io.BytesIO(raw)) as w: assert w.getnframes()==4410
        assert post.call_args.kwargs['json']['language_code']==code
        assert post.call_args.kwargs['json']['text']==text
        assert post.call_args.kwargs['headers']=={'api-subscription-key':'test-only-key'}


@pytest.mark.parametrize('status,expected',[(403,503),(429,429),(500,502)])
def test_safe_errors(status,expected):
    with patch('app.services.opponent_voice.config.SARVAM_API_KEY','test-only-key'),patch('app.services.opponent_voice.httpx.post',return_value=httpx.Response(status,text='secret upstream diagnostics')):
        with pytest.raises(HTTPException) as err: synthesize('Argument','English')
        assert err.value.status_code==expected
        assert 'secret' not in err.value.detail


def test_missing_key():
    with patch('app.services.opponent_voice.config.SARVAM_API_KEY',''),patch('app.services.opponent_voice.httpx.post') as post:
        with pytest.raises(HTTPException): synthesize('Argument','English')
        post.assert_not_called()


def test_invalid_audio():
    with patch('app.services.opponent_voice.config.SARVAM_API_KEY','test-only-key'),patch('app.services.opponent_voice.httpx.post',return_value=httpx.Response(200,json={'audios':['garbage']})):
        with pytest.raises(HTTPException) as err: synthesize('Argument','English')
        assert err.value.status_code==502
