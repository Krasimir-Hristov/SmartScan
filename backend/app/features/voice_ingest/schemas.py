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
        description="ISO language code detected by Whisper (e.g. 'bg', 'en', 'el')",
    )
