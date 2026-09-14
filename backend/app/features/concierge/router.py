"""Router for AI Concierge chat SSE endpoints."""

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from app.core.rate_limit import limiter
from app.features.concierge.schemas import ConciergeChatRequest
from app.features.concierge.service import stream_concierge_chat

router = APIRouter(prefix="/concierge", tags=["Concierge"])


@router.post("/chat")
@limiter.limit("30/10minutes")
async def chat_endpoint(
    request: Request,
    payload: ConciergeChatRequest,
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
