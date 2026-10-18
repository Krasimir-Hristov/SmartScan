"""HTTP Router for Admin AI Triaging of contact messages."""

import hmac
import logging

from fastapi import APIRouter, HTTPException, Request, status

from app.core.config import settings
from app.core.rate_limit import limiter
from app.features.admin_triage.schemas import AdminTriageRequest, AdminTriageResponse
from app.features.admin_triage.service import analyze_contact_inquiry

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin Triage"])


def _verify_internal_proxy_secret(request: Request) -> None:
    """Ensures requests originate from trusted Next.js Server Actions with a valid internal secret."""
    expected_secret = settings.BACKEND_PROXY_SECRET.strip()
    provided_secret = (request.headers.get("x-internal-auth") or "").strip()

    if not expected_secret or not provided_secret or not hmac.compare_digest(provided_secret, expected_secret):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Неоторизиран вътрешен достъп до админ модула.",
        )


@router.post("/triage", response_model=AdminTriageResponse)
@limiter.limit("20/minute")
async def triage_contact_message_endpoint(
    payload: AdminTriageRequest,
    request: Request,
) -> AdminTriageResponse:
    """Analyzes a contact form inquiry via Gemini Flash and returns summary, sentiment & draft reply."""
    _verify_internal_proxy_secret(request)
    try:
        return await analyze_contact_inquiry(payload)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.exception("Unexpected error during AI triage: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Възникна грешка при AI анализа на запитването.",
        ) from exc
