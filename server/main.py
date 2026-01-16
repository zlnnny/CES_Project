from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import threading

from server.crawler import get_realtime_news
from server.db import get_engine
from server.deps import get_db
from server.models import Base
from server.routes import entities as entities_router
from server.routes import events as events_router
from server.routes import ranking as ranking_router
from server.frontend_crawler import get_latest_frontend_news
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


@app.on_event("startup")
def _startup_create_tables():
    # Minimal setup for local/dev. For production, prefer Alembic migrations.
    # DB가 아직 안 떠있어도 API 자체는 뜰 수 있게(프론트 개발 편의) 실패를 무시합니다.
    # IMPORTANT: never block API startup on DB connectivity.
    def _run():
        try:
            Base.metadata.create_all(bind=get_engine())
            print("✅ DB connected (tables ensured)")
        except Exception as e:
            print(f"⚠️ DB not available yet: {e}")

    threading.Thread(target=_run, daemon=True).start()


app.include_router(entities_router.router)
app.include_router(events_router.router)
app.include_router(ranking_router.router)


cached_news = []
last_crawled_time = None

@app.get("/api/news/today")
def read_todays_news(force_refresh: bool = False):
    global cached_news, last_crawled_time
    
    current_time = datetime.now()
    
    # 1. 강제 새로고침 요청이 들어왔을 때
    if force_refresh:
        # [안전장치] 마지막 크롤링 후 1분이 안 지났으면 거절 (리소스 보호)
        if last_crawled_time and (current_time - last_crawled_time < timedelta(minutes=1)):
            return {
                "status": "cached",
                "message": "Try again in 1 minute.",
                "last_updated": last_crawled_time.strftime('%Y-%m-%d %H:%M:%S'),
                "news": cached_news
            }
        print("🚀 [Force] 강제 업데이트 요청! 크롤링 시작...")
        
    # 2. 일반 요청: 캐시가 있고 10분이 안 지났으면 캐시 반환
    elif cached_news and last_crawled_time:
        time_diff = current_time - last_crawled_time
        if time_diff < timedelta(minutes=10):
            print(f"⚡ [Cache] 캐시된 데이터 반환")
            return {
                "status": "success",
                "last_updated": last_crawled_time.strftime('%Y-%m-%d %H:%M:%S'),
                "news": cached_news
            }

    # 3. 크롤링 실행 (데이터가 없거나, 시간이 만료됐거나, 강제 요청일 때)
    try:
        # Keep this endpoint responsive for the frontend (time-boxed).
        new_data = get_latest_frontend_news(target_count=3, time_budget_s=8.0)
        if new_data:
            cached_news = new_data
            last_crawled_time = current_time
    except Exception as e:
        print(f"❌ 크롤링 실패: {e}")
        # 실패하면 기존 캐시라도 보냄
    
    # 최종 응답
    return {
        "status": "success",
        "last_updated": last_crawled_time.strftime('%Y-%m-%d %H:%M:%S') if last_crawled_time else None,
        "news": cached_news
    }

@app.get("/api/health/db")
def health_db(db: Session = Depends(get_db)):
    # simple connectivity check
    db.execute(text("SELECT 1"))
    return {"ok": True}




if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

