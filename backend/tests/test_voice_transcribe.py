"""Tests for voice audio transcription endpoint."""

import io

from starlette.testclient import TestClient

from app.main import app

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
    monkeypatch.setattr(settings, "OPENROUTER_MODEL", None)

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "choices": [{"message": {"content": "Kalimera"}}],
    }

    # Test 1: Valid " EL " is normalized to "el", detected_language is None when provider does not supply it
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
        data = response.json()
        assert data["text"] == "Kalimera"
        assert data["detected_language"] is None

        call_kwargs = mock_post.call_args[1]
        payload = call_kwargs.get("json") or {}
        assert payload.get("model") == "google/gemini-2.5-flash"
        messages = payload.get("messages", [])
        assert len(messages) >= 2
        user_message = messages[1]
        contents = user_message.get("content", [])
        assert any(
            isinstance(p, dict) and "Hint language: el" in p.get("text", "")
            for p in contents
        )
        assert any(
            isinstance(p, dict)
            and p.get("type") == "input_audio"
            and p.get("input_audio", {}).get("format") == "webm"
            for p in contents
        )

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
        call_kwargs = mock_post.call_args[1]
        payload = call_kwargs.get("json") or {}
        user_message = payload.get("messages", [])[1]
        contents = user_message.get("content", [])
        assert not any(
            isinstance(p, dict) and "Hint language: 12" in p.get("text", "")
            for p in contents
        )


def test_transcribe_voice_flac_and_aac(monkeypatch):
    from unittest.mock import AsyncMock, MagicMock, patch

    from app.core.config import settings

    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "sk-or-v1-live-sample-key")

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "choices": [{"message": {"content": "FLAC transcription"}}],
        "language": "de",
    }

    dummy_audio = io.BytesIO(b"RIFF" + b"\x00" * 200)
    with patch(
        "httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_resp
    ) as mock_post:
        response = client.post(
            "/api/py/voice/transcribe",
            files={"file": ("sample.flac", dummy_audio, "audio/flac")},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["text"] == "FLAC transcription"
        assert data["detected_language"] == "de"

        call_kwargs = mock_post.call_args[1]
        payload = call_kwargs.get("json") or {}
        contents = payload.get("messages", [])[1].get("content", [])
        audio_part = next(p for p in contents if p.get("type") == "input_audio")
        assert audio_part["input_audio"]["format"] == "flac"


def test_transcribe_voice_malformed_provider_response(monkeypatch):
    from unittest.mock import AsyncMock, MagicMock, patch

    from app.core.config import settings

    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "sk-or-v1-live-sample-key")

    # Malformed response: not a dict
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = ["not", "a", "dict"]

    dummy_audio = io.BytesIO(b"RIFF" + b"\x00" * 200)
    with patch(
        "httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_resp
    ):
        response = client.post(
            "/api/py/voice/transcribe",
            files={"file": ("sample.webm", dummy_audio, "audio/webm")},
        )
        assert response.status_code == 502


def test_transcribe_voice_missing_content_in_provider_response(monkeypatch):
    from unittest.mock import AsyncMock, MagicMock, patch

    from app.core.config import settings

    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "sk-or-v1-live-sample-key")

    # Provider message missing the required 'content' field
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "choices": [{"message": {"role": "assistant"}}]
    }

    dummy_audio = io.BytesIO(b"RIFF" + b"\x00" * 200)
    with patch(
        "httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_resp
    ):
        response = client.post(
            "/api/py/voice/transcribe",
            files={"file": ("sample.webm", dummy_audio, "audio/webm")},
        )
        assert response.status_code == 502




