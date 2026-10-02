"""Spaces service tests for the host-level billing model.

Deleting a space must detach its Stripe subscription item (via the billing
service) BEFORE removing the space row, and must never reference the removed
per-space Stripe columns. Account purge is a thin delegate to the host-level
billing purge. Supabase is faked in-memory and the billing calls are mocked,
so no database or Stripe network interaction occurs.
"""

from unittest.mock import AsyncMock, patch

import pytest

from app.features.billing.schemas import BillingOperationResponse, PurgeResponse
from app.features.spaces.service import delete_space, purge_host_account

HOST_ID = "host-1"
OTHER_HOST_ID = "host-2"


# ---------------------------------------------------------------------------
# Supabase double (spaces table only)
# ---------------------------------------------------------------------------


class FakeResponse:
    """Minimal stand-in for the PostgREST response object."""

    def __init__(self, data=None):
        self.data = data


class FakeTable:
    """Chainable query builder that records each operation for assertions."""

    def __init__(self, client, name):
        self.client = client
        self.name = name
        self.op = None
        self.filters = []

    def select(self, columns="*", count=None, head=False):
        self.op = "select"
        return self

    def delete(self):
        self.op = "delete"
        return self

    def eq(self, column, value):
        self.filters.append(("eq", column, value))
        return self

    def execute(self):
        return self.client._execute(self)


class FakeSupabaseClient:
    """In-memory Supabase client backed by a ``spaces`` row list."""

    def __init__(self, spaces=None):
        self.spaces = spaces if spaces is not None else []
        self.calls = []

    def table(self, name):
        return FakeTable(self, name)

    @staticmethod
    def _matches(row, filters):
        return all(row.get(column) == value for _, column, value in filters)

    def _execute(self, query):
        self.calls.append((query.name, query.op, list(query.filters)))
        matched = [row for row in self.spaces if self._matches(row, query.filters)]
        if query.op == "select":
            return FakeResponse(data=list(matched))
        if query.op == "delete":
            for row in matched:
                self.spaces.remove(row)
            return FakeResponse(data=list(matched))
        return FakeResponse(data=[])


def make_space(space_id, host_id=HOST_ID):
    """Build a spaces row owned by ``host_id``."""
    return {"id": space_id, "host_id": host_id, "space_type": "stay"}


def patch_supabase(fake):
    """Patch the spaces service's Supabase accessor to return ``fake``."""
    return patch("app.features.spaces.service.get_supabase_client", return_value=fake)


def patch_remove_item(mock):
    """Patch the billing ``remove_space_item`` imported into spaces.service."""
    return patch("app.features.spaces.service.remove_space_item", mock)


def deleted_calls(fake):
    """Return only the delete operations recorded by the fake client."""
    return [call for call in fake.calls if call[1] == "delete"]


# ---------------------------------------------------------------------------
# delete_space
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_delete_space_detaches_item_then_deletes_row():
    """Happy path detaches billing, then deletes only the targeted row."""
    fake = FakeSupabaseClient(spaces=[make_space("space-1"), make_space("space-2")])
    remove = AsyncMock(
        return_value=BillingOperationResponse(success=True, subscription_status=None)
    )

    with patch_supabase(fake), patch_remove_item(remove):
        result = await delete_space(space_id="space-1", host_id=HOST_ID)

    assert result == "deleted"
    remove.assert_awaited_once_with(host_id=HOST_ID, space_id="space-1")
    # Only the targeted space is gone; the sibling survives.
    assert [space["id"] for space in fake.spaces] == ["space-2"]
    # The delete stayed strictly tenant-scoped (id AND host_id).
    assert deleted_calls(fake) == [
        ("spaces", "delete", [("eq", "id", "space-1"), ("eq", "host_id", HOST_ID)])
    ]


@pytest.mark.asyncio
async def test_delete_space_rejects_foreign_space():
    """A space owned by another host is rejected before any mutation."""
    fake = FakeSupabaseClient(spaces=[make_space("space-1", OTHER_HOST_ID)])
    remove = AsyncMock()

    with (
        patch_supabase(fake),
        patch_remove_item(remove),
        pytest.raises(ValueError),
    ):
        await delete_space(space_id="space-1", host_id=HOST_ID)

    remove.assert_not_awaited()
    assert [space["id"] for space in fake.spaces] == ["space-1"]
    assert deleted_calls(fake) == []


@pytest.mark.asyncio
async def test_delete_space_rejects_missing_space():
    """A non-existent space is rejected before any billing or DB mutation."""
    fake = FakeSupabaseClient(spaces=[])
    remove = AsyncMock()

    with (
        patch_supabase(fake),
        patch_remove_item(remove),
        pytest.raises(ValueError),
    ):
        await delete_space(space_id="ghost", host_id=HOST_ID)

    remove.assert_not_awaited()
    assert deleted_calls(fake) == []


@pytest.mark.asyncio
async def test_delete_space_keeps_row_when_item_detach_fails():
    """If billing detach fails, the row survives (no orphan / ghost billing)."""
    fake = FakeSupabaseClient(spaces=[make_space("space-1")])
    remove = AsyncMock(side_effect=ValueError("Stripe unavailable"))

    with (
        patch_supabase(fake),
        patch_remove_item(remove),
        pytest.raises(ValueError),
    ):
        await delete_space(space_id="space-1", host_id=HOST_ID)

    remove.assert_awaited_once()
    # The delete never ran, so the space row is preserved.
    assert [space["id"] for space in fake.spaces] == ["space-1"]
    assert deleted_calls(fake) == []


# ---------------------------------------------------------------------------
# purge_host_account (delegates to the host-level billing purge)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_purge_host_account_delegates_to_billing():
    """Purge forwards to the billing service and surfaces its success flag."""
    billing_purge = AsyncMock(
        return_value=PurgeResponse(
            success=True,
            canceled_subscription_id="sub_1",
            deleted_spaces=2,
            deleted_host_record=True,
        )
    )

    with patch("app.features.spaces.service.purge_host_billing", billing_purge):
        result = await purge_host_account(host_id=HOST_ID)

    assert result is True
    billing_purge.assert_awaited_once_with(host_id=HOST_ID)


@pytest.mark.asyncio
async def test_purge_host_account_propagates_billing_failure():
    """A billing failure propagates so the caller aborts before auth delete."""
    billing_purge = AsyncMock(
        side_effect=ValueError("Could not delete billing profile.")
    )

    with (
        patch("app.features.spaces.service.purge_host_billing", billing_purge),
        pytest.raises(ValueError),
    ):
        await purge_host_account(host_id=HOST_ID)

    billing_purge.assert_awaited_once_with(host_id=HOST_ID)
