"""Knowledge retrieval, embedding generation, and space context service with pgvector HNSW."""

import asyncio
import logging
import uuid

from app.core.database import get_supabase_client
from app.features.knowledge.constants import DEMO_VILLA_CONTEXT
from app.features.knowledge.embeddings import generate_embeddings
from app.features.knowledge.schemas import (
    KnowledgeChipDTO,
    KnowledgeChunkDTO,
    SpaceStayContext,
    StructuredCard,
)
from app.features.knowledge.structuring import structure_knowledge_cards_gemini

logger = logging.getLogger(__name__)


def _safe_str(val: object, default: str = "") -> str:
    return val if isinstance(val, str) else default


def _safe_opt_str(val: object) -> str | None:
    return val.strip() if isinstance(val, str) and val.strip() else None


def _extract_dict(val: object) -> dict[str, object]:
    return {str(k): v for k, v in val.items()} if isinstance(val, dict) else {}


def _is_valid_uuid(val: str) -> bool:
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, TypeError):
        return False


async def get_space_stay_context(space_id: str) -> SpaceStayContext:
    """Retrieves space stay settings and basic property context."""
    if space_id.startswith("demo-"):
        return DEMO_VILLA_CONTEXT

    if not _is_valid_uuid(space_id):
        return SpaceStayContext(space_id=space_id, name="SmartScan Stay")

    client = get_supabase_client()
    if not client:
        return SpaceStayContext(space_id=space_id, name="SmartScan Stay")

    try:

        def _fetch_space():
            return (
                client.table("spaces")
                .select("id, name, stay_settings")
                .eq("id", space_id)
                .eq("is_active", True)
                .single()
                .execute()
            )

        res = await asyncio.to_thread(_fetch_space)
        data = _extract_dict(res.data)
        if not data:
            return SpaceStayContext(space_id=space_id, name="SmartScan Stay")

        settings = _extract_dict(data.get("stay_settings"))

        return SpaceStayContext(
            space_id=_safe_str(data.get("id"), space_id),
            name=_safe_str(data.get("name"), "SmartScan Stay"),
            wifi_ssid=_safe_str(settings.get("wifiSsid")),
            wifi_password=_safe_str(settings.get("wifiPassword")),
            address=_safe_str(settings.get("taxiAddress")),
            taxi_phone=_safe_opt_str(settings.get("taxiPhone")),
            check_in_time=_safe_str(settings.get("checkInTime"), "14:00"),
            check_out_time=_safe_str(settings.get("checkOutTime"), "11:00"),
            keybox_code=_safe_opt_str(settings.get("keyboxCode")),
            night_silence_start=_safe_opt_str(settings.get("nightSilenceStart")),
            night_silence_end=_safe_opt_str(settings.get("nightSilenceEnd")),
            afternoon_rest_start=_safe_opt_str(settings.get("afternoonRestStart")),
            afternoon_rest_end=_safe_opt_str(settings.get("afternoonRestEnd")),
            whatsapp_phone=_safe_opt_str(settings.get("whatsappPhone")),
            emergency_number=_safe_str(settings.get("emergencyNumber"), "112"),
            rag_chunks=[],
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to fetch space context for %s: %s", space_id, exc)
        return SpaceStayContext(space_id=space_id, name="SmartScan Stay")


async def get_relevant_knowledge_chunks(
    space_id: str,
    query: str,
) -> list[KnowledgeChunkDTO]:
    """Retrieves relevant knowledge chunks using OpenAI text-embedding-3-small and pgvector RPC."""
    if space_id.startswith("demo-"):
        q_lower = query.lower()
        if not q_lower:
            return DEMO_VILLA_CONTEXT.rag_chunks

        matched = [
            chunk
            for chunk in DEMO_VILLA_CONTEXT.rag_chunks
            if any(
                word in chunk.content.lower() or word in chunk.title.lower()
                for word in q_lower.split()
                if len(word) > 2
            )
        ]
        return matched if matched else DEMO_VILLA_CONTEXT.rag_chunks

    if not _is_valid_uuid(space_id):
        return []

    client = get_supabase_client()
    if not client:
        return []

    try:
        # Step 1: Generate query embedding vector (1536 floats)
        query_vectors = await generate_embeddings([query])
        if not query_vectors or not query_vectors[0]:
            logger.warning(
                "Failed to generate embedding for query in space %s", space_id
            )
            return []

        query_vec = query_vectors[0]

        # Step 2: Execute Supabase RPC match_space_knowledge if available
        if hasattr(client, "rpc"):

            def _execute_rpc():
                return client.rpc(
                    "match_space_knowledge",
                    {
                        "filter_space_id": space_id,
                        "query_embedding": query_vec,  # type: ignore
                        "match_threshold": 0.35,
                        "match_count": 4,
                    },
                ).execute()

            res = await asyncio.to_thread(_execute_rpc)
            raw_list = res.data

            chunks: list[KnowledgeChunkDTO] = []
            if isinstance(raw_list, list) and raw_list:
                for raw_item in raw_list:
                    item = _extract_dict(raw_item)
                    title = _safe_str(item.get("title"))
                    content = _safe_str(item.get("content"))
                    category = _safe_str(item.get("category"), "general")
                    sim = float(item.get("similarity", 0.0))
                    if content:
                        display_content = f"{title}: {content}" if title else content
                        chunks.append(
                            KnowledgeChunkDTO(
                                title=title,
                                content=display_content,
                                category=category,
                                similarity=sim,
                            )
                        )
                return chunks

        # Step 3: Fallback if no vector matches above threshold or no rpc method
        def _fallback_fetch():
            return (
                client.table("knowledge_chunks")
                .select("title, content, category, spaces!inner(is_active)")
                .eq("space_id", space_id)
                .eq("spaces.is_active", True)
                .limit(4)
                .execute()
            )

        fallback_res = await asyncio.to_thread(_fallback_fetch)
        fallback_data = fallback_res.data
        chunks: list[KnowledgeChunkDTO] = []
        if isinstance(fallback_data, list):
            for raw_item in fallback_data:
                item = _extract_dict(raw_item)
                title = _safe_str(item.get("title"))
                content = _safe_str(item.get("content"))
                category = _safe_str(item.get("category"), "general")
                if content:
                    display_content = f"{title}: {content}" if title else content
                    chunks.append(
                        KnowledgeChunkDTO(
                            title=title,
                            content=display_content,
                            category=category,
                        )
                    )
        return chunks

    except Exception as exc:  # noqa: BLE001
        logger.warning("Error querying pgvector for space %s: %s", space_id, exc)
        return []


async def ingest_knowledge_text(
    space_id: str,
    raw_text: str,
) -> list[StructuredCard]:
    """Converts natural language text into 1 to N atomic cards, computes embeddings, and stores in Supabase."""
    clean_text = raw_text.strip()
    if not clean_text:
        return []

    # Step 1: Prompt Gemini 2.5 Flash to extract atomic cards
    cards = await structure_knowledge_cards_gemini(clean_text)
    if not cards:
        return []

    # If demo space, return cards without saving to DB
    if space_id.startswith("demo-"):
        return cards

    if not _is_valid_uuid(space_id):
        logger.warning("Cannot ingest text: invalid space_id UUID %s", space_id)
        raise ValueError(f"Invalid space_id UUID: {space_id}")

    client = get_supabase_client()
    if not client:
        raise RuntimeError("Database client unavailable")

    # Step 2: Generate 1536-dimensional embeddings for all cards in one batch
    card_texts = [f"{c.title}: {c.content}" for c in cards]
    embeddings = await generate_embeddings(card_texts)
    if len(embeddings) != len(cards):
        raise RuntimeError(
            "Failed to generate embedding vectors for all knowledge cards"
        )

    # Step 3: Insert into knowledge_chunks with embedding vector
    rows_to_insert = [
        {
            "space_id": space_id,
            "title": card.title,
            "content": card.content,
            "category": card.category,
            "embedding": embeddings[i],
            "metadata": {"source": "live_text_ingest"},
        }
        for i, card in enumerate(cards)
    ]

    try:

        def _insert_rows():
            return client.table("knowledge_chunks").insert(rows_to_insert).execute()

        await asyncio.to_thread(_insert_rows)
        return cards

    except Exception as exc:
        logger.error("Failed to insert knowledge chunks: %s", exc)
        raise RuntimeError("Database insertion failed") from exc


async def get_space_knowledge_chips(space_id: str) -> list[KnowledgeChipDTO]:
    """Returns active knowledge card titles for this space to render as dynamic chips."""
    if space_id.startswith("demo-"):
        return [
            KnowledgeChipDTO(id=f"demo-{i}", title=c.title, category=c.category)
            for i, c in enumerate(DEMO_VILLA_CONTEXT.rag_chunks)
            if c.title
        ]

    if not _is_valid_uuid(space_id):
        return []

    client = get_supabase_client()
    if not client:
        return []

    try:

        def _fetch():
            return (
                client.table("knowledge_chunks")
                .select("id, title, category")
                .eq("space_id", space_id)
                .order("created_at", desc=False)
                .limit(6)
                .execute()
            )

        res = await asyncio.to_thread(_fetch)
        data = res.data
        return [
            KnowledgeChipDTO(
                id=_safe_str(d.get("id")),
                title=title,
                category=_safe_str(d.get("category"), "general"),
            )
            for item in data
            if (d := _extract_dict(item))
            and (title := _safe_str(d.get("title")).strip())
            and _safe_str(d.get("id"))
        ]
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to fetch knowledge chips for %s: %s", space_id, exc)
        return []
