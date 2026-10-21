# Pitchground backend

FastAPI backend: verified JWT/Google sign-in, five practice modes, local Faster-Whisper STT, MediaPipe vision, Groq questions, answer review and coaching.

**Render 512 MB + AWS SageMaker:** follow [SAGEMAKER_DEPLOY.md](../docs/SAGEMAKER_DEPLOY.md). Install `requirements-api.txt` on Render and run the full model container on SageMaker. Local development still uses `requirements.txt` and `ML_EXECUTION_MODE=local`.

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

`POST /auth/demo` when `DEMO_AUTH=1` creates a separate guest identity per request. Guests do not share practice history.

## ML Engine (`app/ml`)

Set `ML_ANALYZER=real` in `.env` to run the multimodal ML models locally:
- **Speech-to-Text:** Local multilingual `faster-whisper` small (CPU int8) preserving disfluencies (*"um"*, *"uh"*, *"matlab"*, *"like"*).
- **Acoustic Prosody:** `librosa` extracting speaking rate (WPM), pause ratio, and pitch variance.
- **Computer Vision:** MediaPipe Tasks face/iris, pose and hand landmarks measure camera orientation, head position and movement. Stress remains unavailable until calibrated.
- **Content:** Key-point semantic coverage & specificity evaluation.

Production has no stub fallback; install the local ML dependencies. Missing modalities are explicitly unavailable.

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


## Current product setup and checks

See [the implementation checklist](../docs/IMPROVEMENT_CHECKLIST.md) for the audit and remaining work. The runtime uses local Faster-Whisper for STT, MediaPipe Tasks for vision and the configured OpenAI-compatible Groq endpoint for question generation and answer review.

From `backend` on Windows:

```powershell
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe download_vision_models.py
.venv\Scripts\python.exe download_speech_model.py
.venv\Scripts\python.exe download_filler_model.py
.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

Configure `JWT_SECRET`, `DATABASE_URL`, `FRONTEND_URL`, `BACKEND_URL`, `CORS_ORIGINS`, `GROQ_API_KEY`, `GROQ_BASE_URL`, `GROQ_MODEL` and storage settings in `backend/.env`. Existing `OPENAI_*` settings remain compatible. See [Groq setup](../docs/GROQ_SETUP.md) for optional separate question, answer, coaching and debate credentials. The frontend's `NEXT_PUBLIC_API_URL` must point to this backend. API keys never belong in public frontend environment variables.

A configured cloud database failure now stays visible; it no longer silently switches account data to SQLite. To deliberately use local development storage, configure an explicit SQLite `DATABASE_URL` and `STORAGE_BACKEND=local`.

The isolated suite creates its own temporary database and does not log into the user's real account:

```powershell
.venv\Scripts\python.exe -m pytest tests/test_product_integrity.py tests/test_llm_routing.py tests/test_stub_analyzer_schema.py -q -p no:cacheprovider
```

Vision model files are downloaded into `backend/models/` and excluded from Git. Missing/occluded camera subjects return unavailable visual measurements. Fusion thresholds require calibration on real recordings; no psychological stress score is generated. STT settings preserve observed disfluencies and timestamps but cannot guarantee perfect filler recall. Apply `alembic upgrade head` when updating an existing deployment; migration 003 widens the topic column without deleting session rows.

### Hindi recognition and pace correction

`WHISPER_MODEL=small` now selects the installed multilingual local model. `WHISPER_CPU_THREADS=4` controls CPU use. Run `python download_speech_model.py` after choosing a different multilingual model; `.en` models are rejected. Practice language is a learning target; STT detects the actual language from audio and explicitly uses transcription rather than translation. Speech filtering preserves original timestamp offsets. Decoder conditioning is disabled to reduce repetition cascades.

WPM uses the entire recording duration, including pauses. `articulation_wpm` separately uses detected voiced time. Failed repetition/alignment/confidence checks prevent grading; they never replace words or invent scores. Old recognizer-cache versions/models are regenerated on analysis retry, and known repetition-loop results are excluded from profile statistics.

Vocal filler estimation also runs an independent local waveform model: see `app/ml/README.md`. It can detect acoustic filled pauses omitted by the transcript; no vowel spelling is inserted into transcripts or used as an acoustic detection rule. Review timestamped detections and cross-language limitations.
