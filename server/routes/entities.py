from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from server.deps import get_db
from server.models import Entity, EntityEmbedding
from server.schemas import BulkUpsertResult, EmbeddingJobRequest, EmbeddingJobResult, EntityOut, EntityUpsert
from server.services.asset_category import infer_asset_category
from server.services.embeddings import canonical_text, embed_texts_sbert

router = APIRouter(prefix="/api", tags=["entities"])


@router.post("/entities/bulk-upsert", response_model=BulkUpsertResult)
def bulk_upsert_entities(payload: list[EntityUpsert], db: Session = Depends(get_db)):
    created = 0
    updated = 0
    for item in payload:
        existing = db.execute(
            select(Entity).where(Entity.entity_type == item.entity_type, Entity.name == item.name)
        ).scalar_one_or_none()

        if existing:
            # Avoid wiping category with null. If missing and this is an asset, try to infer.
            if item.category is not None:
                existing.category = item.category
            elif existing.category is None and item.entity_type == "asset":
                existing.category = infer_asset_category(
                    name=item.name,
                    symbol=item.title_or_company,
                    key_issues=item.key_issues,
                )
            existing.title_or_company = item.title_or_company
            existing.key_issues = item.key_issues
            updated += 1
        else:
            category = item.category
            if category is None and item.entity_type == "asset":
                category = infer_asset_category(
                    name=item.name,
                    symbol=item.title_or_company,
                    key_issues=item.key_issues,
                )
            db.add(
                Entity(
                    entity_type=item.entity_type,
                    category=category,
                    name=item.name,
                    title_or_company=item.title_or_company,
                    key_issues=item.key_issues,
                )
            )
            created += 1

    db.commit()
    return BulkUpsertResult(created=created, updated=updated)


@router.get("/entities", response_model=list[EntityOut])
def list_entities(entity_type: str | None = None, db: Session = Depends(get_db)):
    q = select(Entity)
    if entity_type:
        q = q.where(Entity.entity_type == entity_type)
    return db.execute(q.order_by(Entity.entity_type, Entity.category, Entity.name)).scalars().all()


@router.get("/entities/{entity_type}/{name}", response_model=EntityOut)
def get_entity(entity_type: str, name: str, db: Session = Depends(get_db)):
    """
    Fetch a single entity by (type, name) for detail pages.
    """
    e = db.execute(
        select(Entity).where(Entity.entity_type == entity_type, Entity.name == name)
    ).scalar_one_or_none()
    if not e:
        raise HTTPException(status_code=404, detail="Entity not found")
    return e


@router.post("/embeddings/recompute", response_model=EmbeddingJobResult)
def recompute_embeddings(req: EmbeddingJobRequest, db: Session = Depends(get_db)):
    q = select(Entity)
    if req.entity_type:
        q = q.where(Entity.entity_type == req.entity_type)

    entities = db.execute(q).scalars().all()
    if not entities:
        return EmbeddingJobResult(processed=0, updated=0, model_name=req.model_name)

    texts = [
        canonical_text(
            entity_type=e.entity_type,
            category=e.category,
            name=e.name,
            title_or_company=e.title_or_company,
            key_issues=e.key_issues,
        )
        for e in entities
    ]

    # Find which need updates
    updated = 0
    if req.force:
        to_embed = list(range(len(entities)))
    else:
        existing_ids = {
            row.entity_id
            for row in db.execute(
                select(EntityEmbedding.entity_id).where(EntityEmbedding.model_name == req.model_name)
            ).all()
        }
        to_embed = [i for i, e in enumerate(entities) if e.id not in existing_ids]

    if not to_embed:
        return EmbeddingJobResult(processed=len(entities), updated=0, model_name=req.model_name)

    try:
        vectors = embed_texts_sbert([texts[i] for i in to_embed], req.model_name)
    except RuntimeError as e:
        raise HTTPException(status_code=501, detail=str(e))

    for idx, vec in zip(to_embed, vectors):
        e = entities[idx]
        existing = db.execute(
            select(EntityEmbedding).where(EntityEmbedding.entity_id == e.id, EntityEmbedding.model_name == req.model_name)
        ).scalar_one_or_none()
        if existing:
            existing.embedding = vec
        else:
            db.add(EntityEmbedding(entity_id=e.id, model_name=req.model_name, embedding=vec))
        updated += 1

    db.commit()
    return EmbeddingJobResult(processed=len(entities), updated=updated, model_name=req.model_name)


