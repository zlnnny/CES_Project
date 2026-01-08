from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base



class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Default: Supabase Postgres (pooler) for team/shared DB.
    # NOTE: This is hardcoded intentionally per request. `.env` can still override it.
    database_url: str = (
        "postgresql+psycopg://postgres.enaqywrslcikbaqqgigd:"
        "eAjEi!e2M%3FKpNB-@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres?sslmode=require"
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


@lru_cache
def get_engine():
    db_url = get_settings().database_url
    # sqlite일 때만 check_same_thread 필요
    # pgBouncer(pooler) 환경에서는 server-side prepared statements가 문제를 일으킬 수 있어 disable 합니다.
    if db_url.startswith("sqlite"):
        connect_args = {"check_same_thread": False}
        return create_engine(db_url, pool_pre_ping=True, connect_args=connect_args)
    else:
        # Supabase pooler (pgBouncer) + psycopg3: disable server-side prepared statements
        # to avoid "DuplicatePreparedStatement" errors.
        connect_args = {"prepare_threshold": None}
        # Use a small QueuePool for app reuse; avoid pooler quirks by using port 5432.
        return create_engine(
            db_url,
            pool_pre_ping=True,
            connect_args=connect_args,
            pool_size=5,
            max_overflow=10,
            pool_timeout=30,
            pool_reset_on_return=None,
        )

engine = get_engine()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
