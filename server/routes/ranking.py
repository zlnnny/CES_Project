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

# Keep UI responsive: cache last successful ranking response.
# TTL increased to 15 minutes to minimize server load from expensive GNN scoring.
_CACHE: dict[int, tuple[datetime, PowerRankingResponse]] = {}
_TTL = timedelta(minutes=15)

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
        # 1. Compute the full pool once (this is the expensive GNN call)
        # We take a large limit (200) to derive other rankings from it.
        full_pool = compute_power_ranking(db, limit=max(lim, 200))
        
        # 2. Enrich the full pool with entity details (once)
        full_pool = _enrich_items_with_entity_fields(db, full_pool)
        
        # 3. Derive Power Ranking (top N from pool)
        items = full_pool[:lim]
        
        # 4. Derive Country Ranking (best per country from pool)
        best_by_country: dict[str, dict] = {}
        from server.services.ranking import _extract_country
        for p in full_pool:
            country = _extract_country(p.get("title_or_company"))
            if not country: continue
            if country not in best_by_country or p["influence"] > best_by_country[country]["influence"]:
                best_by_country[country] = {**p, "country": country}
        country_items = sorted(best_by_country.values(), key=lambda x: x["influence"], reverse=True)[:10]
        for i, r in enumerate(country_items, 1): r["rank"] = i

        # 5. Derive Industry Ranking (best per industry from pool)
        best_by_industry: dict[str, dict] = {}
        from server.services.ranking import _infer_industry_field
        for p in full_pool:
            field = _infer_industry_field(p.get("category"), p.get("title_or_company"), None)
            if not field: continue
            if field not in best_by_industry or p["influence"] > best_by_industry[field]["influence"]:
                best_by_industry[field] = {**p, "field": field}
        industry_items = sorted(best_by_industry.values(), key=lambda x: x["influence"], reverse=True)[:10]
        for i, r in enumerate(industry_items, 1): r["rank"] = i

        resp = PowerRankingResponse(items=items, country_items=country_items, industry_items=industry_items)
        _CACHE[lim] = (now, resp)
        return resp
    except Exception as e:
        print(f"Ranking Error: {e}")
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
