from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

import logging
from app.config import DATABASE_URL, DB_PATH, ensure_data_dirs

logger = logging.getLogger(__name__)

ensure_data_dirs()


def _build_engine():
    is_sqlite = DATABASE_URL.startswith("sqlite")
    if is_sqlite:
        return create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

    connect_args = {
        "sslmode": "require",
        "connect_timeout": 3,
    }
    eng = create_engine(
        DATABASE_URL,
        connect_args=connect_args,
        pool_pre_ping=True,
        pool_recycle=120,
        pool_size=5,
        max_overflow=2,
    )
    # A failed cloud connection must not switch accounts to a different database.
    return eng


engine = _build_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
