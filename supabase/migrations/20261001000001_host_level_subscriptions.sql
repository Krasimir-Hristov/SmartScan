-- =============================================================================
-- Migration: host_level_subscriptions
--
-- PURPOSE
--   Move Stripe billing ownership from the SPACE level to the HOST level.
--
--   BEFORE
--     Every row in public.spaces carried its own stripe_customer_id,
--     stripe_subscription_id and stripe_price_id. A host with three spaces
--     could therefore end up with three Stripe Customers and three separate
--     Subscriptions. Account deletion had to loop over N subscriptions, and a
--     failure mid-loop left "ghost" subscriptions billing a deleted user.
--
--   AFTER
--     public.hosts holds exactly ONE Stripe Customer and ONE Subscription per
--     host. Every enrolled space is represented as a Stripe SubscriptionItem
--     carrying metadata.space_id, which means:
--       * deleting a single space removes only its subscription item;
--       * deleting the host account cancels ONE subscription (single call);
--       * Stripe remains the source of truth for the space -> item mapping,
--         so reconciliation works even if the local database is out of sync.
--
--     public.spaces.subscription_status is KEPT as a denormalised mirror of
--     hosts.subscription_status (propagated by the Stripe webhook handler) so
--     the dashboard cards and guest gating keep working without extra joins.
--     It is display data only -- hosts.subscription_status is authoritative.
--
-- ORDERING IS SIGNIFICANT: the backfill in step 2 reads columns that step 5
-- drops, so the steps must not be reordered.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Host billing record (1:1 with auth.users)
-- -----------------------------------------------------------------------------
create table if not exists public.hosts (
    id uuid primary key references auth.users (id) on delete cascade,
    -- One Stripe Customer per host. UNIQUE doubles as the webhook lookup index
    -- (invoice.* and customer.* events only carry the customer id).
    stripe_customer_id text unique,
    -- One Stripe Subscription per host. UNIQUE guarantees that a
    -- customer.subscription.* webhook can never match more than one host.
    -- Set to NULL once the subscription is cancelled; Postgres allows multiple
    -- NULLs in a unique column.
    stripe_subscription_id text unique,
    subscription_status text not null default 'trialing'
        check (
            subscription_status in (
                'trialing',
                'active',
                'past_due',
                'paused',
                'canceled'
            )
        ),
    trial_ends_at timestamptz default (now() + interval '14 days'),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.hosts is
    'Host-level Stripe billing record (1:1 with auth.users). One Stripe Customer and one Subscription per host; individual spaces map to Stripe SubscriptionItems via metadata.space_id.';

comment on column public.hosts.stripe_subscription_id is
    'The single Stripe Subscription covering all of this host''s enrolled spaces. NULL when no live subscription exists.';

comment on column public.hosts.subscription_status is
    'Authoritative subscription state, maintained by the Stripe webhook handler.';

-- -----------------------------------------------------------------------------
-- 2. Backfill: fold the legacy per-space Stripe Customers into one per host.
--    A host that owned several spaces may have several customer ids; we keep the
--    oldest one (deterministic) so no historical Stripe Customer is orphaned.
--    No-op on a database without legacy rows.
-- -----------------------------------------------------------------------------
create table if not exists public.legacy_billing_archive (
    id uuid primary key default gen_random_uuid(),
    space_id uuid not null,
    host_id uuid not null,
    stripe_customer_id text,
    stripe_subscription_id text,
    stripe_price_id text,
    subscription_status text,
    archived_at timestamptz not null default now()
);

alter table public.legacy_billing_archive enable row level security;
revoke all on public.legacy_billing_archive from anon, authenticated;
grant all on public.legacy_billing_archive to service_role;

insert into public.legacy_billing_archive (
    space_id, host_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, subscription_status
)
select id, host_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, subscription_status
from public.spaces
where stripe_customer_id is not null or stripe_subscription_id is not null;

-- A reconciliation step should use this archive to cancel or consolidate extra Stripe
-- subscriptions and tag surviving items with metadata.space_id.

insert into public.hosts (
    id,
    stripe_customer_id,
    stripe_subscription_id,
    subscription_status
)
select distinct on (s.host_id)
    s.host_id,
    s.stripe_customer_id,
    s.stripe_subscription_id,
    coalesce(s.subscription_status, 'trialing')
from public.spaces s
where s.host_id is not null
  and (
        s.stripe_customer_id is not null
     or s.stripe_subscription_id is not null
  )
order by s.host_id,
         case coalesce(s.subscription_status, 'trialing')
             when 'active' then 1
             when 'trialing' then 2
             when 'past_due' then 3
             when 'paused' then 4
             else 5
         end asc,
         s.created_at asc, s.id asc
on conflict (id) do update
set stripe_customer_id = coalesce(
        public.hosts.stripe_customer_id,
        excluded.stripe_customer_id
    );

-- -----------------------------------------------------------------------------
-- 3. Keep updated_at fresh
-- -----------------------------------------------------------------------------
drop trigger if exists set_hosts_updated_at on public.hosts;

create trigger set_hosts_updated_at
    before update on public.hosts
    for each row
    execute function public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 4. Row Level Security: a host may only ever see and mutate their own row.
--    The FastAPI backend uses the service role key and bypasses RLS by design.
-- -----------------------------------------------------------------------------
alter table public.hosts enable row level security;

drop policy if exists "Hosts can view their own billing record" on public.hosts;
create policy "Hosts can view their own billing record"
    on public.hosts
    for select
    to authenticated
    using (id = (select auth.uid()));

drop policy if exists "Hosts can insert their own billing record" on public.hosts;

-- Deliberately NO update/delete policy: billing state is written exclusively by
-- the webhook handler through the service role, never by the browser session.

-- -----------------------------------------------------------------------------
-- 5. Retire the per-space Stripe columns. Billing identifiers now live on
--    public.hosts; spaces keep only the denormalised status mirror.
-- -----------------------------------------------------------------------------
alter table public.spaces drop column if exists stripe_customer_id;
alter table public.spaces drop column if exists stripe_subscription_id;
alter table public.spaces drop column if exists stripe_price_id;

-- -----------------------------------------------------------------------------
-- 6. Reconcile the denormalised space mirror default.
--    spaces.trial_ends_at is display data only (hosts.trial_ends_at is
--    authoritative), but aligning its default keeps newly created spaces
--    consistent with the hosts trial window.
-- -----------------------------------------------------------------------------
alter table public.spaces
    alter column trial_ends_at set default (now() + interval '14 days');

-- -----------------------------------------------------------------------------
-- 7. Explicit grants (defensive: default privileges already cover these roles,
--    but migrations must not depend on ambient database configuration).
-- -----------------------------------------------------------------------------
grant select on public.hosts to authenticated;
grant all on public.hosts to service_role;
