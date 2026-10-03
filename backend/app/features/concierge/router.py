"""Router for AI Concierge chat SSE endpoints."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse

from app.core.rate_limit import get_chat_rate_limit_key, limiter
from app.features.billing.service import (
    SPACE_SUBSCRIPTION_REQUIRED,
    SpaceNotEntitledError,
    ensure_space_entitled,
    is_billable_space_id,
)
from app.features.concierge.schemas import ConciergeChatRequest
from app.features.concierge.service import stream_concierge_chat

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/concierge", tags=["Concierge"])


async def _stash_space_id_for_rate_limiting(
    request: Request,
    payload: ConciergeChatRequest,
) -> None:
    """Exposes the request's space_id to the rate limiter.

    FastAPI resolves dependencies (including body parsing) before calling
    the slowapi-decorated endpoint, so the composite IP + space_id key is
    available when get_chat_rate_limit_key executes.
    """
    request.state.space_id = payload.space_id


async def _enforce_space_entitlement(space_id: str) -> None:
    """Refuse the concierge for a space whose paid access has expired.

    The verdict comes from the same ``public.get_space_entitlement`` predicate
    the guest lookup and the semantic search use, so a suspended space is locked
    identically everywhere. Demo fixtures and malformed ids have no billing row
    and keep their existing (data-free) behaviour.
    """
    if not is_billable_space_id(space_id):
        return

    try:
        await ensure_space_entitled(space_id)
    except SpaceNotEntitledError as exc:
        logger.info("Concierge refused: space %s is not entitled.", space_id)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=SPACE_SUBSCRIPTION_REQUIRED,
        ) from exc
    except ValueError:
        # Unknown space: no knowledge rows exist, so the graph degrades to a
        # generic greeting rather than turning this into a hard 404.
        logger.warning("Concierge called with unknown space_id %s.", space_id)


@router.post("/chat")
@limiter.limit("30/10minutes", key_func=get_chat_rate_limit_key)
async def chat_endpoint(
    request: Request,
    payload: ConciergeChatRequest,
    _rate_limit_state: None = Depends(_stash_space_id_for_rate_limiting),
) -> StreamingResponse:
    """Streams token-by-token response from the AI Concierge LangGraph graph."""
    await _enforce_space_entitlement(payload.space_id)

    event_generator = stream_concierge_chat(payload)

    return StreamingResponse(
        event_generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
