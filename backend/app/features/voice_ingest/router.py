"""FastAPI router for audio speech-to-text transcription."""

import logging

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile, status

from app.core.rate_limit import limiter
from app.features.voice_ingest.schemas import TranscribeResponse
from app.features.voice_ingest.service import transcribe_audio_whisper

logger = logging.getLogger(__name__)

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
    language: str | None = Form(default=None, description="ISO-639-1 language code hint"),
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
        content = await file.read()
        if len(content) < 100:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Аудио файлът е празен.",
            )

        # Max 25 MB file limit
        if len(content) > 25 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Аудио файлът надвишава допустимия размер от 25MB.",
            )

        filename = file.filename or "recording.webm"
        content_type = file.content_type or "audio/webm"

        transcript, detected_lang = await transcribe_audio_whisper(
            audio_bytes=content,
            filename=filename,
            content_type=content_type,
            language=language,
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
