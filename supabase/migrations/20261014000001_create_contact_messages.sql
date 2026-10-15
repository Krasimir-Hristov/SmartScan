-- ==============================================================================
-- Migration: 20261014000001_create_contact_messages.sql
-- Description: Contact Form Messages Schema (Step 14):
--   1. Create public.contact_messages table for visitor/client inquiries
--   2. Support Phone number, Email, Name, Subject, and Message
--   3. AI scalability fields: ai_summary, ai_sentiment, ai_suggested_reply, priority, metadata
--   4. Strict status enum constraint ('unread', 'read', 'archived', 'replied')
--   5. Hashed IP tracking for rate limiting (no plain PII stored)
--   6. Filter/sort index on created_at DESC, status, and priority
--   7. Row Level Security (RLS) - zero public SELECT, insert via hardened RPC
--   8. Automated updated_at trigger
--   9. Rate-limited, atomic submission RPC submit_contact_message (SECURITY DEFINER)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unread'
        CHECK (status IN ('unread', 'read', 'archived', 'replied')),
    priority TEXT NOT NULL DEFAULT 'normal'
        CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    ai_summary TEXT,
    ai_sentiment TEXT,
    ai_suggested_reply TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_hash TEXT,
    user_agent TEXT,
    replied_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Query and sorting indexes
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at
    ON public.contact_messages (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_messages_status
    ON public.contact_messages (status);

CREATE INDEX IF NOT EXISTS idx_contact_messages_priority
    ON public.contact_messages (priority);

CREATE INDEX IF NOT EXISTS idx_contact_messages_ip_hash_created
    ON public.contact_messages (ip_hash, created_at DESC);

-- Automated updated_at trigger (reuses hardened public.handle_updated_at)
DROP TRIGGER IF EXISTS set_contact_messages_updated_at ON public.contact_messages;
CREATE TRIGGER set_contact_messages_updated_at
    BEFORE UPDATE ON public.contact_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Row Level Security (RLS) Configuration
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Allow public insert directly if needed, but primary insertion is via the hardened RPC below
DROP POLICY IF EXISTS "Allow public insert for contact messages" ON public.contact_messages;
CREATE POLICY "Allow public insert for contact messages"
ON public.contact_messages
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Ensure anon & standard authenticated users CANNOT read or scrape contact submissions
-- Reads and updates are restricted to service_role (Admin / API) only
DROP POLICY IF EXISTS "Deny public select for contact messages" ON public.contact_messages;

-- Atomic, rate-limited RPC for public contact form submissions
CREATE OR REPLACE FUNCTION public.submit_contact_message(
    p_name TEXT,
    p_email TEXT,
    p_subject TEXT,
    p_message TEXT,
    p_phone TEXT DEFAULT NULL,
    p_ip_hash TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_recent_count INT := 0;
    v_message_id UUID;
    v_clean_name TEXT;
    v_clean_email TEXT;
    v_clean_phone TEXT;
    v_clean_subject TEXT;
    v_clean_message TEXT;
BEGIN
    v_clean_name := trim(p_name);
    v_clean_email := lower(trim(p_email));
    v_clean_phone := CASE WHEN p_phone IS NOT NULL AND trim(p_phone) <> '' THEN trim(p_phone) ELSE NULL END;
    v_clean_subject := trim(p_subject);
    v_clean_message := trim(p_message);

    -- Basic length validation
    IF length(v_clean_name) < 2 OR length(v_clean_name) > 100 THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_NAME');
    END IF;

    IF length(v_clean_email) < 5 OR length(v_clean_email) > 150 OR v_clean_email NOT LIKE '%@%.%' THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_EMAIL');
    END IF;

    IF length(v_clean_message) < 10 OR length(v_clean_message) > 3000 THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_MESSAGE');
    END IF;

    -- Rate limit check: maximum 5 messages per 10 minutes from the same hashed IP
    IF p_ip_hash IS NOT NULL AND p_ip_hash <> '' THEN
        SELECT count(*)
        INTO v_recent_count
        FROM public.contact_messages
        WHERE ip_hash = p_ip_hash
          AND created_at > (now() - interval '10 minutes');

        IF v_recent_count >= 5 THEN
            RETURN jsonb_build_object('success', false, 'error', 'RATE_LIMIT');
        END IF;
    END IF;

    -- Insert message with AI scalability placeholders
    INSERT INTO public.contact_messages (
        name,
        email,
        phone,
        subject,
        message,
        ip_hash,
        user_agent,
        status,
        priority,
        metadata
    ) VALUES (
        v_clean_name,
        v_clean_email,
        v_clean_phone,
        v_clean_subject,
        v_clean_message,
        p_ip_hash,
        p_user_agent,
        'unread',
        'normal',
        '{}'::jsonb
    )
    RETURNING id INTO v_message_id;

    RETURN jsonb_build_object('success', true, 'id', v_message_id);
END;
$$;

-- Grant execute rights to anon and authenticated visitors
GRANT EXECUTE ON FUNCTION public.submit_contact_message(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
