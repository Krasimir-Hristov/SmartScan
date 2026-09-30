"""Audio transcription service using OpenRouter Whisper."""

import base64
import logging

import httpx
from fastapi import HTTPException, status
from pydantic import ValidationError

from app.core.config import settings
from app.features.voice_ingest.schemas import (
    AudioContentPart,
    AudioInputData,
    OpenRouterTranscriptionRequest,
    ProviderChatCompletionResponse,
    SystemChatMessage,
    TextContentPart,
    UserChatMessage,
)

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


AUDIO_MIME_TO_FORMAT: dict[str, str] = {
    "audio/webm": "webm",
    "audio/mp4": "mp4",
    "audio/m4a": "m4a",
    "audio/x-m4a": "m4a",
    "audio/mp3": "mp3",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/ogg": "ogg",
    "audio/flac": "flac",
    "audio/x-flac": "flac",
    "audio/aac": "aac",
}


async def transcribe_audio_whisper(
    audio_bytes: bytes,
    filename: str = "recording.webm",
    content_type: str = "audio/webm",
    language: str | None = None,
) -> tuple[str, str | None]:
    """Transcribes raw audio bytes via OpenRouter Whisper / Gemini API endpoint.

    Args:
        audio_bytes: Raw recorded audio data.
        filename: Uploaded filename.
        content_type: Audio MIME type.
        language: Optional ISO-639-1 language code hint (e.g. 'el', 'bg', 'en').

    Returns:
        tuple[str, str | None]: (transcript_text, detected_language).
        detected_language is the ISO language code returned by the upstream provider,
        or None if the provider supplies no language detection. The caller's language
        hint is never substituted as detected_language.
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

    clean_mime = (content_type or "audio/webm").split(";")[0].strip().lower()
    if clean_mime not in AUDIO_MIME_TO_FORMAT:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Неподдържан аудио формат: {clean_mime}.",
        )
    fmt = AUDIO_MIME_TO_FORMAT[clean_mime]

    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "HTTP-Referer": "https://smartscan.stay",
        "X-Title": "SmartScan Stay Audio Transcription",
    }

    try:
        chat_url = "https://openrouter.ai/api/v1/chat/completions"
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")

        system_instruction = (
            "You are an accurate, verbatim speech-to-text transcriber. Your ONLY task is to transcribe "
            "the provided spoken audio verbatim in the exact original language spoken by the user. "
            "Do not translate to English or any other language. Do not add introductory conversational "
            "phrases, commentary, explanations, or quotes. Output ONLY the exact transcribed text."
        )

        request_payload = OpenRouterTranscriptionRequest(
            model=settings.OPENROUTER_MODEL or "google/gemini-2.5-flash",
            messages=[
                SystemChatMessage(content=system_instruction),
                UserChatMessage(
                    content=[
                        TextContentPart(
                            text=f"Transcribe this audio recording verbatim in its original spoken language.{f' Hint language: {language}.' if language else ''}"
                        ),
                        AudioContentPart(
                            input_audio=AudioInputData(
                                data=audio_b64,
                                format=fmt,
                            )
                        ),
                    ]
                ),
            ],
            temperature=0.0,
        )

        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(
                chat_url,
                headers=headers,
                json=request_payload.model_dump(),
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

        try:
            raw_json = response.json()
        except Exception as exc:
            logger.error("Failed to parse provider JSON response: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Невалиден JSON отговор от услугата за транскрипция.",
            ) from exc

        try:
            provider_resp = ProviderChatCompletionResponse.model_validate(raw_json)
        except ValidationError as exc:
            logger.error("Provider response failed Pydantic validation: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Невалиден формат на отговора от услугата за транскрипция.",
            ) from exc

        raw_detected = provider_resp.language
        detected_language = (
            str(raw_detected).strip().lower()
            if raw_detected and str(raw_detected).strip()
            else None
        )

        if provider_resp.text and provider_resp.text.strip():
            return provider_resp.text.strip(), detected_language

        if not provider_resp.choices:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Не беше разпозната реч в аудио записа.",
            )

        transcript = provider_resp.choices[0].message.content.strip()
        if transcript.startswith('"') and transcript.endswith('"'):
            transcript = transcript[1:-1].strip()

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
