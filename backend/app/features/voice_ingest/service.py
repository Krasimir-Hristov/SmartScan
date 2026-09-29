"""Audio transcription service using OpenRouter Whisper."""

import base64
import logging
from typing import Any

import httpx
from fastapi import HTTPException, status

from app.core.config import settings

logger = logging.getLogger(__name__)

OPENROUTER_TRANSCRIPTIONS_URL = "https://openrouter.ai/api/v1/audio/transcriptions"
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
        env = (settings.ENVIRONMENT or "development").strip().lower()
        if env in ("development", "test"):
            logger.info("Using mock Whisper transcription for testing/offline mode.")
            return (
                "Термостатът в хола е настроен на 22 градуса. Wi-Fi паролата е на рутера.",
                language or "bg",
            )
        logger.error("OPENROUTER_API_KEY is missing or invalid in environment: %s", env)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Гласовата услуга е временно недостъпна. Липсва валиден API ключ.",
        )

    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "HTTP-Referer": "https://smartscan.stay",
        "X-Title": "SmartScan Stay Audio Transcription",
    }

    try:
        chat_url = "https://openrouter.ai/api/v1/chat/completions"
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")

        clean_mime = (content_type or "audio/webm").split(";")[0].strip().lower()
        fmt = "webm"
        if "mp4" in clean_mime or "m4a" in clean_mime:
            fmt = "mp4"
        elif "wav" in clean_mime:
            fmt = "wav"
        elif "mp3" in clean_mime or "mpeg" in clean_mime:
            fmt = "mp3"
        elif "ogg" in clean_mime:
            fmt = "ogg"

        system_instruction = (
            "You are an accurate, verbatim speech-to-text transcriber. Your ONLY task is to transcribe "
            "the provided spoken audio verbatim in the exact original language spoken by the user. "
            "Do not translate to English or any other language. Do not add introductory conversational "
            "phrases, commentary, explanations, or quotes. Output ONLY the exact transcribed text."
        )

        user_content: list[dict[str, Any]] = [
            {
                "type": "text",
                "text": f"Transcribe this audio recording verbatim in its original spoken language.{f' Hint language: {language}.' if language else ''}",
            },
            {
                "type": "input_audio",
                "input_audio": {
                    "data": audio_b64,
                    "format": fmt,
                },
            },
        ]

        payload: dict[str, Any] = {
            "model": settings.OPENROUTER_MODEL or "google/gemini-2.5-flash",
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": user_content},
            ],
            "temperature": 0.0,
        }

        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(
                chat_url,
                headers=headers,
                json=payload,
            )


        if response.status_code != 200:
            logger.error(
                "Audio transcription failed (status %d): %s",
                response.status_code,
                response.text,
            )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Грешка при транскрибиране на гласовия запис. Моля, опитайте отново.",
            )

        result = response.json()
        if "text" in result and result.get("text"):
            return str(result["text"]).strip(), result.get("language") or language

        choices = result.get("choices", [])
        if not choices:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Не беше разпозната реч в аудио записа.",
            )

        message_content = choices[0].get("message", {}).get("content") or ""
        transcript = message_content.strip()
        if transcript.startswith('"') and transcript.endswith('"'):
            transcript = transcript[1:-1].strip()

        if not transcript:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Не беше разпозната реч в аудио записа.",
            )

        return transcript, language

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
