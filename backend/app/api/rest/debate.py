from __future__ import annotations

import logging
from typing import Any
from fastapi import APIRouter
from pydantic import BaseModel

from app.agents.llm_client import chat_json

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/debate", tags=["debate"])


class DebateCounterRequest(BaseModel):
    topic: str
    user_position: str = "For"
    language: str = "English"
    difficulty: str = "Standard"
    user_transcript: str = ""
    turn: int = 1


def _dynamic_fallback_counter(topic: str, user_pos: str, language: str, user_text: str, turn: int) -> str:
    lang = (language or "").lower()
    is_for = "for" in user_pos.lower()
    opp_stance = "Against" if is_for else "For"

    if "malayalam" in lang:
        if turn == 1:
            return f"{topic}-ന്റെ കാര്യത്തിൽ {user_pos} നിലപാട് പ്രായോഗികമായി വലിയ വെല്ലുവിളികൾ ഉണ്ടാക്കും. സിസ്റ്റം സ്കെയിൽ ചെയ്യുമ്പോൾ ഉണ്ടാകുന്ന operational complexity-യും maintenance overhead-ഉം നിങ്ങൾ കണക്കിലെടുത്തിട്ടുണ്ടോ?"
        return "നിങ്ങൾ പറഞ്ഞ വാദം താത്കാലികമായി ശരിയാണെന്ന് തോന്നാമെങ്കിലും, production environment-ൽ latency-യും security trade-offs-ഉം കാരണം ഈ സമീപനം പൂർണ്ണമായും പരാജയപ്പെടാൻ സാധ്യതയുണ്ട്."
    elif "hindi" in lang:
        if turn == 1:
            return f"Aapka {user_pos} argument theoretical lagta hai. Jab system real-world peak traffic handle karta hai, toh architecture mein major bottlenecks create ho jate hain jinko aapne address nahi kiya."
        return "Is approach mein hidden operational costs aur maintenance complexity bohot zyada hai. Long-term reliability ke point of view se yeh architectural risk create karta hai."
    elif "mixed" in lang:
        if turn == 1:
            return f"While the {user_pos} premise sounds compelling on paper, in mission-critical environments the trade-off overhead becomes unmanageable. How do you mitigate the cascade failures when volume surges?"
        return "That counter-defense overlooks fundamental system boundaries. Over-optimizing for speed here will introduce technical debt that requires complete refactoring down the road."
    else:
        if turn == 1:
            return f"While advocating {user_pos} for '{topic}' is a popular theoretical perspective, it overlooks critical operational realities. When unexpected edge cases and peak throughput collide, the hidden systemic latency and architectural overhead make this position fundamentally fragile."
        return f"Your rebuttal attempts to soften the compromise, but it sidesteps the core architectural trade-off. Without concrete isolation boundaries and guaranteed SLAs, this stance inevitably exposes the entire infrastructure to cascading failures."


@router.post("/counter")
def generate_counter(body: DebateCounterRequest) -> dict[str, str]:
    opp_pos = "Against" if "for" in body.user_position.lower() else "For"
    system_prompt = (
        "You are an adversarial, hyper-articulate debate sparring partner in a high-stakes technical debate arena. "
        "Your role is to directly dismantle the user's premise with razor-sharp reasoning, identifying real-world failure modes, "
        "economic trade-offs, and architectural vulnerabilities. "
        "Keep your response concise: exactly 2 to 3 punchy, assertive sentences without fluff. "
        "Always respond in JSON with the exact key 'counter_argument'."
    )
    user_prompt = (
        f"Debate Topic: {body.topic}\n"
        f"User Position: {body.user_position} | Your Counter Position: {opp_pos}\n"
        f"Debate Turn: {body.turn} (1 = opening response, 2 = rebuttal counter)\n"
        f"Difficulty: {body.difficulty}\n"
        f"Target Language: {body.language}\n"
        f"User's Spoken Argument: \"{body.user_transcript or 'No specific points stated.'}\"\n"
        f"Task: Directly attack their specific points, exposing unaddressed risks or flawed assumptions. "
        f"If the language is Malayalam, reply in natural Malayalam or Manglish. If Hindi, in natural Hindi/Hinglish. If English, in professional technical English."
    )

    try:
        res = chat_json(system_prompt, user_prompt)
        if res and isinstance(res, dict) and res.get("counter_argument"):
            return {"counter_argument": str(res["counter_argument"]).strip()}
    except Exception as exc:
        logger.warning("LLM debate counter generation failed: %s", exc)

    fallback = _dynamic_fallback_counter(
        body.topic,
        body.user_position,
        body.language,
        body.user_transcript,
        body.turn,
    )
    return {"counter_argument": fallback}
