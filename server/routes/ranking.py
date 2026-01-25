from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from server.deps import get_db
from server.models import Entity, InfluenceEdge
from server.schemas import PowerRankingResponse
from server.services.ranking import compute_country_ranking, compute_industry_ranking, compute_power_ranking

router = APIRouter(prefix="/api", tags=["ranking"])

# Keep UI responsive: cache last successful ranking response briefly.
_CACHE: dict[int, tuple[datetime, PowerRankingResponse]] = {}
_TTL = timedelta(seconds=15)

def _enrich_items_with_entity_fields(db: Session, items: list[dict]) -> list[dict]:
    """
    Attach Supabase(DB) entity fields to ranking items so the UI can show:
      - title_or_company (e.g., "CEO of Tesla")
      - category
    """
    names = [x.get("name") for x in items if x.get("name")]
    if not names:
        return items
    ents = (
        db.execute(select(Entity).where(Entity.entity_type == "person", Entity.name.in_(names)))
        .scalars()
        .all()
    )
    by_name = {e.name: e for e in ents}
    for x in items:
        e = by_name.get(x.get("name"))
        if not e:
            continue
        x["title_or_company"] = e.title_or_company
        x["category"] = e.category
    return items


@router.get("/power-ranking", response_model=PowerRankingResponse)
def get_power_ranking(limit: int = 10, force: bool = False, db: Session = Depends(get_db)):
    now = datetime.now()
    lim = max(1, int(limit))

    if not force:
        hit = _CACHE.get(lim)
        if hit:
            cached_at, cached_resp = hit
            if now - cached_at < _TTL:
                return cached_resp

    try:
        items = compute_power_ranking(db, limit=lim)
        country_items = compute_country_ranking(db, limit=min(lim, 10))
        industry_items = compute_industry_ranking(db, limit=min(lim, 10))
        items = _enrich_items_with_entity_fields(db, items)
        resp = PowerRankingResponse(items=items, country_items=country_items, industry_items=industry_items)
        _CACHE[lim] = (now, resp)
        return resp
    except Exception:
        # Fail fast: return cached response if we have it, otherwise names-only filler.
        hit = _CACHE.get(lim)
        if hit:
            return hit[1]
        return PowerRankingResponse(items=[], country_items=[], industry_items=[])


# 상세 페이지 용 인물과 연결된 자산 가져오기
@router.get("/leader/{name}/assets")
def get_leader_assets(name: str, db: Session = Depends(get_db)):
    person = db.execute(select(Entity).where(Entity.entity_type == "person", Entity.name == name)).scalar_one_or_none()
    if not person:
        return []

    stmt = (
        select(Entity.name, Entity.title_or_company, InfluenceEdge.weight)
        .join(InfluenceEdge, InfluenceEdge.asset_id == Entity.id)
        .where(InfluenceEdge.person_id == person.id)
        .order_by(desc(InfluenceEdge.weight))
        .limit(10)
    )
    results = db.execute(stmt).all()

    data = []
    for ticker, full_name, weight in results:
        # ticker is Entity.name, full_name is Entity.title_or_company
        # Fallback for display
        display_ticker = (ticker or "").strip() or "----"
        display_name = (full_name or "").strip() or ticker or "Unknown Asset"
        
        data.append({
            "symbol": display_ticker,
            "name": display_name,
            "score": round(float(weight or 0.0), 2)
        })
    return data
