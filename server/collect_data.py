import requests
from bs4 import BeautifulSoup
import json
import os

def collect_trump_news():
    # 구글 뉴스 RSS 피드 (Donald Trump 검색, 영어/미국 설정)
    url = "https://news.google.com/rss/search?q=Donald+Trump+economy+market&hl=en-US&gl=US&ceid=US:en"
    
    print(f"Fetching news from: {url}...")
    
    try:
        response = requests.get(url)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, features="xml")
        items = soup.find_all("item")
        
        news_data = []
        
        print(f"Found {len(items)} news items.")
        
        for item in items[:10]: # 상위 10개만 수집
            title = item.title.text
            link = item.link.text
            pub_date = item.pubDate.text
            source = item.source.text
            
            # 간단한 데이터 구조 생성
            article = {
                "leader": "Donald Trump",
                "title": title,
                "link": link,
                "pub_date": pub_date,
                "source": source
            }
            news_data.append(article)
            print(f"- [{source}] {title}")

        # JSON 파일로 저장 (현재 스크립트 위치 기준)
        current_dir = os.path.dirname(os.path.abspath(__file__))
        output_file = os.path.join(current_dir, "trump_news_data.json")
        
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(news_data, f, indent=4, ensure_ascii=False)
            
        print(f"\nSuccessfully saved data to {output_file}")
        
    except Exception as e:
        print(f"Error occurred: {e}")

if __name__ == "__main__":
    collect_trump_news()

