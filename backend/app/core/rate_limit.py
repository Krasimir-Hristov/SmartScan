"""Rate limiting with trusted-proxy client IP extraction and composite keys.

Identity model:
- x-forwarded-for is trusted ONLY when the request carries the shared
  BACKEND_PROXY_SECRET (x-internal-auth header), which the Next.js proxy
  injects after scrubbing all incoming x-* headers. A constant-time
  comparison prevents timing side channels.
- Without the secret (direct access to port 8000), the socket address is
  used, so attackers cannot rotate fake IPs to bypass the limits.
"""

import hmac
import logging

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

logger = logging.getLogger(__name__)

if not settings.BACKEND_PROXY_SECRET:
    logger.warning(
        "BACKEND_PROXY_SECRET is not set: forwarded client IPs are not trusted. "
        "All requests will be rate-limited by their socket address (a single "
        "shared bucket behind the proxy)."
    )


def _is_trusted_proxy(request: Request) -> bool:
    """True only when the request carries the valid shared proxy secret.

    The Next.js proxy scrubs every incoming x-* header before injecting its
    own, so this header can never be spoofed through the proxy path.
    """
    secret = settings.BACKEND_PROXY_SECRET
    if not secret:
        return False
    provided = request.headers.get("x-internal-auth", "")
    return hmac.compare_digest(provided, secret)


def get_client_ip(request: Request) -> str:
    """Extracts the client IP: trusts x-forwarded-for ONLY from the trusted
    proxy (valid shared secret); otherwise falls back to the socket address."""
    if _is_trusted_proxy(request):
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
    return get_remote_address(request)


def get_chat_rate_limit_key(request: Request) -> str:
    """Composite key for the concierge chat: client IP + space_id.

    Caps the abuse blast radius per property (30 req / 10 min per guest per
    property). The chat endpoint stashes the parsed payload's space_id on
    request.state via a FastAPI dependency, which FastAPI resolves before
    calling the slowapi-decorated endpoint, so the key is always available.
    """
    space_id = getattr(request.state, "space_id", "")
    client_ip = get_client_ip(request)
    return f"{client_ip}:{space_id}" if space_id else client_ip


limiter = Limiter(
    key_func=get_client_ip,
    default_limits=["60/minute"],
    storage_uri="memory://",
)
