from __future__ import annotations

import math
import os
import re
from functools import lru_cache
from datetime import datetime

from server.models import Entity


_WORD_RE = re.compile(r"[a-z0-9]+(?:'[a-z0-9]+)?", re.IGNORECASE)
_NUM_RE = re.compile(r"\b\d+(?:\.\d+)?%?\b")

_SBERT_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

_SENTIMENT_POS_ANCHORS = [
    "Markets rally after strong earnings and upbeat outlook",
    "Company reports record growth and raises guidance",
    "Analysts upgrade the stock on strong demand",
    "Breakthrough approval drives shares higher",
]
_SENTIMENT_NEG_ANCHORS = [
    "Shares plunge after weak results and lowered guidance",
    "Company faces lawsuit or investigation amid concerns",
    "Unexpected slowdown sparks selloff and downgrade",
    "Regulatory action or sanctions hit the company",
]

_HAWKISH_ANCHORS = [
    "Central bank signals rate hikes to fight inflation",
    "Officials warn of tightening and higher rates",
    "Policy makers emphasize price stability over growth",
]
_DOVISH_ANCHORS = [
    "Central bank signals rate cuts to support growth",
    "Officials emphasize easing, liquidity, and stimulus",
    "Policy makers focus on supporting jobs and demand",
]

_TONE_MIN_CONF = 0.32
_IMPORTANCE_URGENCY = {
    "breaking",
    "urgent",
    "surprise",
    "unexpected",
    "record",
    "biggest",
    "largest",
    "first",
    "historic",
    "emergency",
    "beats",
    "misses",
    "upgrade",
    "downgrade",
    "raises",
    "cuts",
}

# Importance factor multipliers (tune without DB changes)
RECENCY_MULTIPLIER = 1.0
DESC_OVERLAP_MULTIPLIER = 1.0
ASSET_HIT_MULTIPLIER = 1.0
URGENCY_MULTIPLIER = 1.0
NUMERIC_MULTIPLIER = 1.0


def _tokens(text: str) -> list[str]:
    return [m.group(0).lower() for m in _WORD_RE.finditer(text or "")]


def sentiment_score(text: str) -> float:
    """
    Returns [-1, 1] score using SBERT similarity to sentiment anchors.
    Falls back to keyword matching if SBERT is unavailable.
    """
    if not (text or "").strip():
        return 0.0
    
    try:
        pos = _max_anchor_similarity(text, _SENTIMENT_POS_ANCHORS)
        neg = _max_anchor_similarity(text, _SENTIMENT_NEG_ANCHORS)
        denom = max(1e-6, pos + neg)
        score = (pos - neg) / denom
        return float(max(-1.0, min(1.0, score)))
    except Exception:
        # Simple keyword-based fallback
        text_lower = text.lower()
        pos_keywords = ["rally", "upbeat", "growth", "raises", "upgrade", "demand", "approval", "higher", "beats", "bullish", "positive"]
        neg_keywords = ["plunge", "weak", "lowered", "concerns", "slowdown", "selloff", "downgrade", "hit", "misses", "bearish", "negative", "investigates"]
        
        pos_score = sum(1 for k in pos_keywords if k in text_lower)
        neg_score = sum(1 for k in neg_keywords if k in text_lower)
        
        if pos_score > neg_score: return 0.3
        if neg_score > pos_score: return -0.3
        return 0.0


def tone_label(text: str) -> str:
    """
    Hawkish/Dovish/Neutral heuristic.
    Falls back to keyword matching if SBERT is unavailable.
    """
    if not (text or "").strip():
        return "Neutral"
    
    try:
        hawk = _max_anchor_similarity(text, _HAWKISH_ANCHORS)
        dove = _max_anchor_similarity(text, _DOVISH_ANCHORS)
        if max(hawk, dove) < _TONE_MIN_CONF:
            return "Neutral"
        if hawk > dove:
            return "Hawkish"
        if dove > hawk:
            return "Dovish"
        return "Neutral"
    except Exception:
        text_lower = text.lower()
        if any(k in text_lower for k in ["hike", "tighten", "stability", "inflation"]): return "Hawkish"
        if any(k in text_lower for k in ["cut", "easing", "liquidity", "stimulus"]): return "Dovish"
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
    base += min(0.45, 0.06 * desc_hits) * DESC_OVERLAP_MULTIPLIER
    base += min(0.25, 0.05 * float(asset_hits)) * ASSET_HIT_MULTIPLIER

    # Add lightweight signals from the incoming title (no DB changes).
    title_lower = (title or "").lower()
    urgency_hits = sum(1 for k in _IMPORTANCE_URGENCY if k in title_lower)
    base += min(0.2, 0.04 * urgency_hits) * URGENCY_MULTIPLIER

    if _NUM_RE.search(title_lower):
        base += 0.08 * NUMERIC_MULTIPLIER

    base = max(0.05, min(1.0, base))

    dt = _parse_published_at(published_at)
    if dt:
        age_h = max(0.0, (datetime.now() - dt).total_seconds() / 3600.0)
        decay = math.exp(-math.log(2) * age_h / max(1e-6, half_life_hours))
        base *= decay * RECENCY_MULTIPLIER

    return float(max(0.0, min(1.0, base)))


@lru_cache(maxsize=1)
def _get_sbert():
    try:
        from sentence_transformers import SentenceTransformer
    except Exception as exc:
        raise RuntimeError(
            "SBERT model unavailable. Install sentence-transformers to enable SBERT-based scoring."
        ) from exc
    # Default to CPU to avoid CUDA/CUBLAS issues on mismatched drivers.
    device = (os.getenv("SBERT_DEVICE") or "cpu").strip().lower()
    return SentenceTransformer(_SBERT_MODEL_NAME, device=device)


@lru_cache(maxsize=8)
def _anchor_embeddings(anchor_key: str):
    model = _get_sbert()
    if anchor_key == "sent_pos":
        anchors = _SENTIMENT_POS_ANCHORS
    elif anchor_key == "sent_neg":
        anchors = _SENTIMENT_NEG_ANCHORS
    elif anchor_key == "hawk":
        anchors = _HAWKISH_ANCHORS
    elif anchor_key == "dove":
        anchors = _DOVISH_ANCHORS
    else:
        anchors = []
    return model.encode(anchors, normalize_embeddings=True, convert_to_tensor=True)


def _max_anchor_similarity(text: str, anchors: list[str]) -> float:
    model = _get_sbert()
    text_emb = model.encode(text, normalize_embeddings=True, convert_to_tensor=True)
    if anchors is _SENTIMENT_POS_ANCHORS:
        anchor_embs = _anchor_embeddings("sent_pos")
    elif anchors is _SENTIMENT_NEG_ANCHORS:
        anchor_embs = _anchor_embeddings("sent_neg")
    elif anchors is _HAWKISH_ANCHORS:
        anchor_embs = _anchor_embeddings("hawk")
    elif anchors is _DOVISH_ANCHORS:
        anchor_embs = _anchor_embeddings("dove")
    else:
        anchor_embs = model.encode(anchors, normalize_embeddings=True, convert_to_tensor=True)
    # cosine similarity since embeddings are normalized
    sims = anchor_embs @ text_emb
    return float(sims.max().item()) if sims.numel() else 0.0
