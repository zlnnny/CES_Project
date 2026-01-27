import csv
import os
import random
from sqlalchemy import select
from server.db import SessionLocal
from server.models import Entity, NewsEvent, InfluenceEdge
from server.schemas import NewsEventIn
from server.services.news_scoring import sentiment_score, tone_label
from server.crawler import get_realtime_news 

# CSV 파일 경로
CSV_PATH = os.path.join("server", "data", "candidates_people.csv")

# 한 번 백그라운드 작업이 돌 때 업데이트할 인원 수
# 너무 많으면 느려지고 차단당함. 10명 넘어가면 굉장히 느려짐짐
BATCH_SIZE = 5

# Scoring multipliers (tune without DB changes)
IMPORTANCE_MULTIPLIER = 2.0
SENTIMENT_MULTIPLIER = 1.5
BASE_EXPOSURE_MULTIPLIER = 0.4
INDUSTRY_PROP_MULTIPLIER = 0.8

def load_candidates_from_csv():
    """CSV 파일에서 인물 이름 리스트를 가져옵니다."""
    names = []
    if os.path.exists(CSV_PATH):
        try:
            with open(CSV_PATH, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    if row.get("Name"):
                        names.append(row["Name"].strip())
        except Exception as e:
            print(f"⚠️ CSV 로드 실패: {e}")
    return names

def update_all_leaders_in_background():
    """
    이름은 'update_all'이지만, 실제로는 트래픽 분산을 위해
    전체 후보 중 'BATCH_SIZE'만큼만 랜덤으로 뽑아서 점진적으로 업데이트합니다.
    """
    print("🕵️ [Background] 랭킹 데이터 점진적 업데이트 시작...")
    db = SessionLocal()
    
    try:
        # 1. 대상 선정 (CSV + DB 전체 목록 확보)
        csv_names = load_candidates_from_csv()
        
        # DB에 이미 저장된 사람들도 후보에 포함
        db_entities = db.execute(select(Entity).where(Entity.entity_type == "person")).scalars().all()
        db_names = [e.name for e in db_entities]
        
        # 중복 제거하여 전체 풀(Pool) 생성
        all_candidates = list(set(csv_names + db_names))
        
        if not all_candidates:
            print("⚠️ [Background] 업데이트할 인물 후보가 없습니다.")
            return

        # 전체를 다 돌지 않고, 랜덤으로 BATCH_SIZE만큼만 뽑음
        target_count = min(BATCH_SIZE, len(all_candidates))
        targets = random.sample(all_candidates, target_count)
        
        print(f"🎯 [Background] 이번 타겟({target_count}명): {targets}")

        # 2. 크롤링 및 데이터 수집
        events_to_save = []
        for name in targets:
            try:
                # 인물당 뉴스 2개만 빠르게 수집 (속도 조절)
                news_items = get_realtime_news(leader_name=name, limit=2)
                
                for item in news_items:
                    title = item.get("title", "")
                    
                    # 자산 매핑 (없으면 기본값)
                    assets = item.get("impact_assets", [])
                    if not assets:
                        from server.routes.events import DEFAULT_ASSETS
                        for leader, defaults in DEFAULT_ASSETS.items():
                            if leader in name:
                                assets = defaults
                                break
                        if not assets:
                            assets = ["Global Market"]

                    events_to_save.append(NewsEventIn(
                        leader_name=name,
                        title=title,
                        url=item.get("url", "no-url"),
                        source=item.get("source", "Background Bot"),
                        published_at=item.get("published_at"),
                        sentiment=sentiment_score(title),
                        tone=tone_label(title),
                        importance=0.8, 
                        asset_names=assets
                    ))
            except Exception as e:
                print(f"⚠️ '{name}' 처리 중 에러: {e}")
                continue

        # 3. DB 저장 및 점수 반영
        if not events_to_save:
            print("   ㄴ 새로운 뉴스가 없어 업데이트 건너뜀")
            return

        inserted = 0
        updated = 0
        
        for ev in events_to_save:
            # (1) 뉴스 중복 체크 및 저장
            exists = db.execute(select(NewsEvent).where(NewsEvent.url == ev.url)).scalar_one_or_none()
            if not exists:
                db.add(NewsEvent(
                    leader_name=ev.leader_name, title=ev.title, url=ev.url, 
                    source=ev.source, published_at=ev.published_at,
                    sentiment=ev.sentiment, tone=ev.tone, 
                    importance=ev.importance, impact_assets=ev.asset_names
                ))
                inserted += 1

            # (2) 인물 Entity 확보
            leader = db.execute(select(Entity).where(Entity.entity_type=="person", Entity.name==ev.leader_name)).scalar_one_or_none()
            if not leader:
                leader = Entity(entity_type="person", name=ev.leader_name)
                db.add(leader); db.flush()

            # (3) 엣지(관계) 점수 업데이트
            # 점수 공식: 기본노출(0.05) + 감성점수 * 중요도
            imp = float(ev.importance or 0.5)
            effective_imp = imp * IMPORTANCE_MULTIPLIER
            
            # Calculate market impact (magnitude of the news)
            market_impact = abs(float(ev.sentiment or 0)) * SENTIMENT_MULTIPLIER * effective_imp
            base_exposure = 0.20 * effective_imp * BASE_EXPOSURE_MULTIPLIER
            
            # Influence delta is primarily driven by exposure and impact magnitude
            delta = base_exposure + (market_impact * 0.7) + (float(ev.sentiment or 0) * 0.3 * effective_imp)
            delta = max(0.05, delta)
            
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

            delta_by_asset = {a.id: float(delta) for a in by_name.values()}

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
                    # 기존 점수에 반영 (0.9는 기존 점수 유지 비율 - Decay)
                    edge.weight = 0.9 * float(edge.weight or 0.0) + asset_delta
                else:
                    db.add(InfluenceEdge(person_id=leader.id, asset_id=asset.id, weight=asset_delta))
                updated += 1
        
        db.commit()
        print(f"✅ [Background] 완료: 뉴스 {inserted}개 저장, 점수 {updated}건 변동")

    except Exception as e:
        print(f"❌ [Background Fatal Error] {e}")
        db.rollback()
    finally:
        db.close()
