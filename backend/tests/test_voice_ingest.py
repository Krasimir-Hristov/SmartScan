"""Tests for Host Voice Ingest feature (Whisper transcription & Gemini structuring)."""

import io
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import status
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.features.voice_ingest.schemas import (
    StructuredCard,
    VoiceIngestResponse,
)
from app.features.voice_ingest.service import (
    _create_fallback_card,
    _parse_cards_json,
    structure_cards_gemini,
    transcribe_audio_whisper,
)
from app.main import app

client = TestClient(app)


# ---------------------------------------------------------------------------
# Schema Tests
# ---------------------------------------------------------------------------


def test_structured_card_validation() -> None:
    """Valid card initializes cleanly."""
    card = StructuredCard(
        title="Сейф за ключ",
        category="access",
        content="Кодът за външния сейф на верандата е 8492.",
    )
    assert card.title == "Сейф за ключ"
    assert card.category == "access"
    assert "8492" in card.content


def test_structured_card_rejects_invalid_category() -> None:
    """Invalid category triggers validation error."""
    with pytest.raises(ValidationError):
        StructuredCard(
            title="Тест",
            category="invalid_category",  # type: ignore[arg-type]
            content="Съдържание на картата",
        )


def test_voice_ingest_response_schema() -> None:
    """Response holds transcript, language and cards list."""
    resp = VoiceIngestResponse(
        transcript="Кодът за сейфа е 8492, паркомястото е номер 4.",
        detected_language="bg",
        suggested_cards=[
            StructuredCard(
                title="Сейф за ключ",
                category="access",
                content="Кодът е 8492.",
            )
        ],
    )
    assert resp.detected_language == "bg"
    assert len(resp.suggested_cards) == 1


# ---------------------------------------------------------------------------
# Service Unit Tests
# ---------------------------------------------------------------------------


def test_parse_cards_json_valid_dict() -> None:
    """Parses standard Gemini response format."""
    raw = json.dumps(
        {
            "suggested_cards": [
                {
                    "title": "Wi-Fi Достъп",
                    "category": "wifi",
                    "content": "Мрежа: VillaSanctuary, Парола: mountains2026",
                },
                {
                    "title": "Паркинг",
                    "category": "parking",
                    "content": "Подземно паркомясто номер 4.",
                },
            ]
        }
    )
    cards = _parse_cards_json(raw)
    assert len(cards) == 2
    assert cards[0].category == "wifi"
    assert cards[1].category == "parking"


def test_parse_cards_json_resilient_to_malformed_json() -> None:
    """Malformed JSON safely returns empty list without throwing."""
    assert _parse_cards_json("not a valid json") == []
    assert _parse_cards_json("") == []


def test_create_fallback_card() -> None:
    """Fallback card wraps raw transcript gracefully."""
    card = _create_fallback_card("Паркирайте само пред гаража.")
    assert card.title == "Гласова бележка"
    assert card.category == "general"
    assert "Паркирайте" in card.content


@pytest.mark.asyncio
async def test_transcribe_audio_whisper_success() -> None:
    """Transcribes audio using mocked OpenRouter response."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "text": "Кодът за кутията с ключа е 8492.",
        "language": "bg",
    }

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response):
        transcript, lang = await transcribe_audio_whisper(
            b"fake_audio_bytes_1234567890",
            filename="test.webm",
            content_type="audio/webm",
        )
        assert transcript == "Кодът за кутията с ключа е 8492."
        assert lang == "bg"


@pytest.mark.asyncio
async def test_structure_cards_gemini_fallback_on_error() -> None:
    """Falls back to single card if Gemini API fails."""
    mock_response = MagicMock()
    mock_response.status_code = 500
    mock_response.text = "Internal error"

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response):
        cards = await structure_cards_gemini("Кодът за вратата е 1234.")
        assert len(cards) == 1
        assert cards[0].category == "general"
        assert "1234" in cards[0].content


# ---------------------------------------------------------------------------
# Router Endpoint Tests
# ---------------------------------------------------------------------------


def test_ingest_rejects_non_audio_file() -> None:
    """Rejects text/plain or invalid file types with 400."""
    response = client.post(
        "/api/py/voice/ingest",
        files={"audio": ("test.txt", io.BytesIO(b"Hello world"), "text/plain")},
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Невалиден формат" in response.json()["detail"]


def test_ingest_rejects_empty_file() -> None:
    """Rejects empty or too small audio files."""
    response = client.post(
        "/api/py/voice/ingest",
        files={"audio": ("empty.webm", io.BytesIO(b"123"), "audio/webm")},
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "празен" in response.json()["detail"]


def test_ingest_rejects_oversized_file() -> None:
    """Rejects audio payloads exceeding 10MB."""
    oversized_data = b"0" * (10 * 1024 * 1024 + 1024)
    response = client.post(
        "/api/py/voice/ingest",
        files={"audio": ("large.webm", io.BytesIO(oversized_data), "audio/webm")},
    )
    assert response.status_code == status.HTTP_413_CONTENT_TOO_LARGE


def test_ingest_endpoint_full_flow() -> None:
    """End-to-end endpoint test with mocked Whisper & Gemini."""
    audio_content = b"fake-webm-audio-binary-data-stream-more-than-64-bytes-padding-here"

    whisper_mock = MagicMock()
    whisper_mock.status_code = 200
    whisper_mock.json.return_value = {
        "text": "Кодът за ключа е 8492, а паркомястото е номер 4.",
        "language": "bg",
    }

    gemini_cards_json = json.dumps(
        {
            "suggested_cards": [
                {
                    "title": "Сейф за ключ",
                    "category": "access",
                    "content": "Кодът за кутията с ключа е 8492.",
                },
                {
                    "title": "Паркинг",
                    "category": "parking",
                    "content": "Запазено паркомясто номер 4.",
                },
            ]
        }
    )

    gemini_mock = MagicMock()
    gemini_mock.status_code = 200
    gemini_mock.json.return_value = {
        "choices": [{"message": {"content": gemini_cards_json}}]
    }

    # Side-effect returns whisper response first, then gemini response
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, side_effect=[whisper_mock, gemini_mock]):
        response = client.post(
            "/api/py/voice/ingest",
            files={"audio": ("recording.webm", io.BytesIO(audio_content), "audio/webm")},
            data={"space_id": "test-space-uuid-1234"},
        )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "8492" in data["transcript"]
    assert data["detected_language"] == "bg"
    assert len(data["suggested_cards"]) == 2
    assert data["suggested_cards"][0]["title"] == "Сейф за ключ"
    assert data["suggested_cards"][0]["category"] == "access"
    assert data["suggested_cards"][1]["title"] == "Паркинг"
    assert data["suggested_cards"][1]["category"] == "parking"


def test_ingest_rate_limit_enforced() -> None:
    """Verifies that the 5/minute rate limit is strictly enforced."""
    # Using an isolated client IP to avoid polluting other test state
    test_headers = {
        "x-forwarded-for": "192.0.2.77",
        "x-internal-auth": "secret-test",
    }
    audio_content = b"fake-webm-audio-binary-data-stream-more-than-64-bytes-padding-here"

    whisper_mock = MagicMock()
    whisper_mock.status_code = 200
    whisper_mock.json.return_value = {"text": "Тест", "language": "bg"}

    gemini_mock = MagicMock()
    gemini_mock.status_code = 200
    gemini_mock.json.return_value = {
        "choices": [{"message": {"content": json.dumps({"suggested_cards": []})}}]
    }

    from app.core.config import settings
    with (
        patch.object(settings, "BACKEND_PROXY_SECRET", "secret-test"),
        patch("httpx.AsyncClient.post", new_callable=AsyncMock, side_effect=[whisper_mock, gemini_mock] * 6),
    ):
        # Send 5 valid requests
            for _ in range(5):
                res = client.post(
                    "/api/py/voice/ingest",
                    files={"audio": ("recording.webm", io.BytesIO(audio_content), "audio/webm")},
                    headers=test_headers,
                )
                assert res.status_code == status.HTTP_200_OK

            # 6th request must exceed the rate limit
            res_exceeded = client.post(
                "/api/py/voice/ingest",
                files={"audio": ("recording.webm", io.BytesIO(audio_content), "audio/webm")},
                headers=test_headers,
            )
            assert res_exceeded.status_code == status.HTTP_429_TOO_MANY_REQUESTS

