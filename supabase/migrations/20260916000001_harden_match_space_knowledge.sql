-- ==============================================================================
-- Migration: 20260916000001_harden_match_space_knowledge.sql
-- Security hardening of match_space_knowledge:
--   1. Similarity threshold floor: GREATEST(match_threshold, 0.4) — callers can
--      no longer pass a negative/zero threshold to dump arbitrary knowledge
--      chunks for any active space UUID they happen to know.
--   2. EXECUTE revoked from anon and authenticated — semantic search is an
--      internal backend (service_role) capability. Guests reach this data
--      solely through the AI concierge; hosts read their own chunks via RLS.
-- ==============================================================================

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
      -- Hard floor: similarity threshold can be raised, never lowered below 0.4.
      AND (1 - (k.embedding <=> query_embedding)) > GREATEST(match_threshold, 0.4)
    ORDER BY k.embedding <=> query_embedding ASC
    LIMIT LEAST(match_count, 20);
$$;

REVOKE EXECUTE ON FUNCTION public.match_space_knowledge(UUID, extensions.vector, FLOAT, INT)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_space_knowledge(UUID, extensions.vector, FLOAT, INT)
    TO service_role;
