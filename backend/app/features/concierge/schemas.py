"""Pydantic v2 schemas for AI Concierge requests and messages."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

SUPPORTED_LOCALES = frozenset(
    {"en", "bg", "ro", "el", "ru", "tr", "de", "es", "it", "fr"}
)

SupportedLocale = Literal[
    "en", "bg", "ro", "el", "ru", "tr", "de", "es", "it", "fr"
]


class ChatMessage(BaseModel):
    model_config = ConfigDict(strict=True)

    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1, max_length=1000)


class ConciergeChatRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    space_id: str = Field(..., min_length=1, max_length=100)
    query: str = Field(..., min_length=1, max_length=500)
    history: list[ChatMessage] = Field(default_factory=list, max_length=6)
    # Locale is user-controlled input that reaches the LLM system prompt:
    # unknown values are normalized to the default locale (never passed
    # through) — prompt-injection defense.
    locale: SupportedLocale = Field(default="en")

    @field_validator("locale", mode="before")
    @classmethod
    def _normalize_locale(cls, value: object) -> str:
        if isinstance(value, str) and value in SUPPORTED_LOCALES:
            return value
        return "en"


class ConciergeStreamChunk(BaseModel):
    model_config = ConfigDict(strict=True)

    content: str = Field(default="")
    error: str | None = Field(default=None)
