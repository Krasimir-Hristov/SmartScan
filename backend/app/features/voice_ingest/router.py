"""Router for Host Voice Ingest audio upload and structuring endpoints."""

import logging
from typing import Annotated

from fastapi import (
    APIRouter,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
    status,
)

from app.core.rate_limit import get_client_ip, limiter
from app.features.voice_ingest.schemas import VoiceIngestResponse
from app.features.voice_ingest.service import (
    structure_cards_gemini,
    transcribe_audio_whisper,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/voice", tags=["Voice Ingest"])

MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
ALLOWED_AUDIO_EXTENSIONS = {
    ".webm",
    ".wav",
    ".mp3",
    ".m4a",
    ".ogg",
    ".mp4",
    ".aac",
    ".flac",
}


def _validate_audio_format(filename: str, content_type: str | None) -> None:
    """Validates that the uploaded file is indeed an audio file."""
    is_audio_mime = content_type and (
        content_type.startswith("audio/")
        or content_type in ("video/webm", "video/mp4", "application/octet-stream")
    )

    has_audio_ext = any(
        filename.lower().endswith(ext) for ext in ALLOWED_AUDIO_EXTENSIONS
    )

    if not is_audio_mime and not has_audio_ext:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Невалиден формат на файла. Очаква се аудио запис (.webm, .wav, .mp3, .m4a).",
        )


@router.post(
    "/ingest",
    response_model=VoiceIngestResponse,
    summary="Transcribes dictated host voice note and structures 1-3 knowledge cards",
)
@limiter.limit("5/minute", key_func=get_client_ip)
async def voice_ingest_endpoint(
    request: Request,
    audio: Annotated[
        UploadFile,
        File(description="Audio recording file (max 60s, max 10MB)"),
    ],
    space_id: Annotated[
        str | None,
        Form(description="Optional space identifier"),
    ] = None,
) -> VoiceIngestResponse:
    """Receives host voice note, sends to Whisper v3 for speech-to-text,
    and structures with Gemini 2.5 Flash into actionable cards.
    """
    filename = audio.filename or "recording.webm"
    content_type = audio.content_type or "audio/webm"

    _validate_audio_format(filename, content_type)

    try:
        audio_bytes = await audio.read()
    except Exception as exc:
        logger.error("Failed to read uploaded audio bytes: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Грешка при четене на аудио файла.",
        ) from exc

    if not audio_bytes or len(audio_bytes) < 64:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Аудио файлът е празен.",
        )

    if len(audio_bytes) > MAX_AUDIO_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail="Аудио файлът надвишава максималния размер от 10 MB.",
        )

    # 1. Transcribe via Whisper
    transcript, detected_lang = await transcribe_audio_whisper(
        audio_bytes=audio_bytes,
        filename=filename,
        content_type=content_type,
    )

    # 2. Structure cards via Gemini
    suggested_cards = await structure_cards_gemini(transcript=transcript)

    return VoiceIngestResponse(
        transcript=transcript,
        detected_language=detected_lang,
        suggested_cards=suggested_cards,
    )
