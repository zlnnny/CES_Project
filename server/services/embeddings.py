from __future__ import annotations

from typing import Iterable


def canonical_text(
    *,
    entity_type: str,
    category: str | None,
    name: str,
    title_or_company: str | None,
    key_issues: str | None,
) -> str:
    # Keep it simple + stable for SBERT inputs.
    parts: list[str] = []
    parts.append(f"type: {entity_type}")
    if category:
        parts.append(f"category: {category}")
    if title_or_company:
        parts.append(f"title_or_company: {title_or_company}")
    if key_issues:
        parts.append(f"key_issues: {key_issues}")
    parts.append(f"name: {name}")
    return " | ".join(parts)


def embed_texts_sbert(texts: Iterable[str], model_name: str) -> list[list[float]]:
    """
    SBERT embeddings via sentence-transformers.
    - Default model for this project is expected to be 768-dim to match pgvector column.
    """
    try:
        from sentence_transformers import SentenceTransformer  # type: ignore
    except Exception as e:  # pragma: no cover
        raise RuntimeError(
            "sentence-transformers is not installed. Install it (and torch) to compute SBERT embeddings."
        ) from e

    model = SentenceTransformer(model_name)
    vectors = model.encode(list(texts), normalize_embeddings=True)
    return [v.tolist() for v in vectors]


