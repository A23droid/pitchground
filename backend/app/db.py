from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import DATABASE_URL, ensure_data_dirs

ensure_data_dirs()

is_sqlite = DATABASE_URL.startswith("sqlite")
# psycopg3 requires check_same_thread only for SQLite.
# For Nhost / cloud Postgres, pass sslmode via connect_args so psycopg3 uses it correctly.
if is_sqlite:
    connect_args: dict = {"check_same_thread": False}
else:
    connect_args = {
        "sslmode": "require",   # psycopg3 prefers sslmode in connect_args for cloud DBs
        "connect_timeout": 10,  # fail fast if Nhost is unreachable
    }
# pool_pre_ping=True: verifies each connection before use (critical for cloud DBs that
# drop idle connections). pool_recycle=120 prevents connections older than 2 min.
engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
    pool_recycle=120 if not is_sqlite else -1,
    pool_size=5 if not is_sqlite else 1,
    max_overflow=2 if not is_sqlite else 0,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
