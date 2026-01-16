from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional, List, Dict

from server.db import get_db
from server.models import Entity, InfluenceEdge, NewsEvent
from server.schemas import NewsIngestRequest, NewsEventIn, NewsEventOut
from server.crawler import get_realtime_news, get_mixed_realtime_news
from server.services.news_scoring import importance_score, sentiment_score, tone_label

#  프론트엔드 전용 크롤러 & 백그라운드 워커 임포트
from server.frontend_crawler import get_latest_frontend_news
from server.services.background_updater import update_all_leaders_in_background

router = APIRouter(prefix="/api", tags=["events"])

# 신규 추가 기본 자산 매핑 (크롤러가 자산을 못 찾을 경우 점수 누락 방지용 안전장치)
DEFAULT_ASSETS = {
    "Elon Musk": ["Tesla", "SpaceX", "Bitcoin"],
    "Mark Zuckerberg": ["Meta", "Virtual Reality"],
    "Tim Cook": ["Apple", "Tech"],
    "Jensen Huang": ["Nvidia", "AI Chips"],
    "Sam Altman": ["Microsoft", "OpenAI"],
    "Joe Biden": ["USD", "Oil"],
    "Donald Trump": ["Tariffs", "USD"],
    "Jerome Powell": ["Treasury", "S&P 500"],
    "Satya Nadella": ["Microsoft", "Cloud"],
    "Sundar Pichai": ["Google", "Search"]
}

# 대시보드 속도 최적화를 위한 인메모리 캐시
cached_news: List[Dict] = []
last_crawled_time: Optional[datetime] = None


def process_ingestion(db: Session, events: list[NewsEventIn], rho: float = 0.9):
    updated_edges = 0
    inserted_events = 0

    for ev in events:
        existing_event = db.execute(select(NewsEvent).where(NewsEvent.url == ev.url)).scalar_one_or_none()
        
        if not existing_event:
            db.add(
                NewsEvent(
                    leader_name=ev.leader_name,
                    title=ev.title,
                    url=ev.url,
                    source=ev.source,
                    published_at=ev.published_at,
                    sentiment=ev.sentiment,
                    tone=ev.tone,
                    importance=ev.importance,
                    impact_assets=ev.asset_names
                )
            )
            inserted_events += 1
        
        leader = db.execute(
            select(Entity).where(Entity.entity_type == "person", Entity.name == ev.leader_name)
        ).scalar_one_or_none()
        
        if not leader:
            leader = Entity(entity_type="person", name=ev.leader_name)
            db.add(leader)
            db.flush()

        if not ev.asset_names:
            continue

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

            edge = db.execute(
                select(InfluenceEdge).where(InfluenceEdge.person_id == leader.id, InfluenceEdge.asset_id == asset.id)
            ).scalar_one_or_none()
            
            if edge:
                edge.weight = rho * float(edge.weight or 0.0) + delta
            else:
                db.add(InfluenceEdge(person_id=leader.id, asset_id=asset.id, weight=delta))
                db.flush()
            
            updated_edges += 1

    db.commit()
    return {"inserted_events": inserted_events, "updated_edges": updated_edges}


@router.get("/news", response_model=list[NewsEventOut])
def fetch_news(leader: Optional[str] = None, limit: int = 5, db: Session = Depends(get_db)):
    if leader:
        print(f"👉 특정 인물 요청: {leader}")
        raw_data = get_realtime_news(leader, limit=max(1, min(int(limit), 10)))
    else:
        print(f"👉 랜덤 믹스 요청")
        raw_data = get_mixed_realtime_news(total_count=3)
    
    events_in = []
    for item in raw_data:
        person = db.execute(
            select(Entity).where(Entity.entity_type == "person", Entity.name == item["leader_name"])
        ).scalar_one_or_none()
        if not person:
            # Ensure we can score/ingest even if this person wasn't seeded yet.
            person = Entity(entity_type="person", name=item["leader_name"])
            db.add(person)
            db.flush()

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


@router.post("/events/ingest")
def ingest_events_endpoint(req: NewsIngestRequest, db: Session = Depends(get_db)):
    return process_ingestion(db, req.events, req.rho)


# 대시보드용 최신 뉴스 조회 
@router.get("/news/today")
def fetch_todays_news(
    background_tasks: BackgroundTasks,
    force_refresh: bool = False, 
    db: Session = Depends(get_db)
):
    
    global cached_news, last_crawled_time
    
    current_time = datetime.now()
    
    # 1. 캐시 확인 및 백그라운드 작업 예약
    if not force_refresh and cached_news and last_crawled_time:
        if current_time - last_crawled_time < timedelta(minutes=10):
            # [최적화] 캐시된 뉴스 반환 + 백그라운드 랭킹 업데이트 트리거
            background_tasks.add_task(update_all_leaders_in_background)
            
            return {
                "news": cached_news,
                "last_updated": last_crawled_time.strftime('%Y-%m-%d %H:%M:%S'),
                "status": "cached"
            }

    # 2. 동기식 크롤링 (화면 표시용 대표 인물)
    print("🐢 [Foreground] 대시보드용 뉴스 데이터 수집 시작...")
    try:
        raw_data = get_latest_frontend_news(target_count=3)
        
        if raw_data:
            events_to_save = []
            for item in raw_data:
                title_text = item.get("title", "")
                
                # 점수 계산 (NLP 분석)
                calculated_sentiment = sentiment_score(title_text)
                calculated_tone = tone_label(title_text)
                calculated_importance = 0.8  # 대시보드 노출 뉴스는 중요도 높게 설정

                # [중요] 자산(Asset) 자동 주입 로직
                # 크롤러가 자산을 못 찾으면 점수가 0이 되므로, 기본 자산을 강제로 넣음
                assets = item.get("impact_assets", [])
                if not assets:
                    for leader, defaults in DEFAULT_ASSETS.items():
                        if leader in item["leader_name"]:
                            assets = defaults
                            break
                    if not assets:
                        assets = ["Global Market"]

                # DB 저장용 객체 생성
                event_obj = NewsEventIn(
                    leader_name=item["leader_name"],
                    title=title_text,
                    url=item["url"],
                    source=item.get("source", "Google News"),
                    published_at=item["published_at"],
                    sentiment=item.get("sentiment") or calculated_sentiment,
                    tone=item.get("tone") or calculated_tone,
                    importance=calculated_importance,
                    asset_names=assets 
                )
                events_to_save.append(event_obj)

            # DB 저장 및 랭킹 점수 반영
            try:
                result = process_ingestion(db, events_to_save) 
                print(f"💾 [DB Success] Foreground 저장 완료: {result}")
            except Exception as db_err:
                print(f"⚠️ [DB Error] 저장 중 오류: {db_err}")

            cached_news = raw_data
            last_crawled_time = current_time
            
    except Exception as e:
        print(f"❌ [Crawler Error] 크롤링 실패: {e}")
    
    # 3. 비동기 백그라운드 랭킹 업데이트 실행 (사용자 대기 없음)
    background_tasks.add_task(update_all_leaders_in_background)

    return {
        "news": cached_news,
        "last_updated": last_crawled_time.strftime('%Y-%m-%d %H:%M:%S') if last_crawled_time else None,
        "status": "fresh"
    }