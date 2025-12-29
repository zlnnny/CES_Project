from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Example:
    # postgresql+psycopg://marketvoice:marketvoice@localhost:5432/marketvoice
    database_url: str = "postgresql+psycopg://marketvoice:marketvoice@localhost:5432/marketvoice"


@lru_cache
def get_settings() -> Settings:
    return Settings()


@lru_cache
def get_engine():
    return create_engine(get_settings().database_url, pool_pre_ping=True)


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=get_engine())


