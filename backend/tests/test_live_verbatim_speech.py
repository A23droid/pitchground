import os
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

import time
from tests.test_live_e2e import BASE_URL, http_get, http_post, http_post_multipart


def run():
    print("=== LIVE VERBATIM SPEECH & FILLER INTEGRATION TEST ===")
    status, auth_data = http_post(f"{BASE_URL}/auth/demo", {})
    headers = {"Authorization": f"Bearer {auth_data['token']}"}

    status, session_data = http_post(
        f"{BASE_URL}/v1/sessions",
        {"mode": "interview", "topic": "Database Indexing", "difficulty": "Standard"},
        headers=headers,
    )
    session_id = session_data["id"]

    status, attempt_data = http_post(
        f"{BASE_URL}/v1/sessions/{session_id}/attempts",
        {"role": "baseline"},
        headers=headers,
    )
    attempt_id = attempt_data["id"]

    with open("test_spoken_fillers.wav", "rb") as f:
        wav_bytes = f.read()

    status, upload_data = http_post_multipart(
        f"{BASE_URL}/v1/sessions/{session_id}/attempts/{attempt_id}/media",
        "spoken_fillers.wav",
        wav_bytes,
        headers=headers,
    )
    print("Uploaded audio:", upload_data.get("audio_path"))

    http_post(
        f"{BASE_URL}/v1/sessions/{session_id}/attempts/{attempt_id}/complete",
        headers=headers,
    )

    info = {}
    for i in range(25):
        time.sleep(1.0)
        status, info = http_get(
            f"{BASE_URL}/v1/sessions/{session_id}/attempts/{attempt_id}",
            headers=headers,
        )
        st = info.get("analysis_status")
        print(f"Poll [{i+1}/25]: status = {st}")
        if st == "complete":
            break

    print("\n--- RESULTS ---")
    print("Status:          ", info.get("analysis_status"))
    print("Transcribed Text:", info.get("transcript"))
    print("Acoustic Metrics:", info.get("metrics", {}).get("acoustic"))
    print("Language Metrics:", info.get("metrics", {}).get("language"))
    print("Fused Dimensions:", info.get("metrics", {}).get("fused"))

    assert info.get("analysis_status") == "complete"
    assert info.get("transcript") is not None
    assert info.get("metrics") is not None
    print("\n[OK] VERBATIM SPEECH TEST PASSED!")


if __name__ == "__main__":
    run()
