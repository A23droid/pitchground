from __future__ import annotations

import os
import secrets
import time
from urllib.parse import urlencode

import httpx
import jwt
from dotenv import load_dotenv
from fastapi import APIRouter, Header, HTTPException, Query
from fastapi.responses import RedirectResponse

load_dotenv()

router = APIRouter(prefix="/auth", tags=["auth"])

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

_oauth_states: dict[str, str] = {}


def _settings() -> dict[str, str]:
    client_id = os.getenv("GOOGLE_CLIENT_ID", "")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "")
    jwt_secret = os.getenv("JWT_SECRET", "")
    frontend = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    backend = os.getenv("BACKEND_URL", "http://localhost:8000").rstrip("/")
    if not client_id or not client_secret or not jwt_secret:
        raise HTTPException(status_code=500, detail="Google OAuth is not configured.")
    return {
        "client_id": client_id,
        "client_secret": client_secret,
        "jwt_secret": jwt_secret,
        "frontend": frontend,
        "backend": backend,
    }


def decode_user(token: str) -> dict[str, str]:
    secret = os.getenv("JWT_SECRET", "")
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid session.") from exc
    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=401, detail="Invalid session.")
    return {"name": str(payload.get("name") or email.split("@")[0]), "email": str(email)}


@router.get("/google")
def google_start(next: str = Query("/dashboard")):
    cfg = _settings()
    state = secrets.token_urlsafe(24)
    _oauth_states[state] = next if next.startswith("/") else "/dashboard"
    params = {
        "client_id": cfg["client_id"],
        "redirect_uri": f"{cfg['backend']}/auth/google/callback",
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "prompt": "select_account",
    }
    return RedirectResponse(f"{GOOGLE_AUTH_URL}?{urlencode(params)}")


@router.get("/google/callback")
def google_callback(code: str | None = None, state: str | None = None, error: str | None = None):
    cfg = _settings()
    frontend = cfg["frontend"]
    if error or not code or not state or state not in _oauth_states:
        return RedirectResponse(f"{frontend}/login?error=google")

    next_path = _oauth_states.pop(state)

    token_res = httpx.post(
        GOOGLE_TOKEN_URL,
        data={
            "code": code,
            "client_id": cfg["client_id"],
            "client_secret": cfg["client_secret"],
            "redirect_uri": f"{cfg['backend']}/auth/google/callback",
            "grant_type": "authorization_code",
        },
        timeout=20,
    )
    if token_res.status_code >= 400:
        return RedirectResponse(f"{frontend}/login?error=google")

    access_token = token_res.json().get("access_token")
    if not access_token:
        return RedirectResponse(f"{frontend}/login?error=google")

    user_res = httpx.get(
        GOOGLE_USERINFO_URL,
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=20,
    )
    if user_res.status_code >= 400:
        return RedirectResponse(f"{frontend}/login?error=google")

    profile = user_res.json()
    email = profile.get("email")
    if not email:
        return RedirectResponse(f"{frontend}/login?error=google")

    name = profile.get("name") or email.split("@")[0]
    token = jwt.encode(
        {"name": name, "email": email, "exp": int(time.time()) + 60 * 60 * 24 * 7},
        cfg["jwt_secret"],
        algorithm="HS256",
    )
    params = urlencode({"token": token, "next": next_path})
    return RedirectResponse(f"{frontend}/auth/callback?{params}")


@router.get("/me")
def me(authorization: str | None = Header(default=None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Not signed in.")
    return decode_user(authorization.split(" ", 1)[1].strip())
