from __future__ import annotations

import math
import re
from datetime import datetime

from server.models import Entity


_WORD_RE = re.compile(r"[a-z0-9]+(?:'[a-z0-9]+)?", re.IGNORECASE)

# Very lightweight lexicon (no heavy dependencies).
_POS_WORDS = {
    "beat",
    "boost",
    "bullish",
    "growth",
    "record",
    "surge",
    "soar",
    "gain",
    "rally",
    "strong",
    "upgrade",
    "win",
    "approved",
    "breakthrough",
    "partnership",
    "deal",
    "expands",
    "expansion",
}
_NEG_WORDS = {
    "miss",
    "slump",
    "drop",
    "plunge",
    "fall",
    "loss",
    "selloff",
    "weak",
    "downgrade",
    "lawsuit",
    "investigation",
    "probe",
    "ban",
    "sanction",
    "tariff",
    "recall",
    "fraud",
    "risk",
    "warning",
    "cut",
}

_HAWKISH = {"rate hike", "hike", "tighten", "tightening", "inflation", "tariff", "sanction", "crackdown"}
_DOVISH = {"rate cut", "cut", "easing", "stimulus", "support", "liquidity", "bailout"}


def _tokens(text: str) -> list[str]:
    return [m.group(0).lower() for m in _WORD_RE.finditer(text or "")]


def sentiment_score(text: str) -> float:
    """
    Returns [-1, 1] score using a tiny lexicon. Title-only friendly.
    """
    toks = _tokens(text)
    if not toks:
        return 0.0
    pos = sum(1 for t in toks if t in _POS_WORDS)
    neg = sum(1 for t in toks if t in _NEG_WORDS)
    denom = max(3, pos + neg)
    return max(-1.0, min(1.0, (pos - neg) / denom))


def tone_label(text: str) -> str:
    """
    Hawkish/Dovish/Neutral heuristic. (Not "sentiment"; more macro-policy flavored.)
    """
    t = (text or "").lower()
    hawk = sum(1 for k in _HAWKISH if k in t)
    dove = sum(1 for k in _DOVISH if k in t)
    if hawk > dove and hawk > 0:
        return "Hawkish"
    if dove > hawk and dove > 0:
        return "Dovish"
    return "Neutral"


def _descriptor_terms(person: Entity) -> set[str]:
    raw = " ".join([person.category or "", person.title_or_company or "", person.key_issues or ""])
    toks = _tokens(raw)
    # cheap stopword removal
    stop = {"of", "the", "and", "or", "to", "in", "for", "a", "an", "on", "with"}
    return {t for t in toks if t not in stop and len(t) >= 3}


def _parse_published_at(published_at: str | datetime | None) -> datetime | None:
    if published_at is None:
        return None
    if isinstance(published_at, datetime):
        return published_at
    s = str(published_at).strip()
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(s, fmt)
        except Exception:
            pass
    try:
        return datetime.fromisoformat(s)
    except Exception:
        return None


def importance_score(
    *,
    title: str,
    person: Entity,
    asset_hits: int,
    published_at: str | datetime | None,
    half_life_hours: float = 24.0,
) -> float:
    """
    0..1: boosts when the title contains person's descriptor terms and more asset hits,
    then applies recency decay.
    """
    title_toks = set(_tokens(title))
    desc_terms = _descriptor_terms(person)
    desc_hits = len(title_toks.intersection(desc_terms))

    base = 0.45
    base += min(0.45, 0.06 * desc_hits)
    base += min(0.25, 0.05 * float(asset_hits))
    base = max(0.05, min(1.0, base))

    dt = _parse_published_at(published_at)
    if dt:
        age_h = max(0.0, (datetime.now() - dt).total_seconds() / 3600.0)
        decay = math.exp(-math.log(2) * age_h / max(1e-6, half_life_hours))
        base *= decay

    return float(max(0.0, min(1.0, base)))


