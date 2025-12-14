import json
import random
import os

def mock_analyze_news():
    # 1. 수집된 뉴스 데이터 로드
    current_dir = os.path.dirname(os.path.abspath(__file__))
    input_file = os.path.join(current_dir, "trump_news_data.json")
    output_file = os.path.join(current_dir, "trump_news_analyzed.json")
    
    try:
        with open(input_file, "r", encoding="utf-8") as f:
            news_data = json.load(f)
            
        print(f"Loaded {len(news_data)} news items.")
        
        analyzed_data = []
        
        # 2. 각 뉴스에 대해 가짜 AI 분석 결과 추가
        for article in news_data:
            # 랜덤하게 감성 점수 생성 (-1.0 ~ 1.0)
            sentiment_score = round(random.uniform(-1.0, 1.0), 2)
            
            # 랜덤하게 매파/비둘기파 결정
            tone = random.choice(["Hawkish", "Dovish", "Neutral"])
            
            # 랜덤하게 관련 자산 선택
            assets = random.sample(["S&P 500", "NASDAQ", "USD Index", "Gold", "Bitcoin", "10Y Treasury"], k=random.randint(1, 3))
            
            # 가짜 요약 생성
            summary = f"AI summary for: {article['title'][:30]}..."
            
            # 분석 결과 추가
            article["analysis"] = {
                "sentiment_score": sentiment_score,
                "tone": tone,
                "impact_assets": assets,
                "summary": summary,
                "confidence": round(random.uniform(0.7, 0.99), 2) # AI 확신도
            }
            
            analyzed_data.append(article)
            print(f"Analyzed: {article['title'][:30]}... -> {tone}, {sentiment_score}")
            
        # 3. 분석된 데이터 저장
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(analyzed_data, f, indent=4, ensure_ascii=False)
            
        print(f"\nSuccessfully saved analyzed data to {output_file}")
        
    except FileNotFoundError:
        print(f"Error: {input_file} not found. Please run collect_data.py first.")
    except Exception as e:
        print(f"Error occurred: {e}")

if __name__ == "__main__":
    mock_analyze_news()

