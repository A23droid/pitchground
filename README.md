# Pitchground

Adaptive communication training. The repo is split so UI and API can grow separately.

```
frontend/    Next.js app (localhost:3000)
backend/     FastAPI (localhost:8000) — Google OAuth now, more APIs next
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

## Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Google sign-in needs both servers running. In Google Cloud, set the OAuth redirect to:

`http://localhost:8000/auth/google/callback`
