"""Tests for production configuration fail-fast validation."""

import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_production_requires_proxy_secret() -> None:
    """ENVIRONMENT=production with an empty proxy secret must refuse to boot."""
    with pytest.raises(ValidationError):
        Settings(ENVIRONMENT="production", BACKEND_PROXY_SECRET="")


def test_production_accepts_configured_secret() -> None:
    settings = Settings(ENVIRONMENT="production", BACKEND_PROXY_SECRET="s3cret")
    assert settings.BACKEND_PROXY_SECRET == "s3cret"


def test_development_allows_empty_secret() -> None:
    settings = Settings(ENVIRONMENT="development", BACKEND_PROXY_SECRET="")
    assert settings.BACKEND_PROXY_SECRET == ""


def test_environment_check_is_case_insensitive() -> None:
    with pytest.raises(ValidationError):
        Settings(ENVIRONMENT="Production", BACKEND_PROXY_SECRET="")
