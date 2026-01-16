from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict

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


# News 관련 스키마]

class NewsEventIn(BaseModel):
    """크롤러나 외부에서 데이터가 들어올 때의 규격"""
    leader_name: str
    title: str
    url: str | None = None
    source: str | None = "Google News"
    published_at: datetime | None = None

    # 분석 데이터
    sentiment: float | None = None # -1.0 ~ 1.0
    tone: str | None = None        # Hawkish / Dovish / Neutral (추가됨)
    importance: float | None = None

    # If crawler/mapper provides explicit targets:
    asset_names: list[str] = Field(default_factory=list)


class NewsEventOut(NewsEventIn):
    """API가 프론트엔드에게 응답할 때의 규격 (DB ID 포함)"""
    id: UUID
    created_at: datetime

    # ORM 객체를 Pydantic 모델로 변환하기 위해 필수
    model_config = ConfigDict(from_attributes=True)
    
    
class NewsIngestRequest(BaseModel):
    events: list[NewsEventIn]
    rho: float = 0.9  # decay for online update


class PowerRankingItem(BaseModel):
    rank: int
    delta: int = 0
    name: str
    category: str | None = None
    title_or_company: str | None = None
    influence: float
    stocks: str


class PowerRankingResponse(BaseModel):
    window_days: int | None = None
    items: list[PowerRankingItem]
    country_items: list[PowerRankingItem] = Field(default_factory=list)
    industry_items: list[PowerRankingItem] = Field(default_factory=list)


