"""Knowledge retrieval and space context data service with multi-tenant isolation."""

import logging
import uuid
from typing import Optional
from app.core.database import get_supabase_client
from app.features.knowledge.schemas import KnowledgeChunkDTO, SpaceStayContext

logger = logging.getLogger(__name__)

# Flagship demo fallback data for seamless zero-config operation
DEMO_VILLA_CONTEXT = SpaceStayContext(
    space_id="demo-space-villa-smartscan",
    name="Villa SmartScan",
    wifi_ssid="SmartScan_Villa_5G",
    wifi_password="smartscan-guest-wifi",
    address="94 Pirin Str., Bansko, Bulgaria",
    check_in_time="14:00",
    check_out_time="11:00",
    keybox_code="8492",
    night_silence_start="23:00",
    night_silence_end="08:00",
    emergency_number="112",
    rag_chunks=[
        KnowledgeChunkDTO(
            content=(
                "Отопление и климатизация: Термостатът в хола е настроен автоматично на 22°C. "
                "За ръчно регулиране използвайте стрелките нагоре/надолу. "
                "В спалните конвекторите се включват от бутона отдясно."
            ),
            category="appliances",
        ),
        KnowledgeChunkDTO(
            content=(
                "Смет и рециклиране: Контейнерите за битови отпадъци се намират "
                "на 30 метра вляво от входната порта на улицата. "
                "Моля изхвърляйте боклука в затворени найлонови торби."
            ),
            category="rules",
        ),
        KnowledgeChunkDTO(
            content=(
                "Паркинг: На разположение е безплатен открит паркинг в двора за до 2 автомобила. "
                "Моля не спирайте пред съседната гаражна врата."
            ),
            category="rules",
        ),
        KnowledgeChunkDTO(
            content=(
                "Препоръчани заведения наблизо: Механа 'Старата изба' (на 300м, "
                "традиционна кухня), Ресторант 'Еделвайс' (закуска и италианска храна на 500м)."
            ),
            category="recommendations",
        ),
    ],
)


def _safe_str(val: object, default: str = "") -> str:
    """Safe type guard converting an unknown value to string."""
    if isinstance(val, str):
        return val
    return default


def _safe_opt_str(val: object) -> Optional[str]:
    """Safe type guard converting an unknown value to optional string."""
    if isinstance(val, str) and val.strip():
        return val.strip()
    return None


def _extract_dict(val: object) -> dict[str, object]:
    """Safe type guard extracting a dictionary from raw database JSON."""
    if isinstance(val, dict):
        return {str(k): v for k, v in val.items()}
    return {}


def _is_valid_uuid(val: str) -> bool:
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, TypeError):
        return False


async def get_space_stay_context(space_id: str) -> SpaceStayContext:
    """Retrieves space stay settings and basic property context.

    Falls back gracefully to demo data if the space is demo or database is unconfigured.
    """
    if space_id.startswith("demo-") or not _is_valid_uuid(space_id):
        return DEMO_VILLA_CONTEXT

    client = get_supabase_client()
    if not client:
        return DEMO_VILLA_CONTEXT

    try:
        res = (
            client.table("spaces")
            .select("id, name, stay_settings")
            .eq("id", space_id)
            .single()
            .execute()
        )
        data = _extract_dict(res.data)
        if not data:
            return DEMO_VILLA_CONTEXT

        settings = _extract_dict(data.get("stay_settings"))

        return SpaceStayContext(
            space_id=_safe_str(data.get("id"), space_id),
            name=_safe_str(data.get("name"), "SmartScan Stay"),
            wifi_ssid=_safe_str(settings.get("wifiSsid")),
            wifi_password=_safe_str(settings.get("wifiPassword")),
            address=_safe_str(settings.get("taxiAddress")),
            check_in_time=_safe_str(settings.get("checkInTime"), "14:00"),
            check_out_time=_safe_str(settings.get("checkOutTime"), "11:00"),
            keybox_code=_safe_opt_str(settings.get("keyboxCode")),
            night_silence_start=_safe_opt_str(settings.get("nightSilenceStart")),
            night_silence_end=_safe_opt_str(settings.get("nightSilenceEnd")),
            emergency_number=_safe_str(settings.get("emergencyNumber"), "112"),
            rag_chunks=[],
        )
    except Exception as exc:  # pylint: disable=broad-exception-caught
        logger.warning("Failed to fetch space context for %s: %s", space_id, exc)
        return DEMO_VILLA_CONTEXT


async def get_relevant_knowledge_chunks(
    space_id: str,
    query: str,
) -> list[KnowledgeChunkDTO]:
    """Retrieves relevant knowledge chunks for the space with strict multi-tenant isolation."""
    if space_id.startswith("demo-") or not _is_valid_uuid(space_id):
        q_lower = query.lower()
        if not q_lower:
            return DEMO_VILLA_CONTEXT.rag_chunks

        matched = [
            chunk
            for chunk in DEMO_VILLA_CONTEXT.rag_chunks
            if any(
                word in chunk.content.lower()
                for word in q_lower.split()
                if len(word) > 2
            )
        ]
        return matched if matched else DEMO_VILLA_CONTEXT.rag_chunks

    client = get_supabase_client()
    if not client:
        return DEMO_VILLA_CONTEXT.rag_chunks

    try:
        res = (
            client.table("knowledge_chunks")
            .select("title, content, category")
            .eq("space_id", space_id)
            .limit(5)
            .execute()
        )
        raw_list = res.data
        if not isinstance(raw_list, list):
            return []

        chunks: list[KnowledgeChunkDTO] = []
        for raw_item in raw_list:
            item = _extract_dict(raw_item)
            title = _safe_str(item.get("title"))
            content = _safe_str(item.get("content"))
            category = _safe_str(item.get("category"), "general")
            if content:
                display_content = f"{title}: {content}" if title else content
                chunks.append(
                    KnowledgeChunkDTO(
                        content=display_content,
                        category=category,
                    )
                )

        return chunks
    except Exception as exc:  # pylint: disable=broad-exception-caught
        logger.warning("Failed to query knowledge chunks for %s: %s", space_id, exc)
        return DEMO_VILLA_CONTEXT.rag_chunks
