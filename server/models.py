from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, Float, ForeignKey, Index, String, Text, UniqueConstraint, func, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from server.db import Base
# class Base(DeclarativeBase):
#     pass


class EntityType(str, Enum):
    person = "person"
    asset = "asset"


class Entity(Base):
    __tablename__ = "entities"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_type: Mapped[str] = mapped_column(String(16), index=True)  # EntityType

    # Your CSV fields
    category: Mapped[str | None] = mapped_column(String(128), index=True, nullable=True)
    name: Mapped[str] = mapped_column(String(256), index=True)
    title_or_company: Mapped[str | None] = mapped_column(String(256), nullable=True)
    key_issues: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class EntityEmbedding(Base):
    __tablename__ = "entity_embeddings"
    __table_args__ = (
        UniqueConstraint("entity_id", "model_name", name="uq_entity_embeddings_entity_model"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("entities.id", ondelete="CASCADE"), index=True)

    # SBERT default dimension is commonly 768; adjust if you pick a different model.
    model_name: Mapped[str] = mapped_column(String(128), default="sbert", index=True)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(768), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class NewsEvent(Base): 
    __tablename__ = "news_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    leader_name: Mapped[str | None] = mapped_column(String(256), index=True, nullable=True)
    title: Mapped[str] = mapped_column(Text)
    url: Mapped[str | None] = mapped_column(Text, unique=True, nullable=True) #url 중복방지지
    source: Mapped[str | None] = mapped_column(String(128), nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Optional analysis fields (can be expanded later)
    tone: Mapped[str | None] = mapped_column(String(32), nullable=True) # Hawkish/Dovish
    sentiment: Mapped[float | None] = mapped_column(Float, nullable=True) # -1.0 ~ 1.0 (score 대체)
    impact_assets: Mapped[list | None] = mapped_column(JSON, nullable=True) # 관련 자산 리스트

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class InfluenceEdge(Base):
    """
    Maintains online-updated influence weights between (person -> asset).
    """

    __tablename__ = "influence_edges"
    __table_args__ = (
        UniqueConstraint("person_id", "asset_id", name="uq_influence_edges_person_asset"),
        Index("ix_influence_edges_person_weight", "person_id", "weight"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    person_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("entities.id", ondelete="CASCADE"), index=True)
    asset_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("entities.id", ondelete="CASCADE"), index=True)

    weight: Mapped[float] = mapped_column(Float, default=0.0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


