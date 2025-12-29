from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base



class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Default: SQLite for local dev (no Docker required).
    # For Postgres (production/team):
    # postgresql+psycopg://marketvoice:marketvoice@localhost:5432/marketvoice
    database_url: str = "sqlite:///./server/dev.db"


@lru_cache
def get_settings() -> Settings:
    return Settings()


@lru_cache
def get_engine():
    db_url = get_settings().database_url
    # sqlite일 때만 check_same_thread 필요
    connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}
    return create_engine(db_url, pool_pre_ping=True, connect_args=connect_args)

engine = get_engine()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
