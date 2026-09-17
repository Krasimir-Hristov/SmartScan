"""FastAPI router for knowledge ingestion and semantic embeddings."""

import logging

from fastapi import APIRouter, HTTPException, Request, status

from app.core.rate_limit import limiter
from app.features.knowledge.schemas import (
    IngestTextRequest,
    IngestTextResponse,
    KnowledgeChipDTO,
)
from app.features.knowledge.service import (
    get_space_knowledge_chips,
    ingest_knowledge_text,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/knowledge", tags=["Knowledge & Embeddings"])


@router.post(
    "/ingest-text",
    response_model=IngestTextResponse,
    status_code=status.HTTP_200_OK,
    summary="Ingest natural language text, extract atomic cards, compute pgvector embeddings, and store in DB",
)
@limiter.limit("15/minute")
async def ingest_text_endpoint(
    request: Request,
    payload: IngestTextRequest,
) -> IngestTextResponse:
    """Accepts spoken or typed natural language notes from property hosts, converts them
    into 1 to N atomic knowledge cards, generates 1536-dimensional embeddings, and stores
    them in Supabase with pgvector HNSW indexing.
    """
    clean_text = payload.raw_text.strip()
    if len(clean_text) < 3:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Текстът за въвеждане трябва да съдържа поне 3 символа.",
        )

    try:
        cards = await ingest_knowledge_text(
            space_id=payload.space_id,
            raw_text=clean_text,
        )

        return IngestTextResponse(
            success=True,
            space_id=payload.space_id,
            cards_count=len(cards),
            cards=cards,
        )

    except Exception as exc:
        logger.error("Error in ingest_text_endpoint: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Възникна грешка при структурирането и запазването на знанието.",
        ) from exc


@router.get(
    "/chips",
    response_model=list[KnowledgeChipDTO],
    status_code=status.HTTP_200_OK,
    summary="Get active knowledge card topics as quick prompt chips",
)
@limiter.limit("60/minute")
async def get_knowledge_chips_endpoint(
    request: Request,
    space_id: str,
) -> list[KnowledgeChipDTO]:
    """Returns active knowledge card titles for this space to render as dynamic chips."""
    return await get_space_knowledge_chips(space_id)
