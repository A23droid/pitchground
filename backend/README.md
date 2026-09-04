# Pitchground backend

FastAPI service for Google OAuth. STT, sessions, and analysis will land here later.

## Run

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # already filled locally
uvicorn app.main:app --reload --port 8000
```

Google Cloud redirect URI must be exactly:

```text
http://localhost:8000/auth/google/callback
```

Also keep `http://localhost:3000` as an authorized JavaScript origin.

## Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | liveness |
| GET | `/auth/google?next=/dashboard` | start Google sign-in |
| GET | `/auth/google/callback` | Google OAuth callback |
| GET | `/auth/me` | current user (`Authorization: Bearer <jwt>`) |

`SARVAM_API_KEY` is stored in `.env` for a future STT route. It is not used yet.
