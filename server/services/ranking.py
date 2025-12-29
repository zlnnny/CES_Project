from __future__ import annotations

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from server.models import Entity, InfluenceEdge


def compute_power_ranking(db: Session, *, limit: int = 10) -> list[dict]:
    # score(p) = sum_a weight(p,a)
    rows = (
        db.execute(
            select(InfluenceEdge.person_id, func.sum(InfluenceEdge.weight).label("score"))
            .group_by(InfluenceEdge.person_id)
            .order_by(desc("score"))
            .limit(limit)
        )
        .all()
    )

    person_ids = [r.person_id for r in rows]
    persons = db.execute(select(Entity).where(Entity.id.in_(person_ids))).scalars().all()
    person_by_id = {p.id: p for p in persons}

    results: list[dict] = []
    for idx, r in enumerate(rows, start=1):
        person = person_by_id.get(r.person_id)
        name = person.name if person else str(r.person_id)

        # Top impacted assets (as "stocks" label)
        top_assets = (
            db.execute(
                select(InfluenceEdge.asset_id, InfluenceEdge.weight)
                .where(InfluenceEdge.person_id == r.person_id)
                .order_by(desc(InfluenceEdge.weight))
                .limit(2)
            )
            .all()
        )
        asset_ids = [a.asset_id for a in top_assets]
        assets = db.execute(select(Entity).where(Entity.id.in_(asset_ids))).scalars().all()
        asset_by_id = {a.id: a for a in assets}
        stocks = ", ".join([asset_by_id[a.asset_id].name for a in top_assets if a.asset_id in asset_by_id]) or "-"

        results.append(
            {
                "rank": idx,
                "delta": 0,
                "name": name,
                "influence": float(r.score or 0.0),
                "stocks": stocks,
            }
        )
    return results


