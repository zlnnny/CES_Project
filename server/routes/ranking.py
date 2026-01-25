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

    # 1. 뉴스 기반 관계 (InfluenceEdge) 가져오기
    stmt = (
        select(Entity.name, Entity.title_or_company, InfluenceEdge.weight)
        .join(InfluenceEdge, InfluenceEdge.asset_id == Entity.id)
        .where(InfluenceEdge.person_id == person.id)
        .order_by(desc(InfluenceEdge.weight))
        .limit(7)
    )
    results = db.execute(stmt).all()

    data = []
    seen_tickers = set()

    for ticker, full_name, weight in results:
        t = (ticker or "").strip()
        if not t or t in seen_tickers:
            continue
        seen_tickers.add(t)
        data.append({
            "symbol": t,
            "name": (full_name or "").strip() or t,
            "score": round(float(weight or 0.0), 2)
        })

    # 2. 알고리즘 기반 보완 (Jaccard Similarity)
    # 뉴스 데이터가 부족한 경우(최대 7개 미만), GNN에서 사용하는 것과 동일한 로직으로 프로필 유사도 기반 자산 추천
    if len(data) < 7:
        from server.services.gnn_scoring import entity_terms, jaccard
        p_terms = entity_terms(person)
        if p_terms:
            # 모든 자산과 비교 (성능 최적화 필요 시 미리 계산된 테이블 사용 권장)
            all_assets = db.execute(select(Entity).where(Entity.entity_type == "asset")).scalars().all()
            scored_assets = []
            for a in all_assets:
                if a.name in seen_tickers:
                    continue
                a_terms = entity_terms(a)
                sim = jaccard(p_terms, a_terms)
                if sim > 0.1: # 최소 임계값
                    scored_assets.append((a, sim))
            
            scored_assets.sort(key=lambda x: x[1], reverse=True)
            for a, sim in scored_assets[:(7 - len(data))]:
                data.append({
                    "symbol": a.name,
                    "name": (a.title_or_company or "").strip() or a.name,
                    "score": round(float(sim * 0.5), 2) # 뉴스 기반 점수와 스케일 조정 (임시 가중치 0.5)
                })

    return data[:7]
