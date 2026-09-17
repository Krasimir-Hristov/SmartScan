"""Audio transcription service using OpenRouter Whisper."""

import logging

import httpx
from fastapi import HTTPException, status

from app.core.config import settings

logger = logging.getLogger(__name__)

OPENROUTER_TRANSCRIPTIONS_URL = (
    "https://openrouter.ai/api/v1/audio/transcriptions"
)
WHISPER_MODEL = "openai/whisper-large-v3"


def _is_live_openrouter_key(raw_value: object) -> bool:
    """Safe validator for OpenRouter API key without Pylint FieldInfo member false-positives."""
    if not raw_value:
        return False
    val = str(raw_value).strip().strip("'\"")
    return (
        bool(val)
        and not val.startswith("sk-or-v1-your-openrouter")
        and not val.startswith("test-")
    )


async def transcribe_audio_whisper(
    audio_bytes: bytes,
    filename: str = "recording.webm",
    content_type: str = "audio/webm",
    language: str | None = None,
) -> tuple[str, str | None]:
    """Transcribes raw audio bytes via OpenRouter Whisper v3 API endpoint.

    Args:
        audio_bytes: Raw recorded audio data.
        filename: Uploaded filename.
        content_type: Audio MIME type.
        language: Optional ISO-639-1 language code hint (e.g. 'el', 'bg', 'en').

    Returns:
        tuple[str, str | None]: (transcript_text, detected_language)
    """
    if not audio_bytes or len(audio_bytes) < 100:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Аудио записът е празен или твърде кратък.",
        )

    is_live_key = _is_live_openrouter_key(settings.OPENROUTER_API_KEY)

    if not is_live_key:
        logger.info("Using mock Whisper transcription for testing/offline mode.")
        return (
            "Термостатът в хола е настроен на 22 градуса. Wi-Fi паролата е на рутера.",
            language or "bg",
        )

    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "HTTP-Referer": "https://smartscan.stay",
        "X-Title": "SmartScan Stay Audio Transcription",
    }

    files = {
        "file": (filename, audio_bytes, content_type),
    }
    data: dict[str, str | float] = {
        "model": WHISPER_MODEL,
        "temperature": 0.0,
        "prompt": "Transcribe verbatim in the exact original spoken language. Do NOT translate to English.",
    }
    if language:
        clean_lang = language.strip().lower()[:2]
        if clean_lang.isalpha():
            data["language"] = clean_lang

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(
                OPENROUTER_TRANSCRIPTIONS_URL,
                headers=headers,
                files=files,
                data=data,
            )

        if response.status_code != 200:
            logger.error(
                "Whisper transcription failed (status %d): %s",
                response.status_code,
                response.text,
            )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Грешка при транскрибиране на гласовия запис. Моля, опитайте отново.",
            )

        result = response.json()
        transcript = result.get("text", "").strip()
        detected_language = result.get("language")

        if not transcript:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Не беше разпозната реч в аудио записа.",
            )

        return transcript, detected_language

    except HTTPException:
        raise
    except httpx.RequestError as exc:
        logger.error("Network error during Whisper call: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Времето за връзка с услугата за транскрипция изтече.",
        ) from exc
    except Exception as exc:  # pylint: disable=broad-exception-caught
        logger.error("Unexpected error during audio transcription: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Неочаквана грешка при обработка на аудио записа.",
        ) from exc
