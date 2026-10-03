-- ==============================================================================
-- Migration: 20261003153200_drop_host_subscription_status.sql
--
-- Follow-up to the per-space subscription migration.
--
-- public.hosts.subscription_status was the authoritative status of the single
-- host-level subscription. Under the per-space model there is no host-level
-- subscription, so the column has no meaning. Keeping it would create a second,
-- inevitably stale copy of state that already lives on public.spaces.
--
-- Account-level state is now expressed by exactly two things:
--   * public.hosts.trial_ends_at   -> the account trial deadline
--   * public.spaces.*              -> one subscription_status per space
--
-- Removing the column makes it impossible for any code path to read a host-level
-- status and mistake it for entitlement.
-- ==============================================================================

ALTER TABLE public.hosts
    DROP CONSTRAINT IF EXISTS hosts_subscription_status_check;

ALTER TABLE public.hosts
    DROP COLUMN IF EXISTS subscription_status;

COMMENT ON TABLE public.hosts IS
    'Account-level billing record (1:1 with auth.users). Holds the single Stripe Customer shared by all of the host''s per-space subscriptions, plus the account-level trial window (trial_claimed_at / trial_ends_at). Subscription state lives per space on public.spaces.';
