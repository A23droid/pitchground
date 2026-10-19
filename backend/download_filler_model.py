"""Download the pinned Apache-2.0 frame classifier, never any user recording."""
from huggingface_hub import snapshot_download
from app.ml.fillers import POLICY, model_directory

if __name__ == "__main__":
    snapshot_download(POLICY["model"],revision=POLICY["revision"],
        allow_patterns=["model.safetensors","config.json","preprocessor_config.json","README.md"],
        local_dir=str(model_directory()))
    print("Local waveform filled-pause model is ready.")
