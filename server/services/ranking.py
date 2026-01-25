from __future__ import annotations

import re

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from server.models import Entity
from server.services.gnn_scoring import compute_gnn_person_scores


_COUNTRY_RE = re.compile(r"\bof (?:the )?(?P<country>.+)$", re.IGNORECASE)




def _extract_country(title: str | None) -> str | None:
    if not title:
        return None
    m = _COUNTRY_RE.search(title.strip())
    if not m:
        return None
    country = m.group("country").strip()
    # Normalize common variants
    if country.lower() in {"u.s.", "us", "usa", "united states"}:
        return "United States"
    if country.lower() in {"uk", "u.k.", "united kingdom"}:
        return "United Kingdom"
    if country.lower() in {"u.a.e.", "uae", "united arab emirates"}:
        return "United Arab Emirates"
    return country


def _infer_industry_field(category: str | None, title: str | None, key_issues: str | None) -> str | None:
    """
    Best-effort classification (can be replaced with a proper taxonomy later).
    """
    text = " ".join([category or "", title or "", key_issues or ""]).lower()
    if not text.strip():
        return None

    # High-signal buckets
    if any(k in text for k in ["fed", "central bank", "ecb", "boj", "imf", "wto", "world bank", "treasury"]):
        return "Central Banks / Institutions"
    if any(k in text for k in ["defense", "nato", "security"]):
        return "Geopolitics / Defense"
    if any(k in text for k in ["semiconductor", "hbm", "gpu", "wfe", "asml", "chip", "eda"]):
        return "Semiconductors"
    if any(k in text for k in ["cloud", "saas", "software", "data analytics", "observability"]):
        return "Software / Cloud"
    if any(k in text for k in ["cybersecurity", "security appliances", "endpoint"]):
        return "Cybersecurity"
    if any(k in text for k in ["biotech", "gene therapy", "drug", "clinical", "healthcare", "medical device"]):
        return "Biotech / Healthcare"
    if any(k in text for k in ["crypto", "bitcoin", "digital asset", "coinbase"]):
        return "Crypto"
    if any(k in text for k in ["consumer", "retail", "apparel", "food", "beverage", "starbucks", "costco"]):
        return "Consumer"
    if any(k in text for k in ["travel", "lodging", "booking", "airbnb"]):
        return "Travel"
    if any(k in text for k in ["logistics", "freight", "truck"]):
        return "Logistics"

    # Fallback to coarse category if present
    if category:
        return category
    return None


def compute_power_ranking(db: Session, *, limit: int = 10) -> list[dict]:
    # Default ranking uses GNN-style propagation (prior + online edges).
    items, _debug = compute_gnn_person_scores(db, limit=limit)
    return items


def compute_country_ranking(db: Session, *, limit: int = 10) -> list[dict]:
    """
    Rank top figure per country by total influence score.
    """
    # Get top people by score (take a larger pool, then pick best per country)
    pool = [p for p in compute_power_ranking(db, limit=200) if float(p.get("influence") or 0.0) > 0.0]
    if not pool:
        return []

    # Map name -> Entity for country extraction
    names = [p["name"] for p in pool]
    entities = db.execute(select(Entity).where(Entity.entity_type == "person", Entity.name.in_(names))).scalars().all()
    ent_by_name = {e.name: e for e in entities}

    best_by_country: dict[str, dict] = {}
    for item in pool:
        e = ent_by_name.get(item["name"])
        country = _extract_country(e.title_or_company if e else None)
        if not country:
            continue
        enriched = {**item, "country": country}
        prev = best_by_country.get(country)
        if prev is None or enriched["influence"] > prev["influence"]:
            best_by_country[country] = enriched

    ranked = sorted(best_by_country.values(), key=lambda x: x["influence"], reverse=True)[:limit]
    for i, r in enumerate(ranked, start=1):
        r["rank"] = i
    return ranked


def compute_industry_ranking(db: Session, *, limit: int = 10) -> list[dict]:
    """
    Rank top figure per inferred industry field by total influence score.
    """
    pool = [p for p in compute_power_ranking(db, limit=200) if float(p.get("influence") or 0.0) > 0.0]
    if not pool:
        return []

    names = [p["name"] for p in pool]
    entities = db.execute(select(Entity).where(Entity.entity_type == "person", Entity.name.in_(names))).scalars().all()
    ent_by_name = {e.name: e for e in entities}

    best_by_field: dict[str, dict] = {}
    for item in pool:
        e = ent_by_name.get(item["name"])
        field = _infer_industry_field(e.category if e else None, e.title_or_company if e else None, e.key_issues if e else None)
        if not field:
            continue
        enriched = {**item, "field": field}
        prev = best_by_field.get(field)
        if prev is None or enriched["influence"] > prev["influence"]:
            best_by_field[field] = enriched

    ranked = sorted(best_by_field.values(), key=lambda x: x["influence"], reverse=True)[:limit]
    for i, r in enumerate(ranked, start=1):
        r["rank"] = i
    return ranked
