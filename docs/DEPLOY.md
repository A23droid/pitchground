# Deploy environment matrix

## Local backend (`backend/.env`)

| Variable | Example |
|----------|---------|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | from Google Cloud |
| `JWT_SECRET` | long random string |
| `FRONTEND_URL` | `http://localhost:3000` |
| `BACKEND_URL` | `http://localhost:8000` |
| `CORS_ORIGINS` | `http://localhost:3000,https://pitch-ground.vercel.app` |
| `SARVAM_API_KEY` | Sarvam subscription key |
| `OPENAI_API_KEY` / `OPENAI_BASE_URL` / `OPENAI_MODEL` | optional; agents fall back to templates |
| `ML_ANALYZER` | `stub` or `real` |
| `DEMO_AUTH` | `1` locally |
| `DATABASE_URL` | Nhost Postgres URI (or sqlite for offline) |
| `STORAGE_BACKEND` | `nhost` or `local` |
| `NHOST_SUBDOMAIN` / `NHOST_REGION` / `NHOST_ADMIN_SECRET` | from Nhost settings |
| `NHOST_STORAGE_BUCKET` | `attempt-media` |

See [NHOST_SETUP.md](./NHOST_SETUP.md) for click-by-click dashboard steps.

Do **not** point local `.env` URLs at production unless intentional.

## Render (backend)

| Variable | Value |
|----------|-------|
| `FRONTEND_URL` | `https://pitch-ground.vercel.app` |
| `BACKEND_URL` | `https://pitchground-backend.onrender.com` |
| secrets | `GOOGLE_*`, `JWT_SECRET`, `SARVAM_*`, `OPENAI_*`, Nhost vars |
| `DATABASE_URL` | same Nhost Postgres URI |
| `STORAGE_BACKEND` | `nhost` |
| `ML_ANALYZER` | `stub` until teammate model ships |
| `DEMO_AUTH` | `0` in production (optional) |

No persistent disk required when using Nhost for DB + media.

Start command:

```bash
cd backend && alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

## Vercel (frontend)

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://pitchground-backend.onrender.com` |

## Google Cloud OAuth

Authorized redirect URIs:

- `http://localhost:8000/auth/google/callback`
- `https://pitchground-backend.onrender.com/auth/google/callback`

## Fixture / teammate-less demo mode

1. `ML_ANALYZER=stub` — deterministic `SignalBundle`s.
2. Empty `SARVAM_API_KEY` — fixture transcript.
3. No `OPENAI_API_KEY` — template diagnosis/challenge.
4. Frontend demo → `POST /auth/demo` → JWT → `/v1` loop.
