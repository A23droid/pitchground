"""Choose opponent language from the latest spoken transcript, not session settings."""
import re


def argument_language(text: str, detected: str | None = None) -> str:
    hindi = bool(re.search(r"[\u0900-\u097f]", text))
    malayalam = bool(re.search(r"[\u0d00-\u0d7f]", text))
    latin = bool(re.search(r"[A-Za-z]", text))
    if (hindi and malayalam) or ((hindi or malayalam) and latin):
        return "Mixed"
    if hindi:
        return "Hindi"
    if malayalam:
        return "Malayalam"
    # Audio detection distinguishes romanized Indic speech from English.
    code = (detected or "").lower().split("-")[0]
    return {"hi": "Hindi", "hindi": "Hindi", "ml": "Malayalam", "malayalam": "Malayalam",
            "mixed": "Mixed"}.get(code, "English")


def matches_script(text: str, language: str, source: str = "") -> bool:
    if language == "Mixed":
        for script in (r"[\u0900-\u097f]", r"[\u0d00-\u0d7f]"):
            if re.search(script, source) and not re.search(script, text):
                return False
    if language == "Hindi":
        return bool(re.search(r"[\u0900-\u097f]", text))
    if language == "Malayalam":
        return bool(re.search(r"[\u0d00-\u0d7f]", text))
    return True
