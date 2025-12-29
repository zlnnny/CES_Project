from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from server.crawler import get_realtime_news
from server.db import get_engine
from server.deps import get_db
from server.models import Base
from server.routes import entities as entities_router
from server.routes import events as events_router
from server.routes import ranking as ranking_router

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
    try:
        Base.metadata.create_all(bind=get_engine())
        print("✅ DB connected (tables ensured)")
    except Exception as e:
        print(f"⚠️ DB not available yet: {e}")


app.include_router(entities_router.router)
app.include_router(events_router.router)
app.include_router(ranking_router.router)


@app.get("/api/health/db")
def health_db(db: Session = Depends(get_db)):
    # simple connectivity check
    db.execute(text("SELECT 1"))
    return {"ok": True}




if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

