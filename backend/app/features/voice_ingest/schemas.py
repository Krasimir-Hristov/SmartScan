"""Pydantic v2 schemas for Host Voice Ingest."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

CardCategory = Literal[
    "wifi",
    "rules",
    "appliances",
    "recommendations",
    "general",
    "access",
    "parking",
]


class StructuredCard(BaseModel):
    """Structured knowledge card extracted from dictated speech."""

    model_config = ConfigDict(strict=True)

    title: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="Short descriptive title for the knowledge card",
    )
    category: CardCategory = Field(
        default="general",
        description="Category classification for the concierge knowledge base",
    )
    content: str = Field(
        ...,
        min_length=5,
        max_length=1000,
        description="Clean, concise instructions or actionable knowledge text",
    )


class VoiceIngestResponse(BaseModel):
    """Response returned to the host dashboard after audio processing."""

    model_config = ConfigDict(strict=True)

    transcript: str = Field(
        ...,
        min_length=1,
        description="Raw transcribed speech text from Whisper v3",
    )
    detected_language: str | None = Field(
        default=None,
        description="Detected audio language code (e.g. 'bg', 'en', 'el')",
    )
    suggested_cards: list[StructuredCard] = Field(
        default_factory=list,
        description="1 to 3 structured cards ready for host review and approval",
    )
