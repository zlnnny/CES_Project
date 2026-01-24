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
    data_dir = _data_dir()
    path = data_dir / "people.json"
    if path.exists():
        data = json.loads(path.read_text(encoding="utf-8"))
        return data.get("people", [])

    # Fallback: CSV (local edits often live here)
    csv_path = data_dir / "candidates_people.csv"
    if not csv_path.exists():
        return []

    import csv

    people: list[dict] = []
    with csv_path.open(encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = (row.get("Name") or "").strip()
            if not name:
                continue
            category = (row.get("Category") or "").strip()
            title = (row.get("Title/Company") or "").strip()
            issues_raw = (row.get("Market Influence/Key Issues") or "").strip()
            issues = [s.strip() for s in issues_raw.split(",") if s.strip()]

            descriptors: list[str] = []
            if category:
                descriptors.append(f"category: {category}")
            if title:
                descriptors.append(title)
            descriptors.extend(issues)

            people.append({"name": name, "descriptors": descriptors})
    return people


def _load_assets() -> list[dict]:
    data_dir = _data_dir()
    path = data_dir / "assets.json"
    if path.exists():
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            return data.get("assets", [])
        elif isinstance(data, list):
            return data

    # Fallback: legacy asset.json list
    legacy_path = data_dir / "asset.json"
    if not legacy_path.exists():
        return []

    data = json.loads(legacy_path.read_text(encoding="utf-8"))
    raw_assets = data if isinstance(data, list) else data.get("assets", [])
    
    assets: list[dict] = []
    for item in raw_assets:
        name = (item.get("name") or "").strip()
        if not name:
            continue
        symbol = (item.get("symbol") or "").strip()
        keywords: list[str] = []
        for val in (
            (item.get("asset_type") or "").strip(),
            (item.get("sector") or "").strip(),
            (item.get("primaryPerson") or "").strip(),
        ):
            if val:
                keywords.append(val)
        assets.append({"name": name, "symbol": symbol, "keywords": keywords})
    return assets


def seed_entities() -> None:
    db = SessionLocal()
    try:
        from sqlalchemy import delete
        # 0. Optional: Clear existing entities to avoid mess (User wants clean sync)
        # db.execute(delete(Entity)) 
        # Actually, let's just be very aggressive with updates.
        
        created = 0
        updated = 0

        # People
        for p in _load_people():
            name = (p.get("name") or "").strip()
            if not name:
                continue

            # Mapping for People:
            # - Entity.name: Person's Name
            # - Entity.title_or_company: Job Title (usually the 2nd descriptor)
            # - Entity.key_issues: Key Issues (rest of descriptors)
            
            descriptors = p.get("descriptors") or []
            category = None
            title = None
            key_issues_list = []

            for d in descriptors:
                if isinstance(d, str) and d.lower().startswith("category:"):
                    category = d.split(":", 1)[1].strip()
                elif title is None:
                    title = d
                else:
                    key_issues_list.append(d)

            key_issues = ", ".join(key_issues_list) if key_issues_list else None

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
            # Mapping for Assets (per user request):
            # - Entity.name: Ticker (symbol), e.g., "NVDA"
            # - Entity.title_or_company: Company Name, e.g., "Nvidia" (Capitalized)
            # - Entity.key_issues: Keywords/Descriptors
            
            ticker = (a.get("symbol") or "").strip()
            full_name = (a.get("name") or "").strip().title() # Capitalize first letters
            if not ticker:
                continue

            keywords = a.get("keywords") or []
            key_issues = ", ".join([k for k in keywords if isinstance(k, str) and k.strip()]) or None

            from sqlalchemy import func

            # Find existing by ticker OR by full_name (case-insensitive to catch messy records)
            existing = db.execute(
                select(Entity).where(
                    (Entity.entity_type == "asset") & 
                    (
                        (func.lower(Entity.name) == ticker.lower()) | 
                        (func.lower(Entity.name) == full_name.lower()) | 
                        (func.lower(Entity.title_or_company) == ticker.lower()) |
                        (func.lower(Entity.title_or_company) == full_name.lower())
                    )
                )
            ).all() # Use .all() to handle potential duplicates manually
            
            if existing:
                # Update all found records to the correct format
                for record in [r[0] for r in existing]:
                    print(f"Updating {record.name} -> {ticker}, {record.title_or_company} -> {full_name}")
                    record.name = ticker
                    record.title_or_company = full_name
                    record.key_issues = key_issues
                updated += 1
            else:
                db.add(
                    Entity(
                        entity_type="asset",
                        name=ticker,
                        title_or_company=full_name,
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
