"""Service layer for Whisper transcription and Gemini card structuring."""

import json
import logging
from typing import Any

import httpx
from fastapi import HTTPException, status

from app.core.config import settings
from app.features.voice_ingest.schemas import CardCategory, StructuredCard

logger = logging.getLogger(__name__)

OPENROUTER_TRANSCRIPTIONS_URL = "https://openrouter.ai/api/v1/audio/transcriptions"
OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions"

ALLOWED_CATEGORIES: set[CardCategory] = {
    "wifi",
    "rules",
    "appliances",
    "recommendations",
    "general",
    "access",
    "parking",
}


async def transcribe_audio_whisper(
    audio_bytes: bytes,
    filename: str = "recording.webm",
    content_type: str = "audio/webm",
) -> tuple[str, str | None]:
    """Transcribes raw audio bytes via OpenRouter's Whisper v3 API endpoint.

    Returns:
        tuple[str, str | None]: (transcript_text, detected_language)
    """
    if not settings.OPENROUTER_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OPENROUTER_API_KEY is not configured.",
        )

    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "HTTP-Referer": "https://smartscan.stay",
        "X-Title": "SmartScan Stay Voice Ingest",
    }

    files = {
        "file": (filename, audio_bytes, content_type),
    }
    data = {
        "model": settings.OPENROUTER_WHISPER_MODEL,
    }

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
                detail="Грешка при транскрибиране на аудио записа. Моля, опитайте отново.",
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
    except Exception as exc:
        logger.error("Unexpected error during transcription: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Неочаквана грешка при обработка на аудио файла.",
        ) from exc


async def structure_cards_gemini(
    transcript: str,
) -> list[StructuredCard]:
    """Prompts Gemini 2.5 Flash to clean filler words and structure the transcript
    into 1 to 3 distinct knowledge cards conforming to the StructuredCard schema.
    """
    if not transcript.strip():
        return []

    system_prompt = (
        "You are an expert AI host concierge assistant for holiday homes and short-term rentals.\n"
        "The host just recorded a voice note dictating house rules, access details, Wi-Fi info, or appliances.\n\n"
        "CRITICAL INSTRUCTIONS:\n"
        "1. Remove vocal filler words, repetitions, and hesitation noises (e.g. 'значи', 'ами', 'ъъъ', 'um', 'like', 'you know').\n"
        "2. Keep the EXACT language spoken in the transcript (e.g. Bulgarian -> Bulgarian cards, English -> English cards).\n"
        "3. Preserve all precise numbers, codes, PINs, Wi-Fi passwords, thermostat temperatures, and phone numbers without altering them.\n"
        "4. Split the dictated content into 1 to 3 logical, actionable knowledge cards.\n"
        "   - If only one subject is mentioned (e.g. just keybox PIN), return exactly 1 card.\n"
        "   - If multiple distinct topics are covered (e.g. parking bay AND air conditioner AND trash), split into up to 3 cards.\n"
        "5. Category MUST be strictly chosen from: 'wifi', 'rules', 'appliances', 'recommendations', 'general', 'access', 'parking'.\n"
        "6. Return ONLY a valid JSON object matching this schema:\n"
        "{\n"
        '  "suggested_cards": [\n'
        '    {\n'
        '      "title": "Short title (max 100 chars)",\n'
        '      "category": "access",\n'
        '      "content": "Detailed, concise instruction text for the guest guide"\n'
        '    }\n'
        '  ]\n'
        "}"
    )

    user_message = f"Dictated Transcript:\n\"\"\"\n{transcript}\n\"\"\""

    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "HTTP-Referer": "https://smartscan.stay",
        "X-Title": "SmartScan Stay Card Structuring",
        "Content-Type": "application/json",
    }

    payload: dict[str, Any] = {
        "model": settings.OPENROUTER_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                OPENROUTER_CHAT_URL,
                headers=headers,
                json=payload,
            )

        if response.status_code != 200:
            logger.warning(
                "Gemini card structuring failed (status %d): %s. Falling back to single card.",
                response.status_code,
                response.text,
            )
            return [_create_fallback_card(transcript)]

        data = response.json()
        raw_content = (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
            .strip()
        )

        cards = _parse_cards_json(raw_content)
        if not cards:
            return [_create_fallback_card(transcript)]

        return cards[:3]  # Enforce maximum of 3 cards

    except (httpx.HTTPError, json.JSONDecodeError, KeyError, ValueError) as exc:
        logger.warning(
            "Error during card structuring: %s. Using fallback card.", exc
        )
        return [_create_fallback_card(transcript)]


def _parse_cards_json(raw_json_str: str) -> list[StructuredCard]:
    """Safely parses and validates structured cards from LLM JSON response."""
    if not raw_json_str:
        return []

    try:
        parsed = json.loads(raw_json_str)
    except json.JSONDecodeError:
        return []

    # Handle both {"suggested_cards": [...]} and [...]
    card_items = (
        parsed.get("suggested_cards", [])
        if isinstance(parsed, dict)
        else parsed
        if isinstance(parsed, list)
        else []
    )

    validated_cards: list[StructuredCard] = []
    for item in card_items:
        if not isinstance(item, dict):
            continue

        raw_category = str(item.get("category", "general")).strip().lower()
        category: CardCategory = (
            raw_category if raw_category in ALLOWED_CATEGORIES else "general"  # type: ignore[assignment]
        )

        title = str(item.get("title", "")).strip()
        content = str(item.get("content", "")).strip()

        if len(title) >= 2 and len(content) >= 5:
            validated_cards.append(
                StructuredCard(
                    title=title[:100],
                    category=category,
                    content=content[:1000],
                )
            )

    return validated_cards


def _create_fallback_card(transcript: str) -> StructuredCard:
    """Fallback card generator if LLM structuring encounters an issue."""
    clean_text = transcript.strip()
    return StructuredCard(
        title="Гласова бележка",
        category="general",
        content=clean_text[:1000] if len(clean_text) >= 5 else f"Бележка: {clean_text}",
    )
