import feedparser
import urllib.parse
import json
import os
from datetime import datetime, timedelta
import requests
from newspaper import Article, Config
import random
import time

# ---------------------------------------------------------
# [설정] 뉴스 치트키 인물 리스트 (VIP)
# ---------------------------------------------------------
VIP_LEADERS = [
    "Donald Trump", 
    "Elon Musk", 
    "Jerome Powell", 
    "Joe Biden", 
    "Sam Altman", 
    "Jensen Huang",
    "Mark Zuckerberg",
    "Tim Cook"
]

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_FILE_PATH = os.path.join(BASE_DIR, "data", "assets.json")

# ---------------------------------------------------------
# [기능 1] 자산 로드
# ---------------------------------------------------------
def load_assets():
    path = ASSETS_FILE_PATH
    if not os.path.exists(path):
        path = path.replace("server/data", "data")
    try:
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                return json.load(f).get("assets", [])
    except:
        pass
    return []

# ---------------------------------------------------------
# [기능 2] 헬퍼 함수
# ---------------------------------------------------------
def _fetch_article_content(url):
    try:
        config = Config()
        config.browser_user_agent = 'Mozilla/5.0'
        # Article downloads are slow/unreliable for a realtime UI; keep this tight.
        config.request_timeout = 1.5
        article = Article(url, config=config)
        article.download()
        article.parse()
        return article.text[:3000] if len(article.text) > 50 else ""
    except:
        return ""

def _extract_assets(text, assets_list):
    text_lower = text.lower()
    found = []
    for asset in assets_list:
        if asset['name'].lower() in text_lower:
            found.append(asset['name'])
            continue
        for kw in asset.get('keywords', []):
            if kw.lower() in text_lower:
                found.append(asset['name'])
                break
    return list(set(found))[:3]

# ---------------------------------------------------------
# [기능 3] 핵심: 24시간 이내 뉴스 강제 수집
# ---------------------------------------------------------
def get_latest_frontend_news(target_count=3 ,time_budget_s=None):
    print("⏰ [Fresh Crawler] 24시간 이내 최신 뉴스만 검색합니다...")
    
    assets_list = load_assets()
    final_results = []
    started = time.time()
    budget = float(time_budget_s or 8.0)
    
    # VIP 중에서 랜덤 선택
    if len(VIP_LEADERS) < target_count:
        targets = VIP_LEADERS
    else:
        targets = random.sample(VIP_LEADERS, target_count)
    
    print(f"👉 타겟 인물: {targets}")

    for leader in targets:
        if (time.time() - started) > budget:
            break
        try:
            # 💡 [핵심 변경 1] 검색어에 'when:1d' 추가 (지난 24시간 데이터만 요청)
            # finance 키워드는 유지하되, 1d 옵션으로 옛날 분석 기사 차단
            query = f"{leader} finance when:1d"
            encoded_query = urllib.parse.quote(query)
            
            # 💡 [핵심 변경 2] URL 파라미터에 scoring=n 추가 (Newest First 정렬)
            rss_url = f"https://news.google.com/rss/search?q={encoded_query}&hl=en-US&gl=US&ceid=US:en&scoring=n"
            
            remaining = max(0.5, budget - (time.time() - started))
            resp = requests.get(rss_url, headers={"User-Agent": "Mozilla/5.0"}, timeout=min(3.0, remaining))
            feed = feedparser.parse(resp.content)
            
            # 결과가 없으면 'finance' 떼고 다시 한 번 시도 (Fallback)
            if not feed.entries:
                print(f"   ⚠️ {leader}: 금융 뉴스 없음. 일반 최신 뉴스로 재시도...")
                query_fallback = f"{leader} when:1d"
                encoded_fallback = urllib.parse.quote(query_fallback)
                rss_url = f"https://news.google.com/rss/search?q={encoded_fallback}&hl=en-US&gl=US&ceid=US:en&scoring=n"
                remaining = max(0.5, budget - (time.time() - started))
                resp = requests.get(rss_url, headers={"User-Agent": "Mozilla/5.0"}, timeout=min(3.0, remaining))
                feed = feedparser.parse(resp.content)

            if not feed.entries:
                print(f"   ❌ {leader}: 24시간 내 뉴스 아예 없음 (스킵)")
                continue

            # 가장 위(최신) 기사 선택
            entry = feed.entries[0]
            
            # 날짜 파싱 (실패시 현재시간)
            try:
                dt = datetime(*entry.published_parsed[:6])
                # 혹시 모르니 미래 시간이면 현재 시간으로 보정
                if dt > datetime.now():
                    dt = datetime.now()
                pub_date = dt.strftime('%Y-%m-%d %H:%M:%S')
            except:
                pub_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

            # Fast mode: don't download full articles (keeps endpoint responsive)
            summary = getattr(entry, "summary", "") or ""
            search_text = f"{entry.title} {summary}"
            found_assets = _extract_assets(search_text, assets_list)
            
            news_item = {
                "leader_name": leader,
                "title": entry.title,
                "url": entry.link,
                "source": "Google News",
                "published_at": pub_date,
                "tone": random.choice(["Hawkish", "Dovish", "Neutral"]),
                "sentiment": round(random.uniform(-0.8, 0.8), 2),
                "impact_assets": found_assets
            }
            
            final_results.append(news_item)
            print(f"   ✅ {leader}: 최신 뉴스 확보 ({pub_date})")
            if len(final_results) >= target_count:
                break

        except Exception as e:
            print(f"❌ {leader} 에러: {e}")
            continue

    return final_results