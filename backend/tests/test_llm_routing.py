"""Role isolation and provider failure semantics, using explicit HTTP test doubles."""
import json
from unittest.mock import patch
import httpx
import pytest
from app.agents import llm_client as llm

@pytest.fixture(autouse=True)
def no_cooldown():
    llm._cooldowns.clear()
    yield
    llm._cooldowns.clear()


def test_independent_credentials_and_models(monkeypatch):
    monkeypatch.setenv("GROQ_QUESTIONS_API_KEY","test-question-key")
    monkeypatch.setenv("GROQ_ANSWERS_API_KEY","test-answer-key")
    monkeypatch.setenv("GROQ_ANSWERS_MODEL","test-answer-model")
    assert llm.settings_for("questions").api_key=="test-question-key"
    assert llm.settings_for("answers").api_key=="test-answer-key"
    assert llm.settings_for("answers").model=="test-answer-model"
    assert llm.settings_for("questions").base_url=="https://api.groq.com/openai/v1"


def test_missing_credential_fails_explicitly():
    cfg=llm.LLMSettings("","https://api.example.invalid/v1","test",1,128)
    with patch.object(llm,"settings_for",return_value=cfg),pytest.raises(llm.LLMError) as error:
        llm.chat_json("system","user",role="answers")
    assert error.value.code=="not_configured"


def test_rate_limit_respects_wait_without_key_rotation():
    cfg=llm.LLMSettings("test-only-key","https://api.example.invalid/v1","test",1,128)
    response=httpx.Response(429,headers={"retry-after":"12"})
    with patch.object(llm,"settings_for",return_value=cfg),patch.object(llm.httpx,"post",return_value=response) as request:
        with pytest.raises(llm.LLMError) as error:llm.chat_json("s","u",role="questions")
        assert error.value.retry_after==12
        with pytest.raises(llm.LLMError):llm.chat_json("s","u",role="answers")
        assert request.call_count==1


def test_rejected_credential_does_not_try_a_different_key():
    cfg=llm.LLMSettings("test-only-key","https://api.example.invalid/v1","test",1,128)
    with patch.object(llm,"settings_for",return_value=cfg),patch.object(llm.httpx,"post",return_value=httpx.Response(401,text="sensitive-provider-message")) as request:
        with pytest.raises(llm.LLMError) as error:llm.chat_json("s","u",role="answers")
        assert error.value.code=="credentials_rejected"
        assert "sensitive" not in str(error.value)
        assert request.call_count==1


def test_transient_retry_uses_same_configured_credential():
    cfg=llm.LLMSettings("test-only-key","https://api.example.invalid/v1","test",1,128)
    responses=[httpx.Response(503),httpx.Response(200,json={"choices":[{"message":{"content":json.dumps({"result":"reviewed"})}}]})]
    with patch.object(llm,"settings_for",return_value=cfg),patch.object(llm.time,"sleep"),patch.object(llm.httpx,"post",side_effect=responses) as request:
        assert llm.chat_json("s","u",role="coaching")=={"result":"reviewed"}
        assert request.call_args_list[0].kwargs["headers"]==request.call_args_list[1].kwargs["headers"]


def test_malformed_json_does_not_generate_fallback_data():
    cfg=llm.LLMSettings("test-only-key","https://api.example.invalid/v1","test",1,128)
    with patch.object(llm,"settings_for",return_value=cfg),patch.object(llm.httpx,"post",return_value=httpx.Response(200,json={"choices":[{"message":{"content":"not json"}}]})):
        with pytest.raises(llm.LLMError) as error:llm.chat_json("s","u")
        assert error.value.code=="invalid_response"
