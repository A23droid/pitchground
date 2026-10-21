"""Package an allowlisted worker build context. Never copy credentials or recordings."""
import argparse
import hashlib
import json
import zipfile
from pathlib import Path


def package(destination: Path):
    root = Path(__file__).resolve().parents[2]
    backend = root / "backend"
    files = [(path, path.relative_to(backend).as_posix()) for path in (backend / "app").rglob("*")
             if path.is_file() and path.suffix in (".py", ".json") and "__pycache__" not in path.parts]
    for name in ("Dockerfile.sagemaker", ".dockerignore", "requirements.txt", "download_vision_models.py",
                 "download_speech_model.py", "download_filler_model.py", "sagemaker_entrypoint.py"):
        files.append((backend / name, name))
    files.append((root / "deploy/sagemaker/buildspec.yml", "buildspec.yml"))
    destination.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(destination, "w", zipfile.ZIP_DEFLATED) as archive:
        for source, target in sorted(files):
            archive.write(source, target)
    # Verification includes the archive names, not file contents or environment values.
    with zipfile.ZipFile(destination) as archive:
        for name in archive.namelist():
            parts = Path(name).parts
            if parts[0] in ("data", "models") or any(part in (".env", ".git", ".venv", "__pycache__") for part in parts):
                raise RuntimeError("Unexpected sensitive path in build archive")
    return {"archive": str(destination.resolve()), "files": len(files), "bytes": destination.stat().st_size,
            "sha256": hashlib.sha256(destination.read_bytes()).hexdigest()}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    print(json.dumps(package(parser.parse_args().output), indent=2))
