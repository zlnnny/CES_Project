from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional

from server.db import get_db
from server.models import Entity, InfluenceEdge, NewsEvent
from server.schemas import NewsIngestRequest, NewsEventIn, NewsEventOut
from server.crawler import get_realtime_news, get_mixed_realtime_news
from server.services.news_scoring import importance_score, sentiment_score, tone_label

router = APIRouter(prefix="/api", tags=["events"])

def process_ingestion(db: Session, events: list[NewsEventIn], rho: float = 0.9):
    updated_edges = 0
    inserted_events = 0

    for ev in events:
        # 1. 뉴스 저장 (중복 체크)
        existing_event = db.execute(select(NewsEvent).where(NewsEvent.url == ev.url)).scalar_one_or_none()
        
        if not existing_event:
            db.add(
                NewsEvent(
                    leader_name=ev.leader_name,
                    title=ev.title,
                    url=ev.url,
                    source=ev.source,
                    published_at=ev.published_at,
                    # AI가 아직 안 돌아서 None일 수 있음
                    sentiment=ev.sentiment,
                    tone=ev.tone,
                    importance=ev.importance,
                    impact_assets=ev.asset_names
                )
            )
            inserted_events += 1
        
        # 2. Leader Entity 생성
        leader = db.execute(
            select(Entity).where(Entity.entity_type == "person", Entity.name == ev.leader_name)
        ).scalar_one_or_none()
        
        if not leader:
            leader = Entity(entity_type="person", name=ev.leader_name)
            db.add(leader)
            db.flush()

        # 3. 자산 및 엣지 업데이트
        if not ev.asset_names:
            continue

        # [변경] 감성 점수가 없으면(None), 가중치 변화(delta)는 0입니다.
        # 나중에 AI 팀원이 sentiment를 업데이트해주면 그때 다시 계산해야 할 수도 있습니다.
        # Online update rule:
        # - Always give some credit for "exposure" (importance) even if sentiment is neutral/missing
        # - Add signed component from sentiment
        current_sentiment = float(ev.sentiment) if ev.sentiment is not None else 0.0
        imp = float(ev.importance) if ev.importance is not None else 0.5
        base_exposure = 0.15 * imp
        delta = base_exposure + (current_sentiment * imp)
        
        for asset_name in ev.asset_names:
            asset = db.execute(
                select(Entity).where(Entity.entity_type == "asset", Entity.name == asset_name)
            ).scalar_one_or_none()
            
            if not asset:
                asset = Entity(entity_type="asset", name=asset_name)
                db.add(asset)
                db.flush()

            # 엣지 업데이트 (sentiment가 0이면 weight 변화 없음, 관계만 생성됨)
            edge = db.execute(
                select(InfluenceEdge).where(InfluenceEdge.person_id == leader.id, InfluenceEdge.asset_id == asset.id)
            ).scalar_one_or_none()
            
            if edge:
                edge.weight = rho * float(edge.weight or 0.0) + delta
            else:
                db.add(InfluenceEdge(person_id=leader.id, asset_id=asset.id, weight=delta))
                db.flush()  # <--- [핵심!] 이 줄을 추가해주세요. (즉시 저장해서 중복 방지)
            
            updated_edges += 1

    db.commit()
    return {"inserted_events": inserted_events, "updated_edges": updated_edges}

@router.get("/news", response_model=list[NewsEventOut])
def fetch_news(leader: Optional[str] = None, db: Session = Depends(get_db)):
    # 1. 크롤링 (leader가 None이면 crawler 내부에서 랜덤 선택됨)
    if leader:
        # 사용자가 특정 인물을 지정했으면 그 사람 뉴스만 3개 (기존 로직)
        print(f"👉 특정 인물 요청: {leader}")
        raw_data = get_realtime_news(leader, limit=3)
    else:
        # [변경] 지정된 사람이 없으면 '3명의 서로 다른 인물' 뉴스 가져오기
        print(f"👉 랜덤 믹스 요청")
        raw_data = get_mixed_realtime_news(total_count=3)
    
    events_in = []
    for item in raw_data:
        # Only score/update for people that already exist in DB (as requested)
        person = db.execute(
            select(Entity).where(Entity.entity_type == "person", Entity.name == item["leader_name"])
        ).scalar_one_or_none()
        if not person:
            continue

        asset_names = item.get("impact_assets") or []
        s = sentiment_score(item.get("title") or "")
        t = tone_label(item.get("title") or "")
        imp = importance_score(
            title=item.get("title") or "",
            person=person,
            asset_hits=len(asset_names),
            published_at=item.get("published_at"),
        )

        event_obj = NewsEventIn(
            leader_name=item["leader_name"],
            title=item["title"],
            url=item["url"],
            source=item["source"],
            published_at=item["published_at"],
            sentiment=s,
            tone=t,
            importance=imp,
            asset_names=asset_names,
        )
        events_in.append(event_obj)

    process_ingestion(db, events_in, rho=0.9)

    urls = [e.url for e in events_in]
    saved_events = db.execute(select(NewsEvent).where(NewsEvent.url.in_(urls))).scalars().all()
    
    return saved_events


@router.post("/news/refresh")
def refresh_news(count: int = 5, limit_per_person: int = 1, db: Session = Depends(get_db)):
    """
    Crawl + score + ingest for random people from DB.
    This drives near-real-time Power Ranking updates.
    """
    people = (
        db.execute(select(Entity).where(Entity.entity_type == "person").order_by(func.random()).limit(count))
        .scalars()
        .all()
    )
    if not people:
        return {"inserted_events": 0, "updated_edges": 0}

    raw: list[dict] = []
    for p in people:
        raw.extend(get_realtime_news(p.name, limit=limit_per_person))

    events_in: list[NewsEventIn] = []
    for item in raw:
        person = db.execute(
            select(Entity).where(Entity.entity_type == "person", Entity.name == item["leader_name"])
        ).scalar_one_or_none()
        if not person:
            continue

        asset_names = item.get("impact_assets") or []
        s = sentiment_score(item.get("title") or "")
        t = tone_label(item.get("title") or "")
        imp = importance_score(
            title=item.get("title") or "",
            person=person,
            asset_hits=len(asset_names),
            published_at=item.get("published_at"),
        )

        events_in.append(
            NewsEventIn(
                leader_name=item["leader_name"],
                title=item["title"],
                url=item.get("url"),
                source=item.get("source") or "Google News",
                published_at=item.get("published_at"),
                sentiment=s,
                tone=t,
                importance=imp,
                asset_names=asset_names,
            )
        )

    return process_ingestion(db, events_in, rho=0.9)

# (Ingest endpoint는 그대로 유지)
@router.post("/events/ingest")
def ingest_events_endpoint(req: NewsIngestRequest, db: Session = Depends(get_db)):
    return process_ingestion(db, req.events, req.rho)