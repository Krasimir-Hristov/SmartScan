"""Pydantic schemas for voice audio transcription."""

from pydantic import BaseModel, Field


class TranscribeResponse(BaseModel):
    """Schema for audio transcription response."""

    success: bool = True
    text: str = Field(description="Transcribed text from the audio recording")
    detected_language: str | None = Field(
        default=None,
        description="ISO language code detected by Whisper (e.g. 'bg', 'en', 'el')",
    )
