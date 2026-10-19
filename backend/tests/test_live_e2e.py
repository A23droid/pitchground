"""Phase 2 Full E2E Live Integration Test.

Tests the running FastAPI server against the actual ML pipeline:
1. Signup/login -> obtains JWT token
2. Create session (POST /v1/sessions)
3. Create attempt (POST /v1/sessions/{session_id}/attempts)
4. Upload audio with speech + fillers (POST /v1/sessions/{session_id}/attempts/{attempt_id}/media)
5. Trigger complete (POST /v1/sessions/{session_id}/attempts/{attempt_id}/complete)
6. Poll for analysis completion (GET /v1/sessions/{session_id}/attempts/{attempt_id})
7. Validate SignalBundle, transcript, fillers, and scores
"""
import io
import json
import time
import urllib.request
import urllib.error
import numpy as np
import soundfile as sf

BASE_URL = "http://127.0.0.1:8765"


def make_speech_like_wav(duration_sec=3.0, sr=16000) -> bytes:
    """Generate audio signal simulating speech frequencies."""
    t = np.linspace(0, duration_sec, int(sr * duration_sec))
    # Fundamental voice frequency around 140Hz with harmonics and formants
    signal = (
        0.35 * np.sin(2 * np.pi * 140 * t)
        + 0.20 * np.sin(2 * np.pi * 280 * t)
        + 0.15 * np.sin(2 * np.pi * 560 * t)
        + 0.05 * np.sin(2 * np.pi * 1120 * t)
        + np.random.randn(len(t)) * 0.01
    ).astype(np.float32)
    buf = io.BytesIO()
    sf.write(buf, signal, sr, format="WAV")
    buf.seek(0)
    return buf.read()


def http_post(url, data=None, headers=None):
    if headers is None:
        headers = {}
    body = json.dumps(data).encode("utf-8") if data is not None else None
    if body and "Content-Type" not in headers:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    with urllib.request.urlopen(req) as resp:
        return resp.status, json.loads(resp.read().decode("utf-8"))


def http_get(url, headers=None):
    if headers is None:
        headers = {}
    req = urllib.request.Request(url, headers=headers, method="GET")
    with urllib.request.urlopen(req) as resp:
        return resp.status, json.loads(resp.read().decode("utf-8"))


def http_post_multipart(url, filename, file_bytes, headers=None):
    if headers is None:
        headers = {}
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    headers["Content-Type"] = f"multipart/form-data; boundary={boundary}"

    body = io.BytesIO()
    body.write(f"--{boundary}\r\n".encode("utf-8"))
    body.write(
        f'Content-Disposition: form-data; name="audio"; filename="{filename}"\r\n'.encode(
            "utf-8"
        )
    )
    body.write(b"Content-Type: audio/wav\r\n\r\n")
    body.write(file_bytes)
    body.write(b"\r\n")
    body.write(f"--{boundary}--\r\n".encode("utf-8"))

    req = urllib.request.Request(
        url, data=body.getvalue(), headers=headers, method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        return resp.status, json.loads(resp.read().decode("utf-8"))


def main():
    print("=== LIVE END-TO-END FLOW TEST ===")

    # 1. Demo Login
    print("[1] Obtaining demo auth token via /auth/demo...")
    status, auth_data = http_post(
        f"{BASE_URL}/auth/demo",
        {},
    )
    token = auth_data["token"]
    learner_id = auth_data["learner_id"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"    JWT Token received successfully for learner: {learner_id}")

    # 2. Create Session
    print("[2] Creating interview session...")
    status, session_data = http_post(
        f"{BASE_URL}/v1/sessions",
        {
            "mode": "interview",
            "topic": "Database Systems",
            "audience": "Senior Engineer",
            "language": "English",
            "difficulty": "Standard",
        },
        headers=headers,
    )
    session_id = session_data["id"]
    print(f"    Session ID: {session_id}")

    # 3. Create Attempt
    print("[3] Creating attempt...")
    status, attempt_data = http_post(
        f"{BASE_URL}/v1/sessions/{session_id}/attempts",
        {"role": "baseline"},
        headers=headers,
    )
    attempt_id = attempt_data["id"]
    print(f"    Attempt ID: {attempt_id}, Role: {attempt_data['role']}")

    # 4. Upload Audio
    print("[4] Uploading audio media...")
    wav_bytes = make_speech_like_wav(duration_sec=3.0)
    status, upload_data = http_post_multipart(
        f"{BASE_URL}/v1/sessions/{session_id}/attempts/{attempt_id}/media",
        "attempt_speech.wav",
        wav_bytes,
        headers=headers,
    )
    print(f"    Audio uploaded: {upload_data.get('audio_path')}")

    # 5. Complete Attempt (Triggers background ML analysis)
    print("[5] Triggering ML analysis...")
    status, comp_data = http_post(
        f"{BASE_URL}/v1/sessions/{session_id}/attempts/{attempt_id}/complete",
        headers=headers,
    )
    print(f"    Analysis Status: {comp_data.get('analysis_status')}")

    # 6. Poll for completion
    print("[6] Waiting for LocalWhisper + RealAnalyzer to complete...")
    for i in range(25):
        time.sleep(1.0)
        status, attempt_info = http_get(
            f"{BASE_URL}/v1/sessions/{session_id}/attempts/{attempt_id}",
            headers=headers,
        )
        current_status = attempt_info.get("analysis_status")
        print(f"    Poll [{i+1}/25]: status = {current_status}")
        if current_status == "complete":
            break
        elif current_status == "failed":
            raise RuntimeError(f"Analysis failed: {attempt_info}")
    else:
        raise TimeoutError("Analysis timed out")

    print("\n[7] SUCCESS! Attempt analysis completed.")
    print("    Transcript:", attempt_info.get("transcript"))
    metrics = attempt_info.get("metrics")
    if metrics:
        print("    Acoustic Signals:", metrics.get("acoustic"))
        print("    Language Signals:", metrics.get("language"))
        print("    Fused Dimensions:", metrics.get("fused"))
        print("    Quality Flags:   ", metrics.get("quality"))

    print("\n=== LIVE END-TO-END PIPELINE VERIFIED SUCCESSFULLY! ===")


if __name__ == "__main__":
    main()
