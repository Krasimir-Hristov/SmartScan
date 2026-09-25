"""Tests for voice audio transcription endpoint."""

import io

from app.main import app
from starlette.testclient import TestClient

client = TestClient(app)


def test_transcribe_voice_missing_file():
    response = client.post("/api/py/voice/transcribe")
    assert (
        response.status_code == 422
    )  # FastAPI validation error for missing form field


def test_transcribe_voice_empty_file():
    empty_file = io.BytesIO(b"")
    response = client.post(
        "/api/py/voice/transcribe",
        files={"file": ("empty.webm", empty_file, "audio/webm")},
    )
    assert response.status_code == 422


def test_transcribe_voice_mock_success(monkeypatch):
    # Ensure offline mode for deterministic test
    from app.core.config import settings

    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "test-key-mock")

    dummy_audio = io.BytesIO(b"RIFF" + b"\x00" * 200)
    response = client.post(
        "/api/py/voice/transcribe",
        files={"file": ("sample.webm", dummy_audio, "audio/webm")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "Термостатът" in data["text"]
    assert data["detected_language"] == "bg"


def test_transcribe_voice_payload_too_large():
    # 25 MB + 1 KB
    huge_payload = io.BytesIO(b"\x00" * (25 * 1024 * 1024 + 1024))
    response = client.post(
        "/api/py/voice/transcribe",
        files={"file": ("large.webm", huge_payload, "audio/webm")},
    )
    assert response.status_code == 413


def test_transcribe_voice_unsupported_mime():
    dummy_audio = io.BytesIO(b"RIFF" + b"\x00" * 200)
    response = client.post(
        "/api/py/voice/transcribe",
        files={"file": ("sample.txt", dummy_audio, "text/plain")},
    )
    assert response.status_code == 415


def test_transcribe_voice_with_language_param(monkeypatch):
    from unittest.mock import AsyncMock, MagicMock, patch

    from app.core.config import settings

    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "sk-or-v1-live-sample-key")

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"text": "Kalimera", "language": "el"}

    # Test 1: Valid " EL " is normalized to "el"
    dummy_audio = io.BytesIO(b"RIFF" + b"\x00" * 200)
    with patch(
        "httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_resp
    ) as mock_post:
        response = client.post(
            "/api/py/voice/transcribe",
            files={"file": ("sample.webm", dummy_audio, "audio/webm")},
            data={"language": " EL "},
        )
        assert response.status_code == 200
        call_data = mock_post.call_args[1]["data"]
        assert call_data.get("language") == "el"

    # Test 2: Invalid "12" is rejected and omitted
    dummy_audio_2 = io.BytesIO(b"RIFF" + b"\x00" * 200)
    with patch(
        "httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_resp
    ) as mock_post:
        response = client.post(
            "/api/py/voice/transcribe",
            files={"file": ("sample.webm", dummy_audio_2, "audio/webm")},
            data={"language": "12"},
        )
        assert response.status_code == 200
        call_data = mock_post.call_args[1]["data"]
        assert "language" not in call_data
