"""Download/initialize the configured multilingual speech model without any user audio."""
from app.ml.factory import get_transcriber
from app.ml.local_transcriber import get_whisper_model

if __name__ == "__main__":
    transcriber = get_transcriber()
    get_whisper_model(transcriber.model_size)
    print(f"Local multilingual speech model ready: {transcriber.model_size}")
