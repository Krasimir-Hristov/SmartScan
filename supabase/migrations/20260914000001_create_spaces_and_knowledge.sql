-- ==============================================================================
-- Migration: 20260914000001_create_spaces_and_knowledge.sql
-- Description: Core Schema for SmartScan Stay:
--   1. Enable pgvector extension
--   2. Multi-tenant 'spaces' table (granular per-space billing, stay_settings JSONB)
--   3. 'knowledge_chunks' table with 1536-dim embeddings
--   4. HNSW Vector Index (vector_cosine_ops, m=16, ef_construction=64)
--   5. High-performance RLS policies with cached (SELECT auth.uid())
--   6. Secure RPC match_space_knowledge function with strict space_id isolation
--   7. Automated updated_at trigger
-- ==============================================================================

-- 1. Enable pgvector extension in extensions schema
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- 2. Create spaces table
CREATE TABLE IF NOT EXISTS public.spaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    space_type TEXT NOT NULL DEFAULT 'stay' 
        CHECK (space_type IN ('stay', 'menu', 'real_estate', 'auto', 'insurance')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Granular Stripe Billing (Per-Space Lifecycle)
    stripe_subscription_id TEXT,
    stripe_price_id TEXT,
    subscription_status TEXT NOT NULL DEFAULT 'trialing' 
        CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'paused', 'canceled')),
    trial_ends_at TIMESTAMPTZ DEFAULT (now() + interval '14 days'),
    
    -- Dedicated Stay Settings JSONB (Wi-Fi, taxi address, contacts, check-in/out, quiet hours)
    stay_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Flexible metadata for future vertical extensions
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT uq_spaces_slug UNIQUE (slug)
);

-- 3. Create knowledge_chunks table
CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    embedding extensions.vector(1536),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Foreign Key and Query Indexes (following supabase-postgres-best-practices)
CREATE INDEX IF NOT EXISTS idx_spaces_host_id ON public.spaces (host_id);
CREATE INDEX IF NOT EXISTS idx_spaces_slug ON public.spaces (slug);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_space_id ON public.knowledge_chunks (space_id);

-- 5. HNSW Vector Index for sub-millisecond semantic similarity search
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding_hnsw 
ON public.knowledge_chunks 
USING hnsw (embedding extensions.vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 6. Trigger for automated updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_spaces_updated_at ON public.spaces;
CREATE TRIGGER set_spaces_updated_at
    BEFORE UPDATE ON public.spaces
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_knowledge_chunks_updated_at ON public.knowledge_chunks;
CREATE TRIGGER set_knowledge_chunks_updated_at
    BEFORE UPDATE ON public.knowledge_chunks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 7. Row Level Security (RLS) Configuration
ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;

-- --- Policies for public.spaces ---

-- Public guests: Read access to active spaces by slug
DROP POLICY IF EXISTS "Public guests can view active spaces by slug" ON public.spaces;
CREATE POLICY "Public guests can view active spaces by slug"
ON public.spaces
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Hosts: Full CRUD on their own spaces using cached (SELECT auth.uid())
DROP POLICY IF EXISTS "Hosts can view their own spaces" ON public.spaces;
CREATE POLICY "Hosts can view their own spaces"
ON public.spaces
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = host_id);

DROP POLICY IF EXISTS "Hosts can insert their own spaces" ON public.spaces;
CREATE POLICY "Hosts can insert their own spaces"
ON public.spaces
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = host_id);

DROP POLICY IF EXISTS "Hosts can update their own spaces" ON public.spaces;
CREATE POLICY "Hosts can update their own spaces"
ON public.spaces
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = host_id)
WITH CHECK ((SELECT auth.uid()) = host_id);

DROP POLICY IF EXISTS "Hosts can delete their own spaces" ON public.spaces;
CREATE POLICY "Hosts can delete their own spaces"
ON public.spaces
FOR DELETE
TO authenticated
USING ((SELECT auth.uid()) = host_id);

-- --- Policies for public.knowledge_chunks ---

-- Hosts: Manage knowledge chunks belonging to their spaces
DROP POLICY IF EXISTS "Hosts can view knowledge chunks of their spaces" ON public.knowledge_chunks;
CREATE POLICY "Hosts can view knowledge chunks of their spaces"
ON public.knowledge_chunks
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.spaces s
        WHERE s.id = knowledge_chunks.space_id
          AND s.host_id = (SELECT auth.uid())
    )
);

DROP POLICY IF EXISTS "Hosts can insert knowledge chunks for their spaces" ON public.knowledge_chunks;
CREATE POLICY "Hosts can insert knowledge chunks for their spaces"
ON public.knowledge_chunks
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.spaces s
        WHERE s.id = knowledge_chunks.space_id
          AND s.host_id = (SELECT auth.uid())
    )
);

DROP POLICY IF EXISTS "Hosts can update knowledge chunks for their spaces" ON public.knowledge_chunks;
CREATE POLICY "Hosts can update knowledge chunks for their spaces"
ON public.knowledge_chunks
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.spaces s
        WHERE s.id = knowledge_chunks.space_id
          AND s.host_id = (SELECT auth.uid())
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.spaces s
        WHERE s.id = knowledge_chunks.space_id
          AND s.host_id = (SELECT auth.uid())
    )
);

DROP POLICY IF EXISTS "Hosts can delete knowledge chunks of their spaces" ON public.knowledge_chunks;
CREATE POLICY "Hosts can delete knowledge chunks of their spaces"
ON public.knowledge_chunks
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.spaces s
        WHERE s.id = knowledge_chunks.space_id
          AND s.host_id = (SELECT auth.uid())
    )
);

-- 8. Semantic Search RPC Function (Strict Multi-Tenant Space Isolation)
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
    WHERE k.space_id = filter_space_id
      AND s.is_active = true
      AND (1 - (k.embedding <=> query_embedding)) > match_threshold
    ORDER BY k.embedding <=> query_embedding ASC
    LIMIT LEAST(match_count, 20);
$$;

-- Secure function permissions: revoke broad public, grant to anon, authenticated, service_role
REVOKE EXECUTE ON FUNCTION public.match_space_knowledge(UUID, extensions.vector, FLOAT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_space_knowledge(UUID, extensions.vector, FLOAT, INT) TO anon, authenticated, service_role;
