import feedparser
import urllib.parse
from datetime import datetime
import random
import requests

def get_realtime_news(leader_name="Donald Trump", limit=3):
    print(f"🔍 DEBUG: {leader_name} 뉴스 수집 시작...")
    
    # 1. 구글 뉴스 URL 설정
    encoded_name = urllib.parse.quote(leader_name)
    url = f"https://news.google.com/rss/search?q={encoded_name}&hl=en-US&gl=US&ceid=US:en"
    
    # 2. 봇 차단 방지 헤더
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }

    news_results = []
    
    try:
        # 요청 보내기 (3초 타임아웃)
        resp = requests.get(url, headers=headers, timeout=3)
        
        if resp.status_code == 200:
            feed = feedparser.parse(resp.content)
            print(f"✅ 구글 뉴스 {len(feed.entries)}개 발견")
            
            for entry in feed.entries[:limit]:
                # 날짜 처리
                try:
                    pub_date = entry.published
                except:
                    pub_date = datetime.now().isoformat()

                news_item = {
                    "leader": leader_name,
                    "title": entry.title,
                    "link": entry.link,
                    "pub_date": pub_date,
                    "source": "Google News",
                    "analysis": _generate_mock_analysis() # 분석 데이터는 가짜로 생성
                }
                news_results.append(news_item)
        else:
            print(f"⚠️ 접속 실패 (상태코드: {resp.status_code})")

    except Exception as e:
        print(f"❌ 크롤링 에러 발생: {e}")

    # [핵심] 만약 수집된 뉴스가 0개라면, 강제로 데이터를 만들어서 반환 (화면이 비지 않게)
    if not news_results:
        print("🚨 뉴스 수집 실패 -> 예시 데이터(Fallback) 생성 중...")
        return _generate_fallback_data(leader_name, limit)

    return news_results

def _generate_mock_analysis():
    """랜덤 분석 데이터 생성"""
    tones = ["Hawkish", "Dovish", "Neutral"]
    assets = ["USD Index", "Gold", "Bitcoin", "S&P 500", "10Y Treasury", "NASDAQ"]
    return {
        "sentiment_score": round(random.uniform(-0.9, 0.9), 2),
        "tone": random.choice(tones),
        "impact_assets": random.sample(assets, 2),
        "summary": "AI Analysis Pending...",
        "confidence": 0.85
    }

def _generate_fallback_data(leader_name, limit):
    """크롤링 실패 시 보여줄 예시 데이터"""
    fallback_list = []
    for i in range(limit):
        fallback_list.append({
            "leader": leader_name,
            "title": f"[{leader_name}] Recent market updates and economic policy overview (System Data {i+1})",
            "link": "https://news.google.com",
            "pub_date": datetime.now().isoformat(),
            "source": "Market Voice System",
            "analysis": _generate_mock_analysis()
        })
    return fallback_list

if __name__ == "__main__":
    print(get_realtime_news())