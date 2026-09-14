"""Service layer for AI Concierge: invokes LangGraph workflow and streams SSE chunks."""

import json
from collections.abc import AsyncGenerator

from app.features.concierge.graph import concierge_workflow
from app.features.concierge.schemas import ConciergeChatRequest


async def stream_concierge_chat(
    request: ConciergeChatRequest,
) -> AsyncGenerator[str, None]:
    """Streams chat tokens from the compiled LangGraph workflow as Server-Sent Events (SSE)."""
    initial_state = {
        "space_id": request.space_id,
        "raw_query": request.query,
        "sanitized_query": "",
        "history": [msg.model_dump() for msg in request.history],
        "space_name": "",
        "property_context": "",
        "static_details": {},
        "locale": request.locale or "en",
        "stream_output": "",
    }

    try:
        async for chunk in concierge_workflow.astream(
            initial_state,
            stream_mode="custom",
            version="v2",
        ):
            if chunk.get("type") == "custom":
                data = chunk.get("data")
                if data:
                    yield f"data: {json.dumps(data)}\n\n"

        # Signal stream completion to the frontend client
        yield "data: [DONE]\n\n"
    except Exception:  # noqa: BLE001
        err_payload = {"error": "Възникна непредвидена грешка в консиержа."}
        yield f"data: {json.dumps(err_payload)}\n\n"
        yield "data: [DONE]\n\n"
