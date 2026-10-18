-- ==============================================================================
-- Migration: 20261018000001_admin_panel_and_analytics.sql
-- Description: Owner Admin Control Plane & Analytics Schema (Step 15):
--   1. Add is_platform_admin boolean flag to public.hosts for RBAC enforcement
--   2. Add admin_reply column to public.contact_messages to persist sent replies
--   3. Create public.space_analytics_events table for real-time QR scan and
--      AI Concierge conversation telemetry
--   4. Row Level Security (RLS) and performance indexes
-- ==============================================================================

-- 1. Add platform admin role flag to hosts
ALTER TABLE public.hosts
    ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.hosts.is_platform_admin IS
    'Designates the platform owner / administrator with access to the /admin control plane.';

CREATE INDEX IF NOT EXISTS idx_hosts_is_platform_admin
    ON public.hosts (is_platform_admin)
    WHERE is_platform_admin = true;

-- 2. Add admin_reply column to contact_messages
ALTER TABLE public.contact_messages
    ADD COLUMN IF NOT EXISTS admin_reply TEXT;

COMMENT ON COLUMN public.contact_messages.admin_reply IS
    'Stores the latest reply sent by the platform administrator to the inquiry author.';

-- 3. Create space_analytics_events for real-time KPI tracking (QR scans & AI chats)
CREATE TABLE IF NOT EXISTS public.space_analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
    event_type VARCHAR(30) NOT NULL
        CHECK (event_type IN ('qr_scan', 'chat_message', 'resolved_query')),
    locale VARCHAR(10),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_space_analytics_space_created
    ON public.space_analytics_events (space_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_space_analytics_type_created
    ON public.space_analytics_events (event_type, created_at DESC);

-- 4. Row Level Security (RLS) for space_analytics_events
ALTER TABLE public.space_analytics_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.space_analytics_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.space_analytics_events TO service_role;
