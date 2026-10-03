from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import DATABASE_URL, ensure_data_dirs

ensure_data_dirs()

is_sqlite = DATABASE_URL.startswith("sqlite")
connect_args = {"check_same_thread": False} if is_sqlite else {}
# psycopg3 + pool_pre_ping can raise "can't change autocommit now" and drop requests.
engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=False,
    pool_recycle=280 if not is_sqlite else -1,
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
