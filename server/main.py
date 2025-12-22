from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from crawler import get_realtime_news
import json
import os

app = FastAPI()

# CORS 설정 (프론트엔드에서 API 호출 허용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 실제 배포 시에는 특정 도메인만 허용해야 함
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Market Voice API is running!"}

@app.get("/api/news")
def get_news():
    try:
        print("📡 실시간 뉴스 요청 받음...")
        # 1. 크롤러 실행
        live_data = get_realtime_news("Donald Trump", limit=3)
        
        # 2. 데이터가 비어있으면(크롤링 실패 시) 빈 리스트 반환
        if not live_data:
            print("⚠️ 크롤링 결과 없음")
            return [] 
            
        print(f"✅ {len(live_data)}개 뉴스 반환 성공")
        return live_data

    except Exception as e:
        print(f"❌ 서버 에러: {e}")
        # 에러가 나도 객체({"error":...}) 대신 빈 리스트를 보내서 프론트 멈춤 방지
        return []

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

