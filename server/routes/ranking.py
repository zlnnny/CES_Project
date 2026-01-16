from __future__ import annotations

import json
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import APIRouter, Depends
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from server.deps import get_db
from server.models import Entity, InfluenceEdge
from server.schemas import PowerRankingResponse
from server.services.ranking import compute_country_ranking, compute_industry_ranking, compute_power_ranking

router = APIRouter(prefix="/api", tags=["ranking"])

# Keep UI responsive: cache last successful ranking response briefly.
_CACHE: dict[int, tuple[datetime, PowerRankingResponse]] = {}
_TTL = timedelta(seconds=15)

ROOT = Path(__file__).resolve().parents[2]


def _seed_source_dir() -> Path | None:
    """
    Try to find seed JSON files (people/assets).
    - Prefer SEED_DATA_DIR env var.
    - Otherwise, try the user's main folder private_data if present.
    - Otherwise, try repo-local ./private_data or ./server/data.
    """
    import os

    env_dir = os.getenv("SEED_DATA_DIR")
    if env_dir:
        p = Path(env_dir).expanduser().resolve()
        return p if p.exists() else None

    # common local path on this machine
    desktop_private = Path.home() / "Desktop" / "CES_2026_project" / "CES_Project" / "private_data"
    if desktop_private.exists():
        return desktop_private

    repo_private = ROOT / "private_data"
    if repo_private.exists():
        return repo_private

    repo_data = ROOT / "server" / "data"
    if repo_data.exists():
        return repo_data

    return None


def _maybe_seed_people(db: Session, *, min_people: int) -> None:
    """
    If DB has too few people, best-effort seed from people.json (if available).
    This enables the UI to always render 1..N (e.g. 30) even before events/edges exist.
    """
    count = db.execute(select(func.count()).select_from(Entity).where(Entity.entity_type == "person")).scalar_one()
    if int(count) >= int(min_people):
        return

    src = _seed_source_dir()
    if not src:
        return
    people_path = src / "people.json"
    if not people_path.exists():
        return

    data = json.loads(people_path.read_text(encoding="utf-8"))
    created = 0
    updated = 0
    for p in (data.get("people") or []):
        name = (p.get("name") or "").strip()
        if not name:
            continue

        descriptors = p.get("descriptors") or []
        category = None
        title = None
        key_issues = None
        for d in descriptors:
            if isinstance(d, str) and d.lower().startswith("category:"):
                category = d.split(":", 1)[1].strip()
                continue
            if title is None and isinstance(d, str) and len(d) <= 80:
                title = d
                continue
        rest = [d for d in descriptors if isinstance(d, str) and not d.lower().startswith("category:")]
        if rest:
            key_issues = ", ".join(rest[1:]) if len(rest) > 1 else rest[0]

        existing = db.execute(select(Entity).where(Entity.entity_type == "person", Entity.name == name)).scalar_one_or_none()
        if existing:
            existing.category = category or existing.category
            existing.title_or_company = title or existing.title_or_company
            existing.key_issues = key_issues or existing.key_issues
            updated += 1
        else:
            db.add(
                Entity(
                    entity_type="person",
                    category=category,
                    name=name,
                    title_or_company=title,
                    key_issues=key_issues,
                )
            )
            created += 1

        if int(count) + created >= int(min_people):
            break

    if created or updated:
        db.commit()


def _ensure_limit_items(db: Session, items: list[dict] | None, *, limit: int) -> list[dict]:
    """
    Ensure the frontend always receives exactly `limit` items.
    If scorer returns fewer than limit, fill remaining slots from DB people (alphabetical) with influence=0.
    """
    lim = max(1, int(limit))
    base = [x for x in (items or []) if isinstance(x, dict)]

    out: list[dict] = []
    seen: set[str] = set()
    for x in base:
        name = (x.get("name") or "").strip()
        if not name or name in seen:
            continue
        out.append(
            {
                "rank": 0,  # overwritten
                "delta": int(x.get("delta") or 0),
                "name": name,
                "influence": float(x.get("influence") or 0.0),
                "stocks": str(x.get("stocks") or "-") or "-",
            }
        )
        seen.add(name)
        if len(out) >= lim:
            break

    if len(out) < lim:
        people = db.execute(select(Entity).where(Entity.entity_type == "person").order_by(Entity.name)).scalars().all()
        for p in people:
            if p.name in seen:
                continue
            out.append({"rank": 0, "delta": 0, "name": p.name, "influence": 0.0, "stocks": "-"})
            if len(out) >= lim:
                break

    for i, r in enumerate(out[:lim], start=1):
        r["rank"] = i
    return out[:lim]


@router.get("/power-ranking", response_model=PowerRankingResponse)
def get_power_ranking(limit: int = 10, force: bool = False, db: Session = Depends(get_db)):
    now = datetime.now()
    lim = max(1, int(limit))

    if not force:
        hit = _CACHE.get(lim)
        if hit:
            cached_at, cached_resp = hit
            if now - cached_at < _TTL:
                return cached_resp

    # Always try to have enough people for a full UI render.
    try:
        _maybe_seed_people(db, min_people=lim)
    except Exception:
        pass

    try:
        items = compute_power_ranking(db, limit=lim)
        country_items = compute_country_ranking(db, limit=min(lim, 10))
        industry_items = compute_industry_ranking(db, limit=min(lim, 10))
        filled = _ensure_limit_items(db, items, limit=lim)
        resp = PowerRankingResponse(items=filled, country_items=country_items, industry_items=industry_items)
        _CACHE[lim] = (now, resp)
        return resp
    except Exception:
        # Fail fast: return cached response if we have it, otherwise names-only filler.
        hit = _CACHE.get(lim)
        if hit:
            return hit[1]
        filled = _ensure_limit_items(db, [], limit=lim)
        return PowerRankingResponse(items=filled, country_items=[], industry_items=[])


# 상세 페이지 용 인물과 연결된 자산 가져오기
@router.get("/leader/{name}/assets")
def get_leader_assets(name: str, db: Session = Depends(get_db)):
    person = db.execute(select(Entity).where(Entity.entity_type == "person", Entity.name == name)).scalar_one_or_none()
    if not person:
        return []

    stmt = (
        select(Entity.name, InfluenceEdge.weight)
        .join(InfluenceEdge, InfluenceEdge.asset_id == Entity.id)
        .where(InfluenceEdge.person_id == person.id)
        .order_by(desc(InfluenceEdge.weight))
        .limit(6)
    )
    results = db.execute(stmt).all()

    data = []
    for asset_name, weight in results:
        fake_symbol = (asset_name or "")[:4].upper() or "----"
        data.append({"symbol": fake_symbol, "name": asset_name, "score": round(float(weight or 0.0), 2)})
    return data
