"""Integration tests for FastAPI endpoints: health check, rate limiting, and chat stream."""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_health_check_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/py/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "LangGraph" in data["engine"]


@pytest.mark.asyncio
async def test_concierge_chat_endpoint_streaming():
    payload = {
        "space_id": "demo-space-villa-smartscan",
        "query": "Каква е паролата за Wi-Fi?",
        "history": [],
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/py/concierge/chat", json=payload)
        assert response.status_code == 200
        assert "text/event-stream" in response.headers.get("content-type", "")

        lines = [line for line in response.text.split("\n") if line.strip()]
        assert any(line.startswith("data: ") for line in lines)
        assert "data: [DONE]" in lines
