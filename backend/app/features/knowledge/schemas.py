"""Pydantic v2 schemas for knowledge chunks, space context, and text ingestion."""

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
    "pets",
]


class KnowledgeChunkDTO(BaseModel):
    model_config = ConfigDict(strict=True)

    title: str = Field(default="")
    content: str = Field(..., min_length=1)
    category: str = Field(default="general")
    similarity: float | None = Field(default=None)


class StructuredCard(BaseModel):
    model_config = ConfigDict(strict=True)

    title: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="Concise, descriptive title for the knowledge card",
    )
    category: CardCategory = Field(
        default="general",
        description="Card category for UI filtering and icon display",
    )
    content: str = Field(
        ...,
        min_length=5,
        max_length=1000,
        description="Clean, factual instructions or details for guests",
    )


class IngestTextRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    space_id: str = Field(
        ...,
        min_length=1,
        description="UUID of the space or demo identifier",
    )
    raw_text: str = Field(
        ...,
        min_length=5,
        max_length=5000,
        description="Spoken or typed natural language text to be parsed into atomic knowledge cards",
    )


class IngestTextResponse(BaseModel):
    model_config = ConfigDict(strict=True)

    success: bool = Field(default=True)
    space_id: str
    cards_count: int = Field(..., ge=0)
    cards: list[StructuredCard] = Field(default_factory=list)


class BatchChunkInsertRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    space_id: str = Field(..., min_length=1)
    cards: list[StructuredCard] = Field(..., min_length=1)


class SpaceStayContext(BaseModel):
    model_config = ConfigDict(strict=True)

    space_id: str
    name: str = Field(default="SmartScan Stay")
    wifi_ssid: str = Field(default="")
    wifi_password: str = Field(default="")
    address: str = Field(default="")
    taxi_phone: str | None = Field(default=None)
    check_in_time: str = Field(default="14:00")
    check_out_time: str = Field(default="11:00")
    keybox_code: str | None = Field(default=None)
    night_silence_start: str | None = Field(default=None)
    night_silence_end: str | None = Field(default=None)
    afternoon_rest_start: str | None = Field(default=None)
    afternoon_rest_end: str | None = Field(default=None)
    whatsapp_phone: str | None = Field(default=None)
    emergency_number: str = Field(default="112")
    rag_chunks: list[KnowledgeChunkDTO] = Field(default_factory=list)


class KnowledgeChipDTO(BaseModel):
    model_config = ConfigDict(strict=True)

    id: str
    title: str
    category: str = Field(default="general")
