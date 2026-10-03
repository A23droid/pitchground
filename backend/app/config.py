from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
MEDIA_DIR = DATA_DIR / "media"
DB_PATH = DATA_DIR / "pitchground.db"


def _normalize_database_url(raw: str) -> str:
    url = raw.strip()
    if not url:
        return f"sqlite:///{DB_PATH}"
    # Common paste formats from Nhost / Heroku-style URIs
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://") :]
    if url.startswith("postgresql://") and "+psycopg" not in url and "+psycopg2" not in url:
        url = "postgresql+psycopg://" + url[len("postgresql://") :]
    # Nhost / cloud Postgres usually requires TLS on public endpoints
    if url.startswith("postgresql") and "sslmode=" not in url:
        url += ("&" if "?" in url else "?") + "sslmode=require"
    return url


DATABASE_URL = _normalize_database_url(os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}"))

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
JWT_SECRET = os.getenv("JWT_SECRET", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000").rstrip("/")

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
ML_ANALYZER = os.getenv("ML_ANALYZER", "stub")  # stub | real

# local | nhost
STORAGE_BACKEND = os.getenv("STORAGE_BACKEND", "local").strip().lower()
NHOST_SUBDOMAIN = os.getenv("NHOST_SUBDOMAIN", "").strip()
NHOST_REGION = os.getenv("NHOST_REGION", "").strip()
NHOST_ADMIN_SECRET = os.getenv("NHOST_ADMIN_SECRET", "").strip()
NHOST_STORAGE_BUCKET = os.getenv("NHOST_STORAGE_BUCKET", "attempt-media").strip() or "attempt-media"

CORS_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,https://pitch-ground.vercel.app",
    ).split(",")
    if o.strip()
]


def nhost_storage_base_url() -> str:
    if not NHOST_SUBDOMAIN or not NHOST_REGION:
        return ""
    return f"https://{NHOST_SUBDOMAIN}.storage.{NHOST_REGION}.nhost.run/v1"


def ensure_data_dirs() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
