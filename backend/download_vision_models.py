"""Download the official MediaPipe Tasks assets; run once before camera analysis."""
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parent / "models"
ASSETS = {
    "face": "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
    "pose": "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
    "hand": "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
}
if __name__ == "__main__":
    ROOT.mkdir(exist_ok=True)
    for name, url in ASSETS.items():
        target = ROOT / f"{name}_landmarker.task"
        if not target.exists():
            with urllib.request.urlopen(url, timeout=60) as response:
                data = response.read()
            target.write_bytes(data)
        print(name, target.stat().st_size, "bytes")
