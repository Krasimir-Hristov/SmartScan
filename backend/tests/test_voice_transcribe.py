"""Tests for voice audio transcription endpoint."""

import io

from starlette.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_transcribe_voice_missing_file():
    response = client.post("/api/py/voice/transcribe")
    assert response.status_code == 422  # FastAPI validation error for missing form field


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


def test_transcribe_voice_with_language_param(monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "test-key-mock")

    dummy_audio = io.BytesIO(b"RIFF" + b"\x00" * 200)
    response = client.post(
        "/api/py/voice/transcribe",
        files={"file": ("sample.webm", dummy_audio, "audio/webm")},
        data={"language": "el"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["detected_language"] == "el"

