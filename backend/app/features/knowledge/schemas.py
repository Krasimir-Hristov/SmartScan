"""Pydantic v2 schemas for knowledge chunks and space context."""

from pydantic import BaseModel, ConfigDict, Field


class KnowledgeChunkDTO(BaseModel):
    model_config = ConfigDict(strict=True)

    content: str = Field(..., min_length=1)
    category: str = Field(default="general")
    similarity: float | None = Field(default=None)


class SpaceStayContext(BaseModel):
    model_config = ConfigDict(strict=True)

    space_id: str
    name: str = Field(default="SmartScan Stay")
    wifi_ssid: str = Field(default="")
    wifi_password: str = Field(default="")
    address: str = Field(default="")
    check_in_time: str = Field(default="14:00")
    check_out_time: str = Field(default="11:00")
    keybox_code: str | None = Field(default=None)
    night_silence_start: str | None = Field(default=None)
    night_silence_end: str | None = Field(default=None)
    emergency_number: str = Field(default="112")
    rag_chunks: list[KnowledgeChunkDTO] = Field(default_factory=list)
