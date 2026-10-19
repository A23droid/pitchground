# Pitchground backend

FastAPI monolith: Google JWT auth, interview orchestration, Sarvam STT, stub/real ML, diagnosis agents.

**Database / media:** SQLite+local disk by default, or **Nhost Postgres + Storage** when configured. See [../docs/NHOST_SETUP.md](../docs/NHOST_SETUP.md).

## Run locally

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill keys + optional Nhost vars
alembic upgrade head   # creates tables (SQLite or Postgres)
uvicorn app.main:app --reload --port 8000
```

Google Cloud redirect URI:

```text
http://localhost:8000/auth/google/callback
```

Also keep `http://localhost:3000` as an authorized JavaScript origin.

## Demo without Google

`POST /auth/demo` when `DEMO_AUTH=1`.

## ML Engine (`app/ml`)

Set `ML_ANALYZER=real` in `.env` to run the multimodal ML models locally:
- **Speech-to-Text:** Local `faster-whisper` (CPU int8) preserving disfluencies (*"um"*, *"uh"*, *"matlab"*, *"like"*).
- **Acoustic Prosody:** `librosa` extracting speaking rate (WPM), pause ratio, and pitch variance.
- **Computer Vision:** `mediapipe` (Face Mesh + Pose) extracting eye contact, head posture, gestures, and camera stress score.
- **Content:** Key-point semantic coverage & specificity evaluation.

For low-resource environments without local ML packages, set `ML_ANALYZER=stub`.

See [docs/ML_ARCHITECTURE_AND_SPECIFICATION.md](../docs/ML_ARCHITECTURE_AND_SPECIFICATION.md) and [docs/ML_IMPLEMENTATION_AND_DEVELOPER_GUIDE.md](../docs/ML_IMPLEMENTATION_AND_DEVELOPER_GUIDE.md) for full contracts.

### ML Test Suite
```bash
python tests/test_local_ml.py         # Unit tests (waveform + frame synthesis)
python tests/test_phase2_stt.py        # Verbatim STT + filler detection tests
python tests/test_phase2_api.py        # Factory & RealAnalyzer integration tests
python tests/test_live_verbatim_speech.py  # Live REST API end-to-end test
```

## Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | liveness |
| GET | `/auth/google` | start Google sign-in |
| GET | `/auth/google/callback` | Google OAuth callback |
| POST | `/auth/demo` | demo JWT |
| GET | `/auth/me` | current user + learner |
| POST | `/v1/sessions` | start interview / session |
| POST | `/v1/sessions/{id}/advance` | phase lockstep |
| POST | `/v1/sessions/{id}/complete` | complete session |
| POST | `/v1/sessions/{id}/attempts/.../media` | upload audio/video |
| POST | `/v1/sessions/{id}/attempts/.../complete` | queue analysis |
| WS | `/v1/sessions/{id}/ws` | live events |

## Deploy

[../docs/DEPLOY.md](../docs/DEPLOY.md)
