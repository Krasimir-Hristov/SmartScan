"""Unit and integration tests for knowledge embeddings and live text ingestion."""

import math
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.features.knowledge.embeddings import _generate_mock_vector, generate_embeddings
from app.features.knowledge.schemas import StructuredCard
from app.features.knowledge.service import (
    get_relevant_knowledge_chunks,
    ingest_knowledge_text,
)
from app.features.knowledge.structuring import (
    _create_fallback_card,
    _parse_cards_json,
    structure_knowledge_cards_gemini,
)
from app.main import app

client = TestClient(app)


def test_mock_vector_generation() -> None:
    """Verifies that generated mock vectors have 1536 dimensions and unit L2 norm."""
    vec = _generate_mock_vector("Test property instructions for Wi-Fi", dimensions=1536)
    assert len(vec) == 1536
    norm = math.sqrt(sum(x * x for x in vec))
    assert 0.99 <= norm <= 1.01


@pytest.mark.asyncio
async def test_generate_embeddings_offline_fallback() -> None:
    """Verifies that in offline / dev mode, embeddings generate 1536-dim vectors."""
    texts = ["Wi-Fi password is guest123", "Keybox code is 4455"]
    embeddings = await generate_embeddings(texts)
    assert len(embeddings) == 2
    assert len(embeddings[0]) == 1536
    assert len(embeddings[1]) == 1536


@pytest.mark.asyncio
async def test_generate_embeddings_openrouter_mock() -> None:
    """Verifies OpenRouter API call formatting and response parsing."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "data": [
            {"index": 0, "embedding": [0.01] * 1536},
            {"index": 1, "embedding": [-0.02] * 1536},
        ]
    }

    with patch("app.core.config.settings.OPENROUTER_API_KEY", "sk-or-v1-live-secret-test"), patch(
        "httpx.AsyncClient.post",
        new_callable=AsyncMock,
        return_value=mock_response,
    ):
        embeddings = await generate_embeddings(["Text A", "Text B"])
        assert len(embeddings) == 2
        assert len(embeddings[0]) == 1536
        assert embeddings[0][0] == 0.01
        assert embeddings[1][0] == -0.02


def test_parse_cards_json_unlimited() -> None:
    """Verifies that Gemini card parser handles any number of atomic cards (no 3-card cap)."""
    raw_json = """[
        {"title": "Wi-Fi", "category": "wifi", "content": "Network is Villa_5G, password is 123"},
        {"title": "Keybox", "category": "access", "content": "Pin code is 9876"},
        {"title": "Boiler", "category": "appliances", "content": "Switch is in the hallway"},
        {"title": "Trash", "category": "rules", "content": "Bins outside to the left"},
        {"title": "Neighbor Cat", "category": "rules", "content": "Watch out for the neighbor's cat entering the yard"}
    ]"""
    cards = _parse_cards_json(raw_json)
    assert len(cards) == 5
    assert cards[0].category == "wifi"
    assert cards[1].category == "access"
    assert cards[4].title == "Neighbor Cat"


def test_create_fallback_card_heuristic() -> None:
    """Verifies heuristic card creation from keywords."""
    cards_wifi = _create_fallback_card("Паролата за wifi е ban12345")
    assert len(cards_wifi) == 1
    assert cards_wifi[0].category == "wifi"

    cards_key = _create_fallback_card("Кодът за ключа е 8888")
    assert len(cards_key) == 1
    assert cards_key[0].category == "access"


@pytest.mark.asyncio
async def test_structure_knowledge_cards_gemini_fallback() -> None:
    """Verifies graceful fallback when API key is not live."""
    cards = await structure_knowledge_cards_gemini("Паролата за интернета е MountainGuest")
    assert len(cards) >= 1
    assert cards[0].category == "wifi"


@pytest.mark.asyncio
async def test_ingest_knowledge_text_demo() -> None:
    """Verifies demo space returns structured cards without database writes."""
    cards = await ingest_knowledge_text(
        space_id="demo-space-villa-smartscan",
        raw_text="Паролата за интернета е MountainGuest2026. Кодът за ключа е 1234.",
    )
    assert len(cards) >= 1
    assert any(c.category in ["wifi", "access"] for c in cards)


@pytest.mark.asyncio
async def test_ingest_knowledge_text_db_insert() -> None:
    """Verifies that DB insert receives rows with populated 1536 float embedding vectors."""
    mock_supabase = MagicMock()
    mock_table = MagicMock()
    mock_insert = MagicMock()
    mock_supabase.table.return_value = mock_table
    mock_table.insert.return_value = mock_insert
    mock_insert.execute.return_value = MagicMock(data=[{"id": "chunk-1"}])

    with patch(
        "app.features.knowledge.service.get_supabase_client",
        return_value=mock_supabase,
    ), patch(
        "app.features.knowledge.service.structure_knowledge_cards_gemini",
        new_callable=AsyncMock,
        return_value=[
            StructuredCard(title="Wi-Fi", category="wifi", content="Password is guest1234"),
            StructuredCard(title="Cat", category="rules", content="Watch for neighbor cat"),
        ],
    ):
        cards = await ingest_knowledge_text(
            space_id="a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
            raw_text="Wi-Fi is guest1234. Watch out for the cat.",
        )
        assert len(cards) == 2
        mock_table.insert.assert_called_once()
        inserted_rows = mock_table.insert.call_args[0][0]
        assert len(inserted_rows) == 2
        assert inserted_rows[0]["embedding"] is not None
        assert len(inserted_rows[0]["embedding"]) == 1536
        assert inserted_rows[1]["embedding"] is not None
        assert len(inserted_rows[1]["embedding"]) == 1536


@pytest.mark.asyncio
async def test_get_relevant_knowledge_chunks_demo() -> None:
    """Verifies that demo space returns matched chunks for keyword."""
    chunks = await get_relevant_knowledge_chunks(
        space_id="demo-space-villa-smartscan",
        query="паркинг за кола",
    )
    assert len(chunks) >= 1
    assert any("паркинг" in c.content.lower() for c in chunks)


@pytest.mark.asyncio
async def test_get_relevant_knowledge_chunks_rpc() -> None:
    """Verifies that non-demo space calls Supabase match_space_knowledge RPC."""
    mock_supabase = MagicMock()
    mock_rpc = MagicMock()
    mock_supabase.rpc.return_value = mock_rpc
    mock_rpc.execute.return_value = MagicMock(
        data=[
            {
                "id": "chunk-1",
                "space_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
                "title": "Домашни любимци",
                "content": "Внимавайте с котката на съседа",
                "category": "rules",
                "similarity": 0.88,
            }
        ]
    )

    with patch(
        "app.features.knowledge.service.get_supabase_client",
        return_value=mock_supabase,
    ):
        chunks = await get_relevant_knowledge_chunks(
            space_id="a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
            query="Има ли животни?",
        )
        assert len(chunks) == 1
        assert chunks[0].title == "Домашни любимци"
        assert chunks[0].similarity == 0.88
        mock_supabase.rpc.assert_called_once()
        rpc_args = mock_supabase.rpc.call_args[0]
        assert rpc_args[0] == "match_space_knowledge"
        assert rpc_args[1]["filter_space_id"] == "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
        assert len(rpc_args[1]["query_embedding"]) == 1536


def test_ingest_text_endpoint_validation() -> None:
    """Verifies that short input (<3 chars) is rejected with 422."""
    response = client.post(
        "/api/py/knowledge/ingest-text",
        json={
            "space_id": "demo-space-villa-smartscan",
            "raw_text": "ok",
        },
    )
    assert response.status_code == 422


def test_ingest_text_endpoint_success() -> None:
    """Verifies successful text ingest via HTTP endpoint."""
    response = client.post(
        "/api/py/knowledge/ingest-text",
        json={
            "space_id": "demo-space-villa-smartscan",
            "raw_text": "Паролата за Wi-Fi е Balkan2026. Кодът за вход е 5555.",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["cards_count"] >= 1
    assert len(data["cards"]) >= 1
