from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from server.deps import get_db
from server.schemas import PowerRankingResponse
from server.services.ranking import compute_country_ranking, compute_industry_ranking, compute_power_ranking
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc,select
from server.models import InfluenceEdge, Entity
from server.db import get_db
router = APIRouter(prefix="/api", tags=["ranking"])


@router.get("/power-ranking", response_model=PowerRankingResponse)
def get_power_ranking(limit: int = 10, db: Session = Depends(get_db)):
    items = compute_power_ranking(db, limit=limit)
    country_items = compute_country_ranking(db, limit=limit)
    industry_items = compute_industry_ranking(db, limit=limit)
    return PowerRankingResponse(items=items, country_items=country_items, industry_items=industry_items)


# 상세 페이지 용 인물과 연결된 자산 가져오기
@router.get("/leader/{name}/assets")
def get_leader_assets(name: str, db: Session = Depends(get_db)):
    # 1 인물 찾기
    person = db.execute(
        select(Entity).where(Entity.entity_type == "person", Entity.name == name)
    ).scalar_one_or_none()
    
    if not person:
        return [] # 인물이 없으면 빈 리스트 반환

    # 2 해당 인물과 연결된 자산들과 점수 높은 순으로 가져오기 
    # InfluenceEdge 테이블이 바로 'importance_score' 누적 결과 db에 저장되어 있음
    stmt = (
        select(Entity.name, InfluenceEdge.weight)
        .join(InfluenceEdge, InfluenceEdge.asset_id == Entity.id)
        .where(InfluenceEdge.person_id == person.id)
        .order_by(desc(InfluenceEdge.weight))
        .limit(6) # 상위 6개만
    )
    
    results = db.execute(stmt).all()
    
    # 3. 프론트엔드 포맷으로 변환
    data = []
    for asset_name, weight in results:
        # DB에 티커 컬럼이 따로 없다면, 이름 앞 3~4글자로 가짜 티커 생성
        fake_symbol = asset_name[:4].upper()
        
        data.append({
            "symbol": fake_symbol,
            "name": asset_name,
            "score": round(float(weight or 0.0), 2)
        })
    
    return data
