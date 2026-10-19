"""Server-side Sarvam synthesis. Credentials and provider errors never reach the browser."""
import base64
import binascii
import io
import os
import wave

import httpx
from fastapi import HTTPException

from app import config


def synthesize(text: str, language: str) -> bytes:
    if not config.SARVAM_API_KEY:
        raise HTTPException(503, "Opponent voice is not configured. Add SARVAM_API_KEY to the backend environment.")
    code = {"English": "en-IN", "Hindi": "hi-IN", "Malayalam": "ml-IN"}.get(language)
    if not code:
        code = "ml-IN" if any("\u0d00" <= c <= "\u0d7f" for c in text) else "hi-IN" if any("\u0900" <= c <= "\u097f" for c in text) else "en-IN"
    payload = {"text": text, "language_code": code,
               "model": os.getenv("SARVAM_TTS_MODEL", "bulbul:v3"),
               "output_audio_codec": "wav", "speech_sample_rate": 22050}
    speaker = os.getenv("SARVAM_TTS_SPEAKER", "").strip()
    if speaker:
        payload["speaker"] = speaker
    try:
        response = httpx.post("https://api.sarvam.ai/text-to-speech", json=payload,
                              headers={"api-subscription-key": config.SARVAM_API_KEY}, timeout=60)
    except httpx.RequestError:
        raise HTTPException(503, "Sarvam voice service could not be reached. Retry voice playback.") from None
    if response.status_code in (401, 403):
        raise HTTPException(503, "Sarvam rejected the voice credentials. Check the backend key and account access.")
    if response.status_code == 429:
        raise HTTPException(429, "Sarvam voice limit reached. Please retry shortly.")
    if not response.is_success:
        raise HTTPException(502, "Sarvam could not generate this voice. Check the configured model and speaker.")
    try:
        audios = response.json()["audios"]
        if not isinstance(audios, list) or not 1 <= len(audios) <= 8:
            raise ValueError("Invalid audio response")
        output = io.BytesIO()
        params = None
        with wave.open(output, "wb") as writer:
            for audio in audios:
                raw = base64.b64decode(audio, validate=True)
                if len(raw) > 20_000_000:
                    raise ValueError("Audio too large")
                with wave.open(io.BytesIO(raw), "rb") as reader:
                    current = (reader.getnchannels(), reader.getsampwidth(), reader.getframerate())
                    if reader.getnframes() == 0 or (params and current != params):
                        raise ValueError("Invalid WAV")
                    if params is None:
                        params = current
                        writer.setnchannels(current[0]); writer.setsampwidth(current[1]); writer.setframerate(current[2])
                    writer.writeframes(reader.readframes(reader.getnframes()))
        return output.getvalue()
    except (KeyError, TypeError, ValueError, binascii.Error, wave.Error, EOFError):
        raise HTTPException(502, "Sarvam returned unusable audio. Retry voice playback.") from None
