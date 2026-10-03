-- ==============================================================================
-- Migration: 20261003152943_space_entitlement_rpc.sql
--
-- Follow-up to 20261003152742_per_space_subscriptions_and_account_trial.sql.
--
-- 1. Removes the hardcoded 14-day DEFAULT on public.hosts.trial_ends_at so the
--    backend setting ACCOUNT_TRIAL_DAYS is the ONLY source of truth for the
--    account trial length. A hosts row inserted without an explicit trial now
--    gets NULL (no trial) instead of silently inheriting 14 days.
--
-- 2. Adds public.get_space_entitlement(UUID): a single-round-trip, atomic
--    snapshot of the entitlement rule for one space. Keeping the rule in SQL
--    means the Python backend, get_guest_space_by_slug and match_space_knowledge
--    all evaluate the exact same predicate and can never drift apart.
-- ==============================================================================

ALTER TABLE public.hosts
    ALTER COLUMN trial_ends_at DROP DEFAULT;

-- ----------------------------------------------------------------------------
-- Entitlement snapshot for a single space.
--
--   entitled = TRUE  when the space has a paid subscription ('active'), OR the
--                    owning host's account-level trial is still open.
--   entitled = FALSE when neither holds -> the guest PWA must be suspended.
--
-- A space cancelled at period end keeps Stripe status 'active' until
-- current_period_end passes, so it stays entitled for the paid period.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_space_entitlement(target_space_id UUID)
RETURNS TABLE (
    space_id UUID,
    host_id UUID,
    is_active BOOLEAN,
    subscription_status TEXT,
    current_period_end TIMESTAMPTZ,
    trial_ends_at TIMESTAMPTZ,
    entitlement_status TEXT,
    valid_until TIMESTAMPTZ,
    entitled BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
    SELECT
        s.id,
        s.host_id,
        s.is_active,
        s.subscription_status,
        s.current_period_end,
        h.trial_ends_at,
        CASE
            WHEN s.subscription_status = 'active' THEN 'active'
            WHEN h.trial_ends_at IS NOT NULL AND h.trial_ends_at > now() THEN 'trial'
            ELSE 'expired'
        END::TEXT AS entitlement_status,
        CASE
            WHEN s.subscription_status = 'active' THEN s.current_period_end
            ELSE h.trial_ends_at
        END AS valid_until,
        (
            s.is_active
            AND (
                s.subscription_status = 'active'
                OR (h.trial_ends_at IS NOT NULL AND h.trial_ends_at > now())
            )
        ) AS entitled
    FROM public.spaces s
    LEFT JOIN public.hosts h ON h.id = s.host_id
    WHERE s.id = target_space_id;
$$;

REVOKE EXECUTE ON FUNCTION public.get_space_entitlement(UUID)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_space_entitlement(UUID)
    TO service_role;

COMMENT ON FUNCTION public.get_space_entitlement(UUID) IS
    'Atomic entitlement snapshot for one space: paid subscription OR open account-level trial. Single source of truth shared by the backend gate, get_guest_space_by_slug and match_space_knowledge.';
