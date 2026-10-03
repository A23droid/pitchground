from __future__ import annotations

import os
import secrets
import time
from datetime import datetime, timedelta
from urllib.parse import urlencode

import httpx
import jwt
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Learner
from app.models.entities import Learner as LearnerModel

try:
    from app.models import User
    from app.schemas import ForgotPassword, ResetPassword, Token, UserCreate, UserLogin
    from app.security import generate_reset_token, get_password_hash, verify_password
    from app.email_service import send_password_reset_email
    HAS_USER_AUTH = True
except Exception:
    HAS_USER_AUTH = False

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


def _issue_token(name: str, email: str, sub: str | None = None) -> str:
    secret = os.getenv("JWT_SECRET", "")
    if not secret:
        raise HTTPException(status_code=500, detail="JWT_SECRET is not configured.")
    payload = {
        "name": name,
        "email": email,
        "exp": int(time.time()) + 60 * 60 * 24 * 7,
    }
    if sub:
        payload["sub"] = sub
    return jwt.encode(payload, secret, algorithm="HS256")


def create_access_token(data: dict) -> str:
    secret = os.getenv("JWT_SECRET", "")
    to_encode = data.copy()
    expire = int(time.time()) + 60 * 60 * 24 * 7
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, secret, algorithm="HS256")


def _upsert_learner(db: Session, email: str, name: str, google_sub: str | None = None) -> Learner:
    learner = db.query(Learner).filter(Learner.email == email).one_or_none()
    if learner is None:
        learner = Learner(email=email, display_name=name, practice_language="en", google_sub=google_sub)
        db.add(learner)
    else:
        learner.display_name = name or learner.display_name
        if google_sub and not learner.google_sub:
            learner.google_sub = google_sub
    db.commit()
    db.refresh(learner)
    return learner


def decode_user(token: str) -> dict[str, str]:
    secret = os.getenv("JWT_SECRET", "")
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid session.") from exc
    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=401, detail="Invalid session.")
    return {
        "name": str(payload.get("name") or email.split("@")[0]),
        "email": str(email),
        "sub": str(payload.get("sub") or ""),
    }


if HAS_USER_AUTH:
    @router.post("/signup")
    def signup(user_in: UserCreate, db: Session = Depends(get_db)):
        user = db.query(User).filter(User.email == user_in.email).first()
        if user:
            raise HTTPException(status_code=400, detail="Email already registered")
        hashed_password = get_password_hash(user_in.password)
        db_user = User(
            email=user_in.email,
            name=user_in.name,
            hashed_password=hashed_password,
        )
        db.add(db_user)
        _upsert_learner(db, email=user_in.email, name=user_in.name or user_in.email.split("@")[0])
        db.commit()
        db.refresh(db_user)
        token = _issue_token(name=db_user.name or db_user.email.split("@")[0], email=db_user.email)
        return {"access_token": token, "token_type": "bearer"}

    @router.post("/login")
    def login(user_in: UserLogin, db: Session = Depends(get_db)):
        user = db.query(User).filter(User.email == user_in.email).first()
        if not user or not verify_password(user_in.password, user.hashed_password):
            raise HTTPException(status_code=401, detail="Incorrect email or password")
        _upsert_learner(db, email=user.email, name=user.name or user.email.split("@")[0])
        token = _issue_token(name=user.name or user.email.split("@")[0], email=user.email)
        return {"access_token": token, "token_type": "bearer"}

    @router.post("/forgot-password")
    def forgot_password(req: ForgotPassword, db: Session = Depends(get_db)):
        user = db.query(User).filter(User.email == req.email).first()
        if not user:
            return {"message": "If that email is in our database, we will send a reset link."}
        token = generate_reset_token()
        user.reset_token = token
        user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
        db.commit()
        try:
            send_password_reset_email(user.email, token)
        except Exception:
            pass
        return {"message": "If that email is in our database, we will send a reset link."}

    @router.post("/reset-password")
    def reset_password(req: ResetPassword, db: Session = Depends(get_db)):
        user = db.query(User).filter(User.reset_token == req.token).first()
        if not user or not user.reset_token_expires or user.reset_token_expires < datetime.utcnow():
            raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        user.hashed_password = get_password_hash(req.new_password)
        user.reset_token = None
        user.reset_token_expires = None
        db.commit()
        return {"message": "Password successfully reset"}


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
def google_callback(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
):
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
    google_sub = profile.get("sub")
    _upsert_learner(db, email=email, name=name, google_sub=str(google_sub) if google_sub else None)
    token = _issue_token(name=name, email=email, sub=str(google_sub) if google_sub else None)
    params = urlencode({"token": token, "next": next_path})
    return RedirectResponse(f"{frontend}/auth/callback?{params}")


@router.post("/demo")
def demo_login(db: Session = Depends(get_db)):
    """Local/demo JWT so the interview loop works without Google."""
    if os.getenv("DEMO_AUTH", "1") not in ("1", "true", "TRUE", "yes"):
        raise HTTPException(status_code=403, detail="Demo auth disabled.")
    email = "demo@pitchground.ai"
    name = "Demo User"
    learner = _upsert_learner(db, email=email, name=name)
    token = _issue_token(name=name, email=email, sub=f"demo:{learner.id}")
    return {"token": token, "name": name, "email": email, "learner_id": learner.id}


@router.get("/me")
def me(authorization: str | None = Header(default=None), db: Session = Depends(get_db)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Not signed in.")
    user = decode_user(authorization.split(" ", 1)[1].strip())
    learner = _upsert_learner(db, email=user["email"], name=user["name"], google_sub=user.get("sub") or None)
    return {
        "name": learner.display_name,
        "email": learner.email,
        "learner_id": learner.id,
        "practice_language": learner.practice_language,
    }
