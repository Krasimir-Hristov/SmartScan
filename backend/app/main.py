"""Main entry point for SmartScan Stay FastAPI application."""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.rate_limit import limiter
from app.features.concierge.router import router as concierge_router

app = FastAPI(
    title="SmartScan Stay API",
    description="High-performance backend API for SmartScan Stay digital concierge.",
    version="1.0.0",
)

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


@app.get("/", include_in_schema=False)
async def root_redirect() -> dict[str, str]:
    return {"message": "SmartScan Stay Backend Running"}
