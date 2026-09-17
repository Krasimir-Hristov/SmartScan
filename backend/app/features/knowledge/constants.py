"""Constants and fallback demo data for the knowledge module."""

from app.features.knowledge.schemas import KnowledgeChunkDTO, SpaceStayContext

# Flagship demo fallback data for seamless zero-config operation
DEMO_VILLA_CONTEXT = SpaceStayContext(
    space_id="demo-space-villa-smartscan",
    name="Villa SmartScan",
    wifi_ssid="SmartScan_Villa_5G",
    wifi_password="smartscan-guest-wifi",
    address="94 Pirin Str., Bansko, Bulgaria",
    taxi_phone="+359 888 123 456",
    check_in_time="14:00",
    check_out_time="11:00",
    keybox_code="8492",
    night_silence_start="23:00",
    night_silence_end="08:00",
    afternoon_rest_start="14:30",
    afternoon_rest_end="17:30",
    whatsapp_phone="+359 88 111 2222",
    emergency_number="112",
    rag_chunks=[
        KnowledgeChunkDTO(
            title="Отопление и климатизация",
            content=(
                "Термостатът в хола е настроен автоматично на 22°C. "
                "За ръчно регулиране използвайте стрелките нагоре/надолу. "
                "В спалните конвекторите се включват от бутона отдясно."
            ),
            category="appliances",
        ),
        KnowledgeChunkDTO(
            title="Смет и рециклиране",
            content=(
                "Контейнерите за битови отпадъци се намират "
                "на 30 метра вляво от входната порта на улицата. "
                "Моля изхвърляйте боклука в затворени найлонови торби."
            ),
            category="rules",
        ),
        KnowledgeChunkDTO(
            title="Паркинг",
            content=(
                "На разположение е безплатен открит паркинг в двора за до 2 автомобила. "
                "Моля не спирайте пред съседната гаражна врата."
            ),
            category="parking",
        ),
        KnowledgeChunkDTO(
            title="Препоръчани заведения наблизо",
            content=(
                "Механа 'Старата изба' (на 300м, традиционна кухня), "
                "Ресторант 'Еделвайс' (закуска и италианска храна на 500м)."
            ),
            category="recommendations",
        ),
        KnowledgeChunkDTO(
            title="Домашни любимци и съседи",
            content=(
                "Внимавайте с котката на съседа, която понякога влиза в двора. "
                "Тя е кротка, но моля затваряйте портата."
            ),
            category="rules",
        ),
    ],
)
