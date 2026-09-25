"""Shared pytest fixtures and test configuration."""

import pytest
from app.core.config import settings


@pytest.fixture(autouse=True)
def _default_test_env(monkeypatch: pytest.MonkeyPatch) -> None:
    """Ensure all tests run with offline mock API keys by default.

    This prevents tests from making unintended external network calls to OpenRouter
    when a developer has a live key in their local .env file.
    """
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "test-mock-key")
