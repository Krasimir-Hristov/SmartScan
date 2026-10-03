-- ==============================================================================
-- Migration: 20261003152742_per_space_subscriptions_and_account_trial.sql
--
-- Moves billing from "one host subscription carrying N subscription items" to
-- the target product model:
--
--   * ONE Stripe Customer per host          -> hosts.stripe_customer_id  (kept)
--   * ONE Stripe Subscription PER SPACE     -> spaces.stripe_subscription_id (new)
--   * ONE account-level trial for the host  -> hosts.trial_ends_at (kept, and
--                                              now the ONLY source of truth)
--
-- ENTITLEMENT RULE (single source of truth, mirrored in Python):
--   A space is usable by guests while EITHER:
--     a) spaces.subscription_status = 'active'  -- a paid subscription. A
--        subscription cancelled at period end keeps Stripe status 'active'
--        until spaces.current_period_end passes, so it stays usable; OR
--     b) now() <= hosts.trial_ends_at           -- the account-level trial of
--        the owning host is still open, which keeps EVERY space usable.
--
-- GHOST-SUBSCRIPTION PROTECTION:
--   spaces.stripe_subscription_id is UNIQUE, so one Stripe subscription can
--   never be attached to two spaces. The backend cancels the space's
--   subscription in Stripe BEFORE deleting the row, and deletes the whole
--   Stripe customer on account deletion (cancelling every subscription).
-- ==============================================================================

-- ----------------------------------------------------------------------------
-- 1. Per-space subscription identity (the core of the new model).
-- ----------------------------------------------------------------------------
ALTER TABLE public.spaces
    ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE;

ALTER TABLE public.spaces
    ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;

COMMENT ON COLUMN public.spaces.stripe_subscription_id IS
    'The ONE Stripe Subscription dedicated to this space. NULL while the space has never been subscribed (covered by the account-level trial on public.hosts).';

COMMENT ON COLUMN public.spaces.current_period_end IS
    'End of the paid period for this space''s subscription. A subscription cancelled at period end stays usable until this timestamp passes.';

COMMENT ON COLUMN public.spaces.subscription_status IS
    'Stripe status of THIS space''s own subscription. Only ''active'' grants entitlement; ''trialing'' means "never subscribed yet" and is covered by the account-level trial on public.hosts.';

-- ----------------------------------------------------------------------------
-- 2. Drop the retired host-level subscription pointer. Under the new model a
--    host has no single subscription: each space owns one.
-- ----------------------------------------------------------------------------
ALTER TABLE public.hosts
    DROP CONSTRAINT IF EXISTS hosts_stripe_subscription_id_key;

ALTER TABLE public.hosts
    DROP COLUMN IF EXISTS stripe_subscription_id;

COMMENT ON COLUMN public.hosts.subscription_status IS
    'DEPRECATED roll-up kept only for backward compatibility with older clients. Entitlement is decided per space (spaces.subscription_status) combined with the account trial (hosts.trial_ends_at).';

-- ----------------------------------------------------------------------------
-- 3. Account-level trial becomes the ONLY trial source of truth.
--    The per-space trial_ends_at is removed so the two can never disagree.
-- ----------------------------------------------------------------------------
ALTER TABLE public.spaces
    DROP COLUMN IF EXISTS trial_ends_at;

-- trial_claimed_at freezes the moment the trial started so re-syncing a host
-- record can never silently extend or restart the account trial.
ALTER TABLE public.hosts
    ADD COLUMN IF NOT EXISTS trial_claimed_at TIMESTAMPTZ;

UPDATE public.hosts
   SET trial_claimed_at = created_at
 WHERE trial_claimed_at IS NULL;

COMMENT ON COLUMN public.hosts.trial_ends_at IS
    'ACCOUNT-LEVEL trial deadline. While now() <= trial_ends_at EVERY space owned by this host is entitled, regardless of its own subscription_status.';

COMMENT ON COLUMN public.hosts.trial_claimed_at IS
    'Immutable timestamp of when the account trial was first granted. Used to derive trial_ends_at exactly once so the trial can never be restarted.';

-- ----------------------------------------------------------------------------
-- 4. Rebuild the guest lookup with the entitlement rule baked in. The guest PWA
--    can now tell "space suspended because of billing" apart from "no such
--    space", without a second round trip.
--
--    CREATE OR REPLACE cannot change a function's return type, so the old
--    signature is dropped first. This migration runs inside a single
--    transaction, so the function is never missing for callers.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_guest_space_by_slug(TEXT);

CREATE FUNCTION public.get_guest_space_by_slug(space_slug TEXT)
RETURNS TABLE (
    id UUID,
    name TEXT,
    slug TEXT,
    stay_settings JSONB,
    knowledge_count BIGINT,
    entitlement_status TEXT,
    valid_until TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
    SELECT
        s.id,
        s.name,
        s.slug,
        s.stay_settings,
        (
            SELECT COUNT(*)::BIGINT
              FROM public.knowledge_chunks kc
             WHERE kc.space_id = s.id
        ) AS knowledge_count,
        CASE
            WHEN s.subscription_status = 'active' THEN 'active'
            WHEN h.trial_ends_at IS NOT NULL AND h.trial_ends_at > now() THEN 'trial'
            ELSE 'expired'
        END::TEXT AS entitlement_status,
        CASE
            WHEN s.subscription_status = 'active' THEN s.current_period_end
            ELSE h.trial_ends_at
        END AS valid_until
    FROM public.spaces s
    LEFT JOIN public.hosts h ON h.id = s.host_id
    WHERE s.slug = space_slug
      AND s.is_active = true;
$$;

REVOKE EXECUTE ON FUNCTION public.get_guest_space_by_slug(TEXT)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_guest_space_by_slug(TEXT)
    TO service_role;

COMMENT ON FUNCTION public.get_guest_space_by_slug(TEXT) IS
    'Guest lookup with account-level trial + per-space subscription entitlement. Returns entitlement_status of active|trial|expired so the PWA can render a suspended screen instead of a misleading 404.';

-- ----------------------------------------------------------------------------
-- 5. Harden semantic search with the same entitlement rule. A space whose
--    subscription lapsed AND whose account trial expired must not leak its
--    knowledge chunks through the RAG pipeline.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.match_space_knowledge(
    filter_space_id UUID,
    query_embedding extensions.vector(1536),
    match_threshold FLOAT DEFAULT 0.4,
    match_count INT DEFAULT 4
)
RETURNS TABLE (
    id UUID,
    space_id UUID,
    title TEXT,
    content TEXT,
    category TEXT,
    similarity FLOAT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
    SELECT
        k.id,
        k.space_id,
        k.title,
        k.content,
        k.category,
        (1 - (k.embedding <=> query_embedding))::FLOAT AS similarity
    FROM public.knowledge_chunks k
    INNER JOIN public.spaces s ON s.id = k.space_id
    LEFT JOIN public.hosts h ON h.id = s.host_id
    WHERE k.space_id = filter_space_id
      AND s.is_active = true
      -- Entitlement gate: paid subscription OR still-open account trial.
      AND (
            s.subscription_status = 'active'
            OR (h.trial_ends_at IS NOT NULL AND h.trial_ends_at > now())
          )
      -- Hard floor: similarity threshold can be raised, never lowered below 0.4.
      AND (1 - (k.embedding <=> query_embedding)) > GREATEST(match_threshold, 0.4)
    ORDER BY k.embedding <=> query_embedding ASC
    LIMIT LEAST(match_count, 20);
$$;

REVOKE EXECUTE ON FUNCTION public.match_space_knowledge(UUID, extensions.vector, FLOAT, INT)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_space_knowledge(UUID, extensions.vector, FLOAT, INT)
    TO service_role;
