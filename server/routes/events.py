from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from server.deps import get_db
from server.models import Entity, InfluenceEdge, NewsEvent
from server.schemas import NewsIngestRequest

router = APIRouter(prefix="/api", tags=["events"])


@router.post("/events/ingest")
def ingest_events(req: NewsIngestRequest, db: Session = Depends(get_db)):
    """
    Accepts events from ANY crawler/mapper implementation.
    - stores raw events into news_events
    - updates influence_edges(person -> asset) using a simple online update rule
    """

    rho = float(req.rho)
    updated_edges = 0
    inserted_events = 0

    for ev in req.events:
        # store raw event
        db.add(
            NewsEvent(
                leader_name=ev.leader_name,
                title=ev.title,
                url=ev.url,
                source=ev.source,
                published_at=ev.published_at,
                sentiment=ev.sentiment,
                importance=ev.importance,
            )
        )
        inserted_events += 1

        # ensure leader entity exists (person)
        leader = db.execute(
            select(Entity).where(Entity.entity_type == "person", Entity.name == ev.leader_name)
        ).scalar_one_or_none()
        if not leader:
            leader = Entity(entity_type="person", name=ev.leader_name)
            db.add(leader)
            db.flush()  # assign id

        # update edges if assets are provided
        if not ev.asset_names:
            continue

        delta = float((ev.sentiment or 0.0) * (ev.importance or 1.0))
        for asset_name in ev.asset_names:
            asset = db.execute(
                select(Entity).where(Entity.entity_type == "asset", Entity.name == asset_name)
            ).scalar_one_or_none()
            if not asset:
                asset = Entity(entity_type="asset", name=asset_name)
                db.add(asset)
                db.flush()

            edge = db.execute(
                select(InfluenceEdge).where(InfluenceEdge.person_id == leader.id, InfluenceEdge.asset_id == asset.id)
            ).scalar_one_or_none()
            if edge:
                edge.weight = rho * float(edge.weight or 0.0) + delta
            else:
                db.add(InfluenceEdge(person_id=leader.id, asset_id=asset.id, weight=delta))
            updated_edges += 1

    db.commit()
    return {"inserted_events": inserted_events, "updated_edges": updated_edges}


