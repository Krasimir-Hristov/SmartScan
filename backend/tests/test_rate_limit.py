"""Tests for hardened rate-limit identity: trusted-proxy secret + composite keys.

Attackers can previously rotate fake x-forwarded-for values to bypass the
30/10min limit. The backend must trust forwarded IPs ONLY when the shared
BACKEND_PROXY_SECRET matches (x-internal-auth header, constant-time compare).
"""

from typing import Any
from unittest.mock import patch

from app.core.config import settings
from app.core.rate_limit import get_chat_rate_limit_key, get_client_ip
from starlette.requests import Request as StarletteRequest

PROXY_SECRET = "test-proxy-secret"
SPACE_UUID = "3f2b8c1a-7d4e-4f6a-9b2c-1e5d8a7f0c93"
SOCKET_IP = "203.0.113.9"


def make_request(
    *,
    headers: dict[str, str] | None = None,
    socket_ip: str = SOCKET_IP,
    space_id: str | None = None,
) -> StarletteRequest:
    """Builds a minimal Starlette Request with a raw socket client address."""
    scope: dict[str, Any] = {
        "type": "http",
        "method": "POST",
        "path": "/api/py/concierge/chat",
        "headers": [
            (key.lower().encode("latin-1"), value.encode("latin-1"))
            for key, value in (headers or {}).items()
        ],
        "client": (socket_ip, 51234),
        "query_string": b"",
    }
    request = StarletteRequest(scope)
    if space_id is not None:
        request.state.space_id = space_id
    return request


def test_client_ip_ignores_forwarded_for_without_secret() -> None:
    """No shared secret configured -> spoofed XFF must be ignored (socket IP wins)."""
    request = make_request(headers={"x-forwarded-for": "1.2.3.4, 198.51.100.7"})
    with patch.object(settings, "BACKEND_PROXY_SECRET", ""):
        assert get_client_ip(request) == SOCKET_IP


def test_client_ip_ignores_forwarded_for_with_wrong_secret() -> None:
    """Direct backend access without the valid secret -> XFF untrusted."""
    request = make_request(
        headers={
            "x-forwarded-for": "198.51.100.7",
            "x-internal-auth": "wrong-secret",
        }
    )
    with patch.object(settings, "BACKEND_PROXY_SECRET", PROXY_SECRET):
        assert get_client_ip(request) == SOCKET_IP


def test_client_ip_trusts_forwarded_for_with_valid_secret() -> None:
    """Requests from the trusted Next.js proxy (valid secret) use the forwarded IP."""
    request = make_request(
        headers={
            "x-forwarded-for": "198.51.100.7",
            "x-internal-auth": PROXY_SECRET,
        }
    )
    with patch.object(settings, "BACKEND_PROXY_SECRET", PROXY_SECRET):
        assert get_client_ip(request) == "198.51.100.7"


def test_chat_key_combines_client_ip_and_space_id() -> None:
    """The concierge rate-limit key caps abuse per guest per property."""
    request = make_request(
        headers={
            "x-forwarded-for": "198.51.100.7",
            "x-internal-auth": PROXY_SECRET,
        },
        space_id=SPACE_UUID,
    )
    with patch.object(settings, "BACKEND_PROXY_SECRET", PROXY_SECRET):
        assert get_chat_rate_limit_key(request) == f"198.51.100.7:{SPACE_UUID}"


def test_chat_key_falls_back_to_ip_without_space_id() -> None:
    """Missing space_id (dependency not resolved) degrades gracefully to IP-only."""
    request = make_request()
    assert get_chat_rate_limit_key(request) == SOCKET_IP
