import feedparser
import urllib.parse
import json
import os
from datetime import datetime
import requests
from newspaper import Article, Config
import random

from sqlalchemy import select

from server.db import SessionLocal
from server.models import Entity

# ---------------------------------------------------------
# [설정] 파일 경로 및 디렉토리 설정
# ---------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_FILE_PATH = os.path.join(BASE_DIR, "data", "assets.json")
PEOPLE_FILE_PATH = os.path.join(BASE_DIR, "data", "people.json")

# 결과물을 저장할 경로 (server/db)
DB_DIR = os.path.join(BASE_DIR, "server", "db")

# ---------------------------------------------------------
# [기능 1] 데이터 로드 (자산, 인물)
# ---------------------------------------------------------
def load_assets_from_json():
    """assets.json 파일을 읽어서 자산 리스트를 반환"""
    try:
        if not os.path.exists(ASSETS_FILE_PATH):
            # Fallback: DB
            db = SessionLocal()
            try:
                assets = db.execute(select(Entity).where(Entity.entity_type == "asset")).scalars().all()
                out = []
                for a in assets:
                    keywords = []
                    if a.key_issues:
                        keywords.extend([s.strip() for s in a.key_issues.split(",") if s.strip()])
                    if a.title_or_company:
                        keywords.append(a.title_or_company)
                    out.append({"name": a.name, "keywords": keywords})
                return out
            finally:
                db.close()
            
        with open(ASSETS_FILE_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get("assets", [])
    except Exception as e:
        print(f"⚠️ 자산 파일 로드 실패: {e}")
        return []

def load_random_leader_from_json():
    """people.json에서 무작위 인물 이름 하나를 반환"""
    try:
        if not os.path.exists(PEOPLE_FILE_PATH):
            # Fallback: DB
            db = SessionLocal()
            try:
                person = db.execute(
                    select(Entity).where(Entity.entity_type == "person").order_by(Entity.name).limit(1)
                ).scalar_one_or_none()
                return person.name if person else "Donald Trump"
            finally:
                db.close()
        
        with open(PEOPLE_FILE_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)
            people = data.get("people", [])
            if people:
                return random.choice(people)["name"]
    except Exception as e:
        print(f"❌ [에러] 인물 로드 중 오류: {e}")
    
    return "Donald Trump"

# ---------------------------------------------------------
# [기능 2] 헬퍼 함수 (본문 추출, 자산 매칭)
# ---------------------------------------------------------
def _fetch_article_content(url):
    try:
        config = Config()
        config.browser_user_agent = 'Mozilla/5.0'
        config.request_timeout = 3
        article = Article(url, config=config)
        article.download()
        article.parse()
        # 너무 길면 자르고, 너무 짧으면 빈 문자열 반환
        return article.text[:3000] if len(article.text) > 50 else ""
    except:
        return ""

def _extract_assets(text, assets_list):
    """
    텍스트에서 자산 이름을 찾습니다.
    대소문자를 구분하지 않고(lower), 이름(Name)과 키워드(Keywords)를 모두 검사합니다.
    """
    text_lower = text.lower()
    found_assets = []
    
    for asset in assets_list:
        asset_name = asset['name'] # 예: "Apple Inc."
        
        # 1. 이름(Name)이 본문에 있는지 확인
        if asset_name.lower() in text_lower:
            found_assets.append(asset_name)
            continue 
            
        # 2. 키워드(Keywords) 확인
        keywords = asset.get('keywords', [])
        for keyword in keywords:
            if keyword.lower() in text_lower:
                found_assets.append(asset_name)
                break 
    
    # 중복 제거 후 최대 3개 반환
    unique_assets = list(set(found_assets))
    return unique_assets[:3]

# ---------------------------------------------------------
# [기능 3] 핵심 크롤링 로직
# ---------------------------------------------------------
def get_realtime_news(leader_name=None, limit=3):
    if not leader_name:
        leader_name = load_random_leader_from_json()

    assets_list = load_assets_from_json()
    encoded_name = urllib.parse.quote(leader_name)
    url = f"https://news.google.com/rss/search?q={encoded_name}&hl=en-US&gl=US&ceid=US:en"
    
    headers = {"User-Agent": "Mozilla/5.0"}
    news_results = []
    
    try:
        resp = requests.get(url, headers=headers, timeout=5)
        if resp.status_code == 200:
            feed = feedparser.parse(resp.content)
            
            if not feed.entries:
                return []

            for entry in feed.entries[:limit]:
                try:
                    pub_date_obj = datetime(*entry.published_parsed[:6])
                except:
                    pub_date_obj = datetime.now()

                full_content = _fetch_article_content(entry.link)
                
                # 제목 + 본문 합쳐서 검색
                search_text = f"{entry.title} {full_content}"
                
                # 자산 추출
                found_assets = _extract_assets(search_text, assets_list)
                
                if found_assets:
                    print(f"   💰 [{leader_name}] 자산 발견!: {found_assets}")

                news_item = {
                    "leader_name": leader_name,
                    "title": entry.title,
                    "url": entry.link,
                    "source": "Google News",
                    # [중요] JSON 저장을 위해 datetime 객체를 문자열로 변환
                    "published_at": pub_date_obj.strftime('%Y-%m-%d %H:%M:%S'), 
                    "tone": None,
                    "sentiment": None,
                    "impact_assets": found_assets
                }
                news_results.append(news_item)

    except Exception as e:
        print(f"❌ 크롤링 에러: {e}")

    return news_results

def get_mixed_realtime_news(total_count=3):
    """여러 인물의 뉴스를 섞어서 가져옵니다."""
    print(f"🎲 [Crawler] 서로 다른 인물 {total_count}명의 뉴스를 수집합니다...")
    
    mixed_results = []
    
    try:
        if not os.path.exists(PEOPLE_FILE_PATH):
            # Fallback: DB
            db = SessionLocal()
            try:
                people_list = [
                    {"name": p.name}
                    for p in db.execute(select(Entity).where(Entity.entity_type == "person")).scalars().all()
                ]
            finally:
                db.close()
        else:
            with open(PEOPLE_FILE_PATH, 'r', encoding='utf-8') as f:
                data = json.load(f)
                people_list = data.get("people", [])
            
            # 인원이 충분한지 확인
            if len(people_list) < total_count:
                selected_people = people_list
            else:
                selected_people = random.sample(people_list, total_count)
            
            # 각 인물당 1개씩 수집
            for person in selected_people:
                leader_name = person["name"]
                try:
                    news = get_realtime_news(leader_name=leader_name, limit=1)
                    mixed_results.extend(news)
                except Exception as e:
                    print(f"⚠️ {leader_name} 수집 중 오류: {e}")
                    
    except Exception as e:
        print(f"❌ 믹스 크롤링 전체 오류: {e}")

    return mixed_results

# ---------------------------------------------------------
# [기능 4] JSON 파일 저장
# ---------------------------------------------------------
def save_to_json(data):
    """크롤링 데이터를 server/db 폴더에 JSON 파일로 저장"""
    if not data:
        print("⚠️ 저장할 데이터가 없습니다.")
        return

    # 1. 폴더 생성 (없으면 생성)
    if not os.path.exists(DB_DIR):
        try:
            os.makedirs(DB_DIR)
            print(f"📁 폴더 생성 완료: {DB_DIR}")
        except Exception as e:
            print(f"❌ 폴더 생성 실패: {e}")
            return

    # 2. 파일명 생성 (타임스탬프 포함)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_name = f"news_data_{timestamp}.json"
    file_path = os.path.join(DB_DIR, file_name)

    # 3. 저장
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        print(f"✅ 결과 저장 완료: {file_path}")
    except Exception as e:
        print(f"❌ 파일 저장 실패: {e}")

# ---------------------------------------------------------
# [Main] 실행
# ---------------------------------------------------------
if __name__ == "__main__":
    # 1. 뉴스 크롤링 (여러 명 섞어서)
    results = get_mixed_realtime_news(total_count=3)
    
    # 2. 결과 출력 (디버깅용)
    print(f"\n📊 총 수집된 뉴스: {len(results)}개")
    
    # 3. 파일로 저장
    save_to_json(results)