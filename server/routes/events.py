from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy import func, select, or_, desc, func, case, cast, Float, String
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

# Scoring multipliers (tune without DB changes)
IMPORTANCE_MULTIPLIER = 2.0
SENTIMENT_MULTIPLIER = 1.5
BASE_EXPOSURE_MULTIPLIER = 0.5
INDUSTRY_PROP_MULTIPLIER = 0.9

# 신규 추가 기본 자산 매핑 (크롤러가 자산을 못 찾을 경우 점수 누락 방지용 안전장치)
DEFAULT_ASSETS = {
    "Elon Musk": ["Tesla", "SpaceX", "Bitcoin"],
    "Mark Zuckerberg": ["Meta", "Virtual Reality"],
    "Tim Cook": ["Apple", "Tech"],
    "Jensen Huang": ["Nvidia", "AI Chips"],
    "Sam Altman": ["Microsoft", "OpenAI"],
    # "Joe Biden": ["USD", "Oil"],
    "Donald Trump": ["Tariffs", "USD"],
    "Jerome Powell": ["Treasury", "S&P 500"],
    "Satya Nadella": ["Microsoft", "Cloud"],
    "Sundar Pichai": ["Google", "Search"]
}
g
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
        effective_imp = imp * IMPORTANCE_MULTIPLIER
        
        base_exposure = 0.15 * effective_imp * BASE_EXPOSURE_MULTIPLIER
        delta = base_exposure + (current_sentiment * SENTIMENT_MULTIPLIER * effective_imp)

        assets = (
            db.execute(
                select(Entity).where(Entity.entity_type == "asset", Entity.name.in_(ev.asset_names))
            )
            .scalars()
            .all()
        )
        by_name = {a.name: a for a in assets}
        for asset_name in ev.asset_names:
            if asset_name in by_name:
                continue
            asset = Entity(entity_type="asset", name=asset_name)
            db.add(asset)
            db.flush()
            by_name[asset_name] = asset

        # Base delta per asset
        delta_by_asset = {a.id: float(delta) for a in by_name.values()}

        # Industry spillover within same-category assets from this event
        if INDUSTRY_PROP_MULTIPLIER and len(by_name) > 1:
            cat_groups: dict[str, list[Entity]] = {}
            for a in by_name.values():
                if not a.category:
                    continue
                cat_groups.setdefault(a.category, []).append(a)
            for group in cat_groups.values():
                if len(group) < 2:
                    continue
                share_div = len(group) - 1
                for src in group:
                    spill = float(delta_by_asset.get(src.id, 0.0)) * float(INDUSTRY_PROP_MULTIPLIER) / share_div
                    if spill == 0.0:
                        continue
                    for dst in group:
                        if dst.id == src.id:
                            continue
                        delta_by_asset[dst.id] = float(delta_by_asset.get(dst.id, 0.0)) + spill

        for asset in by_name.values():
            edge = db.execute(
                select(InfluenceEdge).where(InfluenceEdge.person_id == leader.id, InfluenceEdge.asset_id == asset.id)
            ).scalar_one_or_none()

            asset_delta = float(delta_by_asset.get(asset.id, 0.0))
            if edge:
                edge.weight = rho * float(edge.weight or 0.0) + asset_delta
            else:
                db.add(InfluenceEdge(person_id=leader.id, asset_id=asset.id, weight=asset_delta))
                db.flush()

            updated_edges += 1

    db.commit()
    return {"inserted_events": inserted_events, "updated_edges": updated_edges}


@router.get("/news/stats")
def get_news_stats(db: Session = Depends(get_db)):
    """
    전체 뉴스의 감성 분포(긍정/부정/중립) 개수를 반환합니다.
    """
    stats = db.execute(
        select(
            func.count().filter(NewsEvent.sentiment > 0.1).label("positive"),
            func.count().filter(NewsEvent.sentiment < -0.1).label("negative"),
            func.count().filter(NewsEvent.sentiment.between(-0.1, 0.1)).label("neutral")
        )
    ).one()
    
    return {
        "positive": stats.positive,
        "negative": stats.negative,
        "neutral": stats.neutral
    }

# --------------------------------------------------------------------------
# [수정] 뉴스 조회 API (검색/필터/정렬 완벽 지원)
# --------------------------------------------------------------------------
@router.get("/news", response_model=List[NewsEventOut])
def fetch_news(
    skip: int = 0, 
    limit: int = 20, 
    search: Optional[str] = None,
    # [수정 1] 프론트엔드와 이름을 맞춤 (sentiment_filter -> tone_filter)
    tone_filter: Optional[str] = None, 
    sort_by: str = "latest", 
    db: Session = Depends(get_db)
):
    query = select(NewsEvent)

    # 1. 검색어 필터 (퀵 셀렉트 고장 원인 해결)
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                NewsEvent.title.ilike(search_term),
                NewsEvent.leader_name.ilike(search_term),
                # [핵심 수정] 배열 검색 에러 방지를 위해 텍스트로 변환 후 검색 (가장 안전함)
                cast(NewsEvent.impact_assets, String).ilike(search_term)
            )
        )

    # 2. 4가지 카테고리 필터링 로직 (Bullish/Bearish/Hawkish/Dovish 연결)
    if tone_filter:
        if tone_filter == 'Bullish':
            # 긍정적인 뉴스 (Sentiment > 0.1)
            query = query.where(NewsEvent.sentiment > 0.1)
            
        elif tone_filter == 'Bearish':
            # 부정적인 뉴스 (Sentiment < -0.1)
            query = query.where(NewsEvent.sentiment < -0.1)
            
        elif tone_filter == 'Hawkish':
            # Tone이 'Hawkish'인 뉴스
            query = query.where(NewsEvent.tone == 'Hawkish')
            
        elif tone_filter == 'Dovish':
            # Tone이 'Dovish'인 뉴스
            query = query.where(NewsEvent.tone == 'Dovish')

    # 3. 정렬 로직
    if sort_by == "importance":
        query = query.order_by(NewsEvent.importance.desc(), NewsEvent.published_at.desc())
    else:
        query = query.order_by(NewsEvent.published_at.desc())

    # 4. 페이징
    query = query.offset(skip).limit(limit)

    return db.execute(query).scalars().all()

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
    

@router.get("/news", response_model=list[NewsEventOut])
def fetch_news(
    skip: int = 0, 
    limit: int = 20, 
    search: Optional[str] = None,
    sentiment_filter: Optional[str] = None, 
    sort_by: str = "latest", # 👈 정렬 기준 추가 (latest, importance)
    db: Session = Depends(get_db)
):
    query = select(NewsEvent)

    # 1. 검색어 필터
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                NewsEvent.title.ilike(search_term),
                NewsEvent.leader_name.ilike(search_term),
                NewsEvent.impact_assets.contains([search]) # 자산 배열 검색 (DB 종류에 따라 다를 수 있음, 일단 시도)
            )
        )

    # 2. 감성 필터
    if sentiment_filter:
        if sentiment_filter == 'positive':
            query = query.where(NewsEvent.sentiment > 0.1)
        elif sentiment_filter == 'negative':
            query = query.where(NewsEvent.sentiment < -0.1)
        else:
            query = query.where(NewsEvent.sentiment.between(-0.1, 0.1))

    # 3. 정렬 로직 (핵심!)
    if sort_by == "importance":
        # 중요도가 높은 순서대로, 그다음엔 최신순
        query = query.order_by(NewsEvent.importance.desc(), NewsEvent.published_at.desc())
    else:
        # 기본은 최신순
        query = query.order_by(NewsEvent.published_at.desc())

    # 4. 페이징
    query = query.offset(skip).limit(limit)

    results = db.execute(query).scalars().all()
    return results

@router.post("/news/crawl")
def crawl_news_by_keyword(
    query: str, 
    db: Session = Depends(get_db)
):
    print(f"🕵️ [Manual Crawl] 사용자 요청 키워드: {query}")
    
    # 1. 크롤러 실행 (실시간 구글 뉴스)
    # limit=5 정도로 설정해 너무 오래 걸리지 않게 함
    raw_data = get_realtime_news(query, limit=5)
    
    if not raw_data:
        return {"message": "No news found", "count": 0, "events": []}

    # 2. 데이터 DB 저장 (점수 계산 포함)
    events_in = []
    for item in raw_data:
        # DB에 이미 있는지 중복 체크 (URL 기준)
        exists = db.execute(select(NewsEvent).where(NewsEvent.url == item["url"])).scalar_one_or_none()
        if exists:
            continue

        # 간단한 점수 로직 (크롤러가 가져온 값 활용)
        # 만약 크롤러가 점수를 안 가져오면 기본값 할당
        sentiment = item.get("sentiment") if item.get("sentiment") else 0.0
        
        # 중요도: 검색 결과는 사용자 관심사니까 높게 설정
        importance = 0.85 

        event_obj = NewsEvent(
            leader_name=item.get("leader_name", "Unknown"), # 크롤러가 추출 못하면 Unknown
            title=item["title"],
            url=item["url"],
            source=item.get("source", "Google News"),
            published_at=item["published_at"],
            sentiment=sentiment,
            tone="neutral",
            importance=importance,
            impact_assets=item.get("impact_assets", [])
        )
        db.add(event_obj)
        events_in.append(event_obj)
    
    db.commit()
    
    print(f"✅ [Crawl Success] {len(events_in)}개 뉴스 저장 완료")
    return {"message": "Success", "count": len(events_in), "query": query}