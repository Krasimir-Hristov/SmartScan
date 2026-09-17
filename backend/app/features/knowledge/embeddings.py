"""OpenRouter embeddings client for OpenAI text-embedding-3-small (1536 dimensions)."""

import hashlib
import logging
import math

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

OPENROUTER_EMBEDDINGS_URL = "https://openrouter.ai/api/v1/embeddings"


def _generate_mock_vector(text: str, dimensions: int = 1536) -> list[float]:
    """Generates a deterministic pseudo-random unit vector for offline testing."""
    # Seed with SHA-256 of the input text
    digest = hashlib.sha256(text.encode("utf-8")).digest()
    raw_floats: list[float] = []
    for i in range(dimensions):
        byte_val = digest[i % len(digest)]
        # Normalize into [-1.0, 1.0]
        raw_floats.append((float(byte_val) - 128.0) / 128.0 + (i * 0.0001))

    # Normalize to unit length (L2 norm) for cosine distance
    norm = math.sqrt(sum(x * x for x in raw_floats)) or 1.0
    return [round(x / norm, 6) for x in raw_floats]


def _is_live_openrouter_key(raw_value: object) -> bool:
    """Safely validates whether a live OpenRouter API key is configured."""
    key_str = str(raw_value) if raw_value is not None else ""
    clean = key_str.strip().strip("'\"")
    return bool(
        clean
        and not clean.startswith("sk-or-v1-your-openrouter")
        and not clean.startswith("test-")
    )


async def generate_embeddings(texts: list[str]) -> list[list[float]]:
    """Generates 1536-dimensional embeddings for a batch of text strings.

    Uses OpenRouter's openai/text-embedding-3-small endpoint. If in development
    without a live API key, falls back gracefully to deterministic unit vectors.
    """
    if not texts:
        return []

    api_key_val = str(getattr(settings, "OPENROUTER_API_KEY", "") or "")
    is_live_key = _is_live_openrouter_key(api_key_val)

    if not is_live_key:
        logger.debug(
            "Using deterministic mock embeddings for %d texts (dev/offline mode).",
            len(texts),
        )
        return [_generate_mock_vector(t, settings.EMBEDDING_DIMENSIONS) for t in texts]

    headers = {
        "Authorization": f"Bearer {api_key_val}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://smartscanstay.com",
        "X-Title": "SmartScan Stay Knowledge Ingestion",
    }
    payload = {
        "model": settings.OPENROUTER_EMBEDDING_MODEL,
        "input": texts,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                OPENROUTER_EMBEDDINGS_URL,
                headers=headers,
                json=payload,
            )

        if response.status_code != 200:
            logger.warning(
                "OpenRouter embeddings returned status %d: %s. Using fallback vector.",
                response.status_code,
                response.text,
            )
            return [_generate_mock_vector(t, settings.EMBEDDING_DIMENSIONS) for t in texts]

        data = response.json()
        raw_embeddings = data.get("data", [])
        # Sort by index to maintain batch ordering
        raw_embeddings.sort(key=lambda item: item.get("index", 0))

        embeddings: list[list[float]] = []
        for item in raw_embeddings:
            vec = item.get("embedding", [])
            if isinstance(vec, list) and len(vec) == settings.EMBEDDING_DIMENSIONS:
                embeddings.append([float(x) for x in vec])
            else:
                logger.warning(
                    "Unexpected embedding vector length %s (expected %d). Using fallback.",
                    len(vec) if isinstance(vec, list) else "not-a-list",
                    settings.EMBEDDING_DIMENSIONS,
                )
                embeddings.append(_generate_mock_vector("fallback", settings.EMBEDDING_DIMENSIONS))

        return embeddings

    except Exception as exc:  # noqa: BLE001 # pylint: disable=broad-exception-caught
        logger.warning("Error generating embeddings via OpenRouter: %s", exc)
        return [_generate_mock_vector(t, settings.EMBEDDING_DIMENSIONS) for t in texts]
