import random
from datetime import datetime, timedelta
from sqlalchemy import select
from server.db import SessionLocal
from server.models import NewsEvent, Entity

# 더미 데이터 재료
LEADERS = ["Elon Musk", "Tim Cook", "Joe Biden", "Jerome Powell", "Sam Altman", "Jensen Huang", "Mark Zuckerberg"]
ASSETS = ["Tesla", "Apple", "USD", "Bitcoin", "Nvidia", "Oil", "Meta", "S&P 500"]
ACTIONS = ["announces new strategy for", "criticizes policies on", "invests heavily in", "warns about risks of", "discusses future of", "reveals partnership with"]
TOPICS = ["AI regulation", "market crash", "new chip technology", "interest rates", "trade tariffs", "green energy transition", "cloud computing"]

def seed_data():
    db = SessionLocal()
    
    # 데이터가 이미 10개 이상 있으면 중단 (중복 생성 방지)
    if len(db.execute(select(NewsEvent)).scalars().all()) > 10:
        db.close()
        return

    print("🌱 [Auto-Seed] DB가 비어있어 더미 데이터를 자동으로 생성합니다...")

    # 1. 인물/자산 Entity 생성
    for name in LEADERS:
        if not db.execute(select(Entity).where(Entity.name == name)).scalar_one_or_none():
            db.add(Entity(entity_type="person", name=name))
    
    for name in ASSETS:
        if not db.execute(select(Entity).where(Entity.name == name)).scalar_one_or_none():
            db.add(Entity(entity_type="asset", name=name))
    
    db.commit()

    # 2. 뉴스 50개 생성
    for i in range(50):
        leader = random.choice(LEADERS)
        asset = random.choice(ASSETS)
        sentiment = random.uniform(-0.8, 0.8) # 긍정/부정 랜덤
        
        # 최근 3일치 시간 분산
        time_offset = random.randint(0, 60 * 24 * 3)
        pub_date = datetime.now() - timedelta(minutes=time_offset)

        event = NewsEvent(
            leader_name=leader,
            title=f"{leader} {random.choice(ACTIONS)} {asset} regarding {random.choice(TOPICS)}",
            url=f"https://example.com/dummy-news/{i}",
            source="MarketVoice Bot",
            published_at=pub_date,
            sentiment=sentiment,
            tone="neutral",
            importance=random.uniform(0.6, 1.0),
            impact_assets=[asset]
        )
        db.add(event)
    
    db.commit()
    print("✅ [Auto-Seed] 더미 데이터 50개 생성 완료!")
    db.close()