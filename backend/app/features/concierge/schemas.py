"""Pydantic v2 schemas for AI Concierge requests and messages."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ChatMessage(BaseModel):
    model_config = ConfigDict(strict=True)

    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1, max_length=1000)


class ConciergeChatRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    space_id: str = Field(..., min_length=1, max_length=100)
    query: str = Field(..., min_length=1, max_length=500)
    history: list[ChatMessage] = Field(default_factory=list, max_length=6)
    locale: str | None = Field(default="en", max_length=10)


class ConciergeStreamChunk(BaseModel):
    model_config = ConfigDict(strict=True)

    content: str = Field(default="")
    error: str | None = Field(default=None)
