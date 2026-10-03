from __future__ import annotations

from app.agents.llm_client import chat_json


def render_challenge(diagnosis: dict, bank_prompt: str, language: str = "en") -> dict:
    system = (
        "You create a short targeted interview challenge. Return JSON "
        "{prompt_text, training_spec} where training_spec has "
        "objective, pressure_level (0-2), difficulty, language, time_limit_sec, interruption, replay_condition."
    )
    user = f"Diagnosis={diagnosis}\nBank prompt={bank_prompt}\nLanguage={language}"
    out = chat_json(system, user)
    prompt = bank_prompt
    if diagnosis.get("condition") == "fluency_breakdown":
        prompt = f"You have 20 seconds. {bank_prompt}"
    training_spec = {
        "objective": diagnosis.get("condition", "fluency_breakdown"),
        "pressure_level": 2,
        "difficulty": "medium",
        "language": language,
        "audience": "peer",
        "time_limit_sec": 20,
        "interruption": False,
        "replay_condition": "isomorphic_prompt",
        "question_bank_id": "",
    }
    if out:
        if out.get("prompt_text"):
            prompt = str(out["prompt_text"])
        if isinstance(out.get("training_spec"), dict):
            training_spec.update({k: v for k, v in out["training_spec"].items() if k in training_spec})
            training_spec["time_limit_sec"] = training_spec.get("time_limit_sec") or 20
            if training_spec.get("interruption") not in (True, False):
                training_spec["interruption"] = False
    return {"prompt_text": prompt, "training_spec": training_spec}
