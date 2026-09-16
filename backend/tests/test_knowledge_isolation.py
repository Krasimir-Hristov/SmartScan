"""Tests for multi-tenant isolation: is_active gating on backend DB queries.

The backend uses the Supabase service-role key (bypasses RLS by design),
so every query MUST enforce is_active in code. These tests pin that contract.
"""

from types import SimpleNamespace
from unittest.mock import patch

import pytest

from app.features.knowledge.service import (
    get_relevant_knowledge_chunks,
    get_space_stay_context,
)

SPACE_UUID = "3f2b8c1a-7d4e-4f6a-9b2c-1e5d8a7f0c93"


class FakeQuery:
    """Minimal PostgREST query-builder fake that records filter calls."""

    def __init__(self, *, data=None, execute_error=None) -> None:
        self.eq_calls: list[tuple[str, object]] = []
        self.select_columns: str | None = None
        self.table_name: str | None = None
        self._data = data
        self._execute_error = execute_error

    def table(self, name: str) -> "FakeQuery":
        self.table_name = name
        return self

    def select(self, columns: str) -> "FakeQuery":
        self.select_columns = columns
        return self

    def eq(self, column: str, value: object) -> "FakeQuery":
        self.eq_calls.append((column, value))
        return self

    def single(self) -> "FakeQuery":
        return self

    def limit(self, _count: int) -> "FakeQuery":
        return self

    def execute(self) -> SimpleNamespace:
        if self._execute_error is not None:
            raise self._execute_error
        return SimpleNamespace(data=self._data)


@pytest.mark.asyncio
async def test_space_context_query_enforces_is_active() -> None:
    """The spaces lookup must filter is_active=True so paused spaces never serve data."""
    fake = FakeQuery(
        data={
            "id": SPACE_UUID,
            "name": "Vila Koral",
            "stay_settings": {
                "wifiSsid": "Koral_5G",
                "wifiPassword": "secret-pw",
                "taxiAddress": "1 Sea Str.",
                "keyboxCode": "1234",
            },
        }
    )

    with patch(
        "app.features.knowledge.service.get_supabase_client", return_value=fake
    ):
        ctx = await get_space_stay_context(SPACE_UUID)

    assert fake.table_name == "spaces"
    assert ("id", SPACE_UUID) in fake.eq_calls
    assert ("is_active", True) in fake.eq_calls
    assert ctx.name == "Vila Koral"
    assert ctx.wifi_ssid == "Koral_5G"
    assert ctx.keybox_code == "1234"


@pytest.mark.asyncio
async def test_space_context_neutral_when_inactive_or_missing() -> None:
    """An inactive (or missing) space falls back to a tenant-neutral default
    instead of leaking stay settings (real PostgREST .single() raises on 0 rows)."""
    fake = FakeQuery(execute_error=Exception("JSON object requested, no rows"))

    with patch(
        "app.features.knowledge.service.get_supabase_client", return_value=fake
    ):
        ctx = await get_space_stay_context(SPACE_UUID)

    assert ctx.name == "SmartScan Stay"
    assert ctx.wifi_ssid == ""
    assert ctx.wifi_password == ""
    assert ctx.keybox_code is None


@pytest.mark.asyncio
async def test_knowledge_chunks_query_enforces_is_active_join() -> None:
    """Chunk retrieval must inner-join spaces and filter is_active=True,
    so knowledge of deactivated spaces is never returned."""
    fake = FakeQuery(
        data=[
            {
                "title": "Отопление",
                "content": "Термостатът е на 22°C.",
                "category": "appliances",
                "spaces": {"is_active": True},
            }
        ]
    )

    with patch(
        "app.features.knowledge.service.get_supabase_client", return_value=fake
    ):
        chunks = await get_relevant_knowledge_chunks(SPACE_UUID, "паркинг")

    assert fake.table_name == "knowledge_chunks"
    assert ("space_id", SPACE_UUID) in fake.eq_calls
    assert ("spaces.is_active", True) in fake.eq_calls
    assert fake.select_columns is not None
    assert "spaces!inner" in fake.select_columns
    assert len(chunks) == 1
    assert chunks[0].content == "Отопление: Термостатът е на 22°C."
    assert chunks[0].category == "appliances"


@pytest.mark.asyncio
async def test_invalid_uuid_never_touches_database() -> None:
    """Non-UUID space_id values must be rejected before any DB call."""
    fake = FakeQuery(data=[])

    with patch(
        "app.features.knowledge.service.get_supabase_client", return_value=fake
    ) as mock_get_client:
        ctx = await get_space_stay_context("not-a-uuid")
        chunks = await get_relevant_knowledge_chunks("not-a-uuid", "query")

    assert ctx.name == "SmartScan Stay"
    assert chunks == []
    mock_get_client.assert_not_called()
