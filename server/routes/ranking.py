from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from server.deps import get_db
from server.schemas import PowerRankingResponse
from server.services.ranking import compute_power_ranking

router = APIRouter(prefix="/api", tags=["ranking"])


@router.get("/power-ranking", response_model=PowerRankingResponse)
def get_power_ranking(limit: int = 10, db: Session = Depends(get_db)):
    items = compute_power_ranking(db, limit=limit)
    return PowerRankingResponse(items=items)


