from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


EntityType = Literal["person", "asset"]


class EntityUpsert(BaseModel):
    entity_type: EntityType
    category: str | None = None
    name: str
    title_or_company: str | None = None
    key_issues: str | None = None


class EntityOut(BaseModel):
    id: UUID
    entity_type: EntityType
    category: str | None
    name: str
    title_or_company: str | None
    key_issues: str | None


class BulkUpsertResult(BaseModel):
    created: int
    updated: int


class EmbeddingJobRequest(BaseModel):
    model_name: str = Field(default="sentence-transformers/all-mpnet-base-v2")
    entity_type: EntityType | None = None
    force: bool = False


class EmbeddingJobResult(BaseModel):
    processed: int
    updated: int
    model_name: str


class NewsEventIn(BaseModel):
    leader_name: str
    title: str
    url: str | None = None
    source: str | None = "Google News"
    published_at: datetime | None = None

    sentiment: float | None = None
    importance: float | None = None

    # If crawler/mapper provides explicit targets:
    asset_names: list[str] = Field(default_factory=list)


class NewsIngestRequest(BaseModel):
    events: list[NewsEventIn]
    rho: float = 0.9  # decay for online update


class PowerRankingItem(BaseModel):
    rank: int
    delta: int = 0
    name: str
    influence: float
    stocks: str


class PowerRankingResponse(BaseModel):
    window_days: int | None = None
    items: list[PowerRankingItem]
    country_items: list[PowerRankingItem] = Field(default_factory=list)
    industry_items: list[PowerRankingItem] = Field(default_factory=list)


