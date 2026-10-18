"""Pydantic v2 strict schemas for Admin AI Triaging of contact messages."""

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

SentimentType = Literal["positive", "neutral", "frustrated", "urgent"]
PriorityType = Literal["low", "normal", "high", "urgent"]


class AdminTriageRequest(BaseModel):
    """Input payload for AI Triaging of a contact form inquiry."""

    model_config = ConfigDict(strict=True)

    message_id: str | UUID | None = None
    name: str = Field(..., min_length=1, max_length=120)
    email: str = Field(..., min_length=3, max_length=160)
    subject: str = Field(default="general", min_length=1, max_length=60)
    message: str = Field(..., min_length=5, max_length=4000)


class AdminTriageResult(BaseModel):
    """Structured output returned by Gemini Flash for inquiry triage."""

    model_config = ConfigDict(strict=True)

    ai_summary: str = Field(..., min_length=5, max_length=500)
    ai_sentiment: SentimentType = Field(default="neutral")
    priority: PriorityType = Field(default="normal")
    ai_suggested_reply: str = Field(..., min_length=10, max_length=3000)


class AdminTriageResponse(BaseModel):
    """HTTP response returned by the /api/py/admin/triage endpoint."""

    model_config = ConfigDict(strict=True)

    success: bool = True
    triage: AdminTriageResult
    persisted: bool = False
