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

## ML teammate seat

See [`app/ml/README.md`](app/ml/README.md). `ML_ANALYZER=stub` by default.

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
