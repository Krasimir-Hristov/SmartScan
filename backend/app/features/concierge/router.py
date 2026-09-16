"""Router for AI Concierge chat SSE endpoints."""

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from app.core.rate_limit import get_chat_rate_limit_key, limiter
from app.features.concierge.schemas import ConciergeChatRequest
from app.features.concierge.service import stream_concierge_chat

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


@router.post("/chat")
@limiter.limit("30/10minutes", key_func=get_chat_rate_limit_key)
async def chat_endpoint(
    request: Request,
    payload: ConciergeChatRequest,
    _rate_limit_state: None = Depends(_stash_space_id_for_rate_limiting),
) -> StreamingResponse:
    """Streams token-by-token response from the AI Concierge LangGraph graph."""
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
