from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from server.deps import get_db
from server.schemas import PowerRankingResponse
from server.services.ranking import compute_country_ranking, compute_industry_ranking, compute_power_ranking

router = APIRouter(prefix="/api", tags=["ranking"])


@router.get("/power-ranking", response_model=PowerRankingResponse)
def get_power_ranking(limit: int = 10, db: Session = Depends(get_db)):
    items = compute_power_ranking(db, limit=limit)
    country_items = compute_country_ranking(db, limit=limit)
    industry_items = compute_industry_ranking(db, limit=limit)
    return PowerRankingResponse(items=items, country_items=country_items, industry_items=industry_items)


