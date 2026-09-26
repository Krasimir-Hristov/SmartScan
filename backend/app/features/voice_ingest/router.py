"""FastAPI router for audio speech-to-text transcription."""

import logging

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile, status

from app.core.rate_limit import limiter
from app.features.voice_ingest.schemas import LanguageParam, TranscribeResponse
from app.features.voice_ingest.service import transcribe_audio_whisper

logger = logging.getLogger(__name__)

SUPPORTED_AUDIO_MIMES = {
    "audio/webm",
    "audio/mp4",
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/ogg",
    "audio/flac",
    "audio/aac",
    "audio/m4a",
    "audio/x-m4a",
}

router = APIRouter(prefix="/voice", tags=["Voice Transcription"])


@router.post(
    "/transcribe",
    response_model=TranscribeResponse,
    status_code=status.HTTP_200_OK,
    summary="Transcribe raw audio speech (webm/mp4/wav) to text using Whisper",
)
@limiter.limit("15/minute")
async def transcribe_voice_endpoint(
    request: Request,
    file: UploadFile = File(..., description="Audio file blob recorded from browser"),  # noqa: B008
    language: str | None = Form(
        default=None, description="ISO-639-1 language code hint"
    ),
) -> TranscribeResponse:
    """Accepts recorded audio blob from browser (e.g. Brave, Chrome, Safari)
    and transcribes it via Whisper with support for all tourist languages.
    """
    if not file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Няма прикачен аудио файл.",
        )

    try:
        max_bytes = 25 * 1024 * 1024
        chunk = await file.read(max_bytes + 1)
        if len(chunk) > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Аудио файлът надвишава допустимия размер от 25MB.",
            )
        if len(chunk) < 100:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Аудио файлът е празен.",
            )
        content = chunk

        filename = file.filename or "recording.webm"
        raw_mime = (file.content_type or "audio/webm").split(";")[0].strip().lower()
        if raw_mime not in SUPPORTED_AUDIO_MIMES:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"Неподдържан аудио формат: {raw_mime}.",
            )

        validated_lang = LanguageParam(code=language).code

        transcript, detected_lang = await transcribe_audio_whisper(
            audio_bytes=content,
            filename=filename,
            content_type=raw_mime,
            language=validated_lang,
        )

        return TranscribeResponse(
            success=True,
            text=transcript,
            detected_language=detected_lang,
        )

    except HTTPException:
        raise
    except Exception as exc:  # pylint: disable=broad-exception-caught
        logger.error("Error in transcribe_voice_endpoint: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Възникна грешка при обработката на гласовия запис.",
        ) from exc
