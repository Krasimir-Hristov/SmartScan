"""Main entry point for SmartScan Stay FastAPI application."""

from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.config import settings
from app.core.rate_limit import limiter
from app.features.billing.router import router as billing_router
from app.features.concierge.router import router as concierge_router
from app.features.knowledge.router import router as knowledge_router
from app.features.voice_ingest.router import router as voice_router

MAX_REQUEST_BODY_SIZE = 25 * 1024 * 1024  # 25 MiB


class PayloadTooLargeError(Exception):
    """Raised when incoming request payload exceeds max_body_size."""


class BodySizeLimitMiddleware:
    """ASGI middleware enforcing MAX_REQUEST_BODY_SIZE before multipart parsing."""

    def __init__(
        self, app: ASGIApp, max_body_size: int = MAX_REQUEST_BODY_SIZE
    ) -> None:
        self.app = app
        self.max_body_size = max_body_size

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        for key, value in scope.get("headers", []):
            if key.lower() == b"content-length":
                try:
                    if int(value) > self.max_body_size:
                        response = JSONResponse(
                            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                            content={
                                "detail": "Аудио файлът надвишава допустимия размер от 25MB."
                            },
                        )
                        await response(scope, receive, send)
                        return
                except ValueError:
                    pass
                break

        total_bytes = 0

        async def counting_receive() -> Message:
            nonlocal total_bytes
            message = await receive()
            if message["type"] == "http.request":
                chunk = message.get("body", b"")
                total_bytes += len(chunk)
                if total_bytes > self.max_body_size:
                    raise PayloadTooLargeError()
            return message

        try:
            await self.app(scope, counting_receive, send)
        except PayloadTooLargeError:
            response = JSONResponse(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                content={"detail": "Аудио файлът надвишава допустимия размер от 25MB."},
            )
            await response(scope, receive, send)


app = FastAPI(
    title="SmartScan Stay API",
    description="High-performance backend API for SmartScan Stay digital concierge.",
    version="1.0.0",
)

# Enforce payload limit at the ASGI framework level
app.add_middleware(BodySizeLimitMiddleware)

# SlowAPI Rate Limiting State & Handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/py/health", tags=["Health"])
async def health_check() -> dict[str, str]:
    """Health check endpoint to verify backend service liveness."""
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "engine": "FastAPI + LangGraph",
    }


# Register feature routers under /api/py
app.include_router(concierge_router, prefix="/api/py")
app.include_router(knowledge_router, prefix="/api/py")
app.include_router(voice_router, prefix="/api/py")
app.include_router(billing_router, prefix="/api/py")


@app.get("/", include_in_schema=False)
async def root_redirect() -> dict[str, str]:
    return {"message": "SmartScan Stay Backend Running"}
