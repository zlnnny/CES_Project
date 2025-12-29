import feedparser
import urllib.parse
import json
import os
from datetime import datetime
import requests
from newspaper import Article, Config
import random

# JSON 파일 경로 설정 (server/data/assets.json)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_FILE_PATH = os.path.join(BASE_DIR, "data", "assets.json")
PEOPLE_FILE_PATH = os.path.join(BASE_DIR, "data", "people.json")

def load_assets_from_json():
    """assets.json 파일을 읽어서 자산 리스트를 반환"""
    try:
        with open(ASSETS_FILE_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get("assets", [])
    except Exception as e:
        print(f"⚠️ 자산 파일 로드 실패: {e}")
        return []

def get_realtime_news(leader_name="None", limit=3):
    if not leader_name:
        leader_name = load_random_leader_from_json()
    print(f"🔍 [Crawler] {leader_name} 뉴스 수집 시작 (AI 분석 제외, 자산 매칭만 수행)...")
    
    # 1. 자산 데이터 로드
    assets_list = load_assets_from_json()
    
    encoded_name = urllib.parse.quote(leader_name)
    url = f"https://news.google.com/rss/search?q={encoded_name}&hl=en-US&gl=US&ceid=US:en"
    
    headers = {"User-Agent": "Mozilla/5.0"}
    news_results = []
    
    try:
        resp = requests.get(url, headers=headers, timeout=5)
        if resp.status_code == 200:
            feed = feedparser.parse(resp.content)
            
            for entry in feed.entries[:limit]:
                try:
                    pub_date = datetime(*entry.published_parsed[:6])
                except:
                    pub_date = datetime.now()

                # 2. 본문 추출
                full_content = _fetch_article_content(entry.link)
                
                # 3. 자산 매칭 (감성 분석 X)
                search_text = f"{entry.title} {full_content}"
                found_assets = _extract_assets(search_text, assets_list)

                news_item = {
                    "leader_name": leader_name,
                    "title": entry.title,
                    "url": entry.link,
                    "source": "Google News",
                    "published_at": pub_date,
                    
                    "tone": None,
                    "sentiment": None,
                    
                    "impact_assets": found_assets
                }
                news_results.append(news_item)
    except Exception as e:
        print(f"❌ 크롤링 에러: {e}")

    return news_results

def _fetch_article_content(url):
    try:
        config = Config()
        config.browser_user_agent = 'Mozilla/5.0'
        config.request_timeout = 3
        article = Article(url, config=config)
        article.download()
        article.parse()
        return article.text[:3000] if len(article.text) > 50 else ""
    except:
        return ""

def _extract_assets(text, assets_list):
    """
    텍스트에서 JSON에 정의된 자산(키워드)이 있는지 확인
    """
    text_lower = text.lower()
    found_assets = []
    
    for asset in assets_list:
        # 자산의 symbol, name, keywords를 모두 검사
        # 1. Symbol 확인 (대문자로 비교하거나 앞뒤 공백 체크 추천하지만, 여기선 단순 포함)
        # if asset['symbol'] and asset['symbol'].lower() in text_lower:
        #     found_assets.append(asset['name'])
        #     continue
            
        # 2. Name 확인
        if asset['name'].lower() in text_lower:
            found_assets.append(asset['name'])
            continue
            
        # 3. Keywords 확인
        for keyword in asset['keywords']:
            if keyword.lower() in text_lower:
                found_assets.append(asset['name'])
                break # 키워드 하나라도 발견되면 해당 자산 추가하고 다음 자산으로
    
    unique_assets = list(set(found_assets))
    return unique_assets[:3]# 중복 제거 후 반환