import re

from pydantic import BaseModel, ConfigDict, Field, field_validator


class LanguageParam(BaseModel):
    """Schema for validating and normalizing ISO-639-1 language codes."""

    model_config = ConfigDict(strict=True)
    code: str | None = None

    @field_validator("code", mode="before")
    @classmethod
    def validate_code(cls, v: object) -> str | None:
        if v is None:
            return None
        cleaned = str(v).strip().lower()
        if not cleaned:
            return None
        return cleaned if re.fullmatch(r"^[a-z]{2}$", cleaned) else None


class TranscribeResponse(BaseModel):
    """Schema for audio transcription response."""

    success: bool = True
    text: str = Field(description="Transcribed text from the audio recording")
    detected_language: str | None = Field(
        default=None,
        description="ISO language code returned by the provider (e.g. 'bg', 'en'), or None if not detected.",
    )


class AudioInputData(BaseModel):
    model_config = ConfigDict(strict=True)
    data: str
    format: str


class TextContentPart(BaseModel):
    model_config = ConfigDict(strict=True)
    type: str = "text"
    text: str


class AudioContentPart(BaseModel):
    model_config = ConfigDict(strict=True)
    type: str = "input_audio"
    input_audio: AudioInputData


class SystemChatMessage(BaseModel):
    model_config = ConfigDict(strict=True)
    role: str = "system"
    content: str


class UserChatMessage(BaseModel):
    model_config = ConfigDict(strict=True)
    role: str = "user"
    content: list[TextContentPart | AudioContentPart]


class OpenRouterTranscriptionRequest(BaseModel):
    model_config = ConfigDict(strict=True)
    model: str
    messages: list[SystemChatMessage | UserChatMessage]
    temperature: float = 0.0

