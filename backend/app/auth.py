from __future__ import annotations

import os
import secrets
import time
from datetime import datetime, timedelta
from urllib.parse import urlencode

import httpx
import jwt
from dotenv import load_dotenv
from fastapi import APIRouter, Header, HTTPException, Query, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import UserCreate, UserLogin, ForgotPassword, ResetPassword, Token
from app.security import get_password_hash, verify_password, generate_reset_token
from app.email_service import send_password_reset_email

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


def create_access_token(data: dict) -> str:
    secret = os.getenv("JWT_SECRET", "")
    to_encode = data.copy()
    expire = int(time.time()) + 60 * 60 * 24 * 7
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, secret, algorithm="HS256")


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


@router.post("/signup", response_model=Token)
def signup(user_in: UserCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user_in.password)
    db_user = User(
        email=user_in.email,
        name=user_in.name,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    token = create_access_token({"name": db_user.name or db_user.email.split("@")[0], "email": db_user.email})
    return {"access_token": token, "token_type": "bearer"}


@router.post("/login", response_model=Token)
def login(user_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_in.email).first()
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    token = create_access_token({"name": user.name or user.email.split("@")[0], "email": user.email})
    return {"access_token": token, "token_type": "bearer"}


@router.post("/forgot-password")
def forgot_password(req: ForgotPassword, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        # Don't reveal if user exists
        return {"message": "If that email is in our database, we will send a reset link."}
    
    token = generate_reset_token()
    user.reset_token = token
    user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
    db.commit()
    
    send_password_reset_email(user.email, token)
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
def google_callback(code: str | None = None, state: str | None = None, error: str | None = None, db: Session = Depends(get_db)):
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
    
    # Store or update user in database
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Create a user with a random placeholder password since they log in via Google
        user = User(
            email=email,
            name=name,
            hashed_password=get_password_hash(secrets.token_urlsafe(32))
        )
        db.add(user)
        db.commit()
    
    token = create_access_token({"name": name, "email": email})
    params = urlencode({"token": token, "next": next_path})
    return RedirectResponse(f"{frontend}/auth/callback?{params}")


@router.get("/me")
def me(authorization: str | None = Header(default=None), db: Session = Depends(get_db)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Not signed in.")
    
    user_info = decode_user(authorization.split(" ", 1)[1].strip())
    # Optionally, we can fetch from DB to verify user still exists
    user = db.query(User).filter(User.email == user_info["email"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
        
    return {"name": user.name, "email": user.email, "id": str(user.id)}
