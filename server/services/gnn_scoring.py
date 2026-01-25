from __future__ import annotations

import math
import re
from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.orm import Session

from server.models import Entity, InfluenceEdge


_TOK_RE = re.compile(r"[a-z0-9]+(?:'[a-z0-9]+)?", re.IGNORECASE)
_STOP = {
    "of",
    "the",
    "and",
    "or",
    "to",
    "in",
    "for",
    "a",
    "an",
    "on",
    "with",
    "at",
    "by",
    "from",
}

# Manual score multipliers (edit values to tune).
# Always treated as absolute multipliers (0.85 -> x0.85, 1.18 -> x1.18).
PEOPLE_SCORE_BOOSTS: dict[str, float] = {
    "Elon Musk": 1.18,
    "Mark Zuckerberg": 1.12,
    "Tim Cook": 1.12,
    "Jensen Huang": 1.18,
    "Sam Altman": 1.12,
    "Joe Biden": 0.01,
    "Donald Trump": 1.10,
    "Jerome Powell": 1.15,
    "Satya Nadella": 10.12,
    "Sundar Pichai": 1.12,
    "Gary Dickerson": 0.10,
}


def tokens(text: str | None) -> set[str]:
    if not text:
        return set()
    toks = {m.group(0).lower() for m in _TOK_RE.finditer(text)}
    return {t for t in toks if t not in _STOP and len(t) >= 3}


def entity_terms(e: Entity) -> set[str]:
    # Use all descriptor-ish fields we have in DB.
    return tokens(" ".join([e.category or "", e.title_or_company or "", e.key_issues or "", e.name or ""]))


def jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    # Use bitwise operators for set operations, they are usually faster in Python
    inter_len = len(a & b)
    if inter_len == 0:
        return 0.0
    union_len = len(a | b)
    return inter_len / union_len


def compute_gnn_person_scores(
    db: Session,
    *,
    limit: int = 10,
    iters: int = 2,
    alpha: float = 0.65,
    prior_lambda: float = 0.25,
    prior_topk: int = 4,
    prior_threshold: float = 0.12,
) -> tuple[list[dict], dict]:
    """
    Lightweight GNN-style scoring over a bipartite graph:
      people --(edge weight)--> assets

    - Online edges come from InfluenceEdge (news-driven).
    - Prior edges are added on-the-fly from descriptor overlap (Jaccard) and NOT persisted.
    - Message passing (GCN-ish normalization) runs for `iters` steps.

    Returns:
      (ranked_items, debug_info)
    """
    # Load entities
    persons = db.execute(select(Entity).where(Entity.entity_type == "person")).scalars().all()
    assets = db.execute(select(Entity).where(Entity.entity_type == "asset")).scalars().all()
    if not persons:
        return ([], {"reason": "no_people"})

    person_by_id = {p.id: p for p in persons}
    asset_by_id = {a.id: a for a in assets}

    # Base edges from DB
    edge_w: dict[tuple, float] = {}
    edges_from_db = db.execute(select(InfluenceEdge)).scalars().all()
    for e in edges_from_db:
        if e.person_id in person_by_id and e.asset_id in asset_by_id:
            edge_w[(e.person_id, e.asset_id)] = float(e.weight or 0.0)

    # Prior edges from descriptor overlap (top-k per person)
    # Pre-tokenize all once
    person_terms = {p.id: entity_terms(p) for p in persons}
    asset_terms = {a.id: entity_terms(a) for a in assets}

    prior_added = 0
    if assets and prior_lambda > 0:
        # Pre-filter assets that have at least one term
        valid_assets = [(aid, terms) for aid, terms in asset_terms.items() if terms]
        
        for p in persons:
            pt = person_terms.get(p.id)
            if not pt:
                continue
            
            scored: list[tuple[float, int]] = []
            for aid, at in valid_assets:
                sim = jaccard(pt, at)
                if sim >= prior_threshold:
                    scored.append((sim, aid))
            
            if not scored:
                continue
                
            scored.sort(key=lambda x: x[0], reverse=True)
            for sim, aid in scored[:prior_topk]:
                key = (p.id, aid)
                if key not in edge_w:
                    edge_w[key] = prior_lambda * float(sim)
                    prior_added += 1
                else:
                    edge_w[key] = float(edge_w[key]) + prior_lambda * float(sim)

    # Degrees for normalization (use abs weights so negatives don't collapse degrees)
    deg_p = defaultdict(float)
    deg_a = defaultdict(float)
    for (pid, aid), w in edge_w.items():
        aw = abs(float(w))
        if aw <= 0:
            continue
        deg_p[pid] += aw
        deg_a[aid] += aw

    # Base person score (online+prior)
    base_p = defaultdict(float)
    for (pid, _aid), w in edge_w.items():
        base_p[pid] += float(w)

    # Initialize person features as base
    h_p = {pid: float(base_p.get(pid, 0.0)) for pid in person_by_id.keys()}
    h_a = {aid: 0.0 for aid in asset_by_id.keys()}

    def norm(pid, aid, w):
        dp = deg_p.get(pid, 0.0)
        da = deg_a.get(aid, 0.0)
        if dp <= 0 or da <= 0:
            return 0.0
        return float(w) / math.sqrt(dp * da)

    # Message passing iterations
    for _ in range(max(0, int(iters))):
        # people -> asset
        tmp_a = defaultdict(float)
        for (pid, aid), w in edge_w.items():
            tmp_a[aid] += norm(pid, aid, w) * h_p.get(pid, 0.0)
        for aid in h_a.keys():
            h_a[aid] = float(tmp_a.get(aid, 0.0))

        # asset -> people
        tmp_p = defaultdict(float)
        for (pid, aid), w in edge_w.items():
            tmp_p[pid] += norm(pid, aid, w) * h_a.get(aid, 0.0)

        for pid in h_p.keys():
            h_p[pid] = float(alpha) * float(base_p.get(pid, 0.0)) + (1.0 - float(alpha)) * float(tmp_p.get(pid, 0.0))

    def _apply_boost(name: str, score: float) -> float:
        boost = float(PEOPLE_SCORE_BOOSTS.get(name, 1.0))
        return score * boost

    # Build ranking list (include all people, default 0)
    scored_people = sorted(        
        ((pid, _apply_boost(person_by_id[pid].name, float(h_p.get(pid, 0.0)))) for pid in person_by_id.keys()),
        key=lambda x: (x[1], person_by_id[x[0]].name),
        reverse=True,
    )

    # helper for stocks label (top-2 assets by combined edge weight)
    top_assets_for_person: dict = defaultdict(list)
    for (pid, aid), w in edge_w.items():
        top_assets_for_person[pid].append((aid, float(w)))
    for pid in top_assets_for_person:
        top_assets_for_person[pid].sort(key=lambda x: x[1], reverse=True)

    items: list[dict] = []
    for rank, (pid, score) in enumerate(scored_people[: int(limit)], start=1):
        p = person_by_id[pid]
        pairs = top_assets_for_person.get(pid, [])[:2]
        stocks = ", ".join([asset_by_id[aid].name for aid, _w in pairs if aid in asset_by_id]) or "-"
        items.append(
            {
                "rank": rank,
                "delta": 0,
                "name": p.name,
                "influence": float(score or 0.0),
                "stocks": stocks,
            }
        )

    # Debug: surface score distribution to track normalization issues in UI.
    if scored_people:
        scores = [float(s) for _pid, s in scored_people]
        finite_scores = [s for s in scores if math.isfinite(s)]
        if finite_scores:
            min_s = min(finite_scores)
            max_s = max(finite_scores)
            zero_ct = sum(1 for s in finite_scores if abs(s) < 1e-12)
            nan_ct = len(scores) - len(finite_scores)
            print(f"[gnn_scoring] scores: min={min_s:.6f} max={max_s:.6f} zeros={zero_ct} non_finite={nan_ct}")
        else:
            print("[gnn_scoring] scores: all non-finite")

    return (
        items,
        {
            "people": len(person_by_id),
            "assets": len(asset_by_id),
            "edges_total": len(edge_w),
            "prior_added": prior_added,
            "iters": int(iters),
            "alpha": float(alpha),
            "prior_lambda": float(prior_lambda),
        },
    )
