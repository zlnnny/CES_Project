from __future__ import annotations

import json
from pathlib import Path

import sys

# Allow running both as `python -m server.seed` and `python server/seed.py`
if __package__ is None:  # pragma: no cover
    sys.path.append(str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select

from server.db import SessionLocal
from server.models import Entity


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATA_DIR = ROOT / "server" / "data"
PRIVATE_DATA_DIR = ROOT / "private_data"


def _data_dir() -> Path:
    """
    Seed source files are intentionally not committed to git.
    Priority:
    1) SEED_DATA_DIR env var
    2) ./private_data (recommended)
    3) ./server/data (legacy fallback)
    """
    import os

    env_dir = os.getenv("SEED_DATA_DIR")
    if env_dir:
        return Path(env_dir).expanduser().resolve()
    if (PRIVATE_DATA_DIR / "people.json").exists() or (PRIVATE_DATA_DIR / "assets.json").exists():
        return PRIVATE_DATA_DIR
    return DEFAULT_DATA_DIR


def _load_people() -> list[dict]:
    path = _data_dir() / "people.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    return data.get("people", [])


def _load_assets() -> list[dict]:
    path = _data_dir() / "assets.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    return data.get("assets", [])


def seed_entities() -> None:
    db = SessionLocal()
    try:
        created = 0
        updated = 0

        # People
        for p in _load_people():
            name = (p.get("name") or "").strip()
            if not name:
                continue

            # Map to our Entity schema fields
            descriptors = p.get("descriptors") or []
            category = None
            title = None
            key_issues = None

            # heuristics: we stored "category: X" first
            for d in descriptors:
                if isinstance(d, str) and d.lower().startswith("category:"):
                    category = d.split(":", 1)[1].strip()
                    continue
                if title is None and isinstance(d, str) and len(d) <= 80:
                    title = d
                    continue

            # rest as key issues (comma join)
            rest = [d for d in descriptors if isinstance(d, str) and not d.lower().startswith("category:")]
            if rest:
                key_issues = ", ".join(rest[1:]) if len(rest) > 1 else rest[0]

            existing = db.execute(
                select(Entity).where(Entity.entity_type == "person", Entity.name == name)
            ).scalar_one_or_none()

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

        # Assets
        for a in _load_assets():
            name = (a.get("name") or "").strip()
            if not name:
                continue

            # Map asset fields into Entity schema fields
            symbol = (a.get("symbol") or "").strip() or None
            keywords = a.get("keywords") or []
            key_issues = ", ".join([k for k in keywords if isinstance(k, str) and k.strip()]) or None

            existing = db.execute(
                select(Entity).where(Entity.entity_type == "asset", Entity.name == name)
            ).scalar_one_or_none()
            if existing:
                existing.title_or_company = symbol or existing.title_or_company
                existing.key_issues = key_issues or existing.key_issues
                updated += 1
            else:
                db.add(
                    Entity(
                        entity_type="asset",
                        name=name,
                        title_or_company=symbol,
                        key_issues=key_issues,
                    )
                )
                created += 1

        db.commit()
        print(f"✅ seeded entities: created={created}, updated={updated}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_entities()


