from __future__ import annotations

from app.agents.llm_client import chat_json


def render_prompt(bank_prompt: str, language: str = "en", role: str = "baseline") -> dict:
    system = "You rewrite interview prompts. Return JSON {prompt_text, language, expected_duration_sec}."
    user = (
        f"Role={role}. Language={language}. Bank prompt:\n{bank_prompt}\n"
        "Keep the technical intent. Be concise."
    )
    out = chat_json(system, user)
    if out and out.get("prompt_text"):
        return {
            "prompt_text": str(out["prompt_text"]),
            "language": language,
            "expected_duration_sec": int(out.get("expected_duration_sec") or (20 if role != "baseline" else 90)),
            "question_bank_id": "",
        }
    return {
        "prompt_text": bank_prompt,
        "language": language,
        "expected_duration_sec": 20 if role != "baseline" else 90,
        "question_bank_id": "",
    }
