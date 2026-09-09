---
name: supabase-pgvector
description: Production standard for Supabase integration, pgvector HNSW semantic search, RLS multi-tenant policies, and @supabase/ssr in Next.js 16+ & FastAPI.
---

# Supabase & pgvector Master Skill

This skill defines the authoritative patterns, database schemas, and client configurations for Supabase across the frontend (Next.js 16) and backend (FastAPI), strictly verified via official documentation and Context7.

---

## 1. Environment Keys & Variables (Bleeding-Edge Standard)

> [!IMPORTANT]
> **Zero Legacy Keys:** Do not use `anon_key` or `service_role_key`. Always use the modern `publishable` and `secret` API key formats.

```env
# Frontend (.env.local)
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sbp_...

# Backend (.env)
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SECRET_KEY=sbs_...
```

---

## 2. Multi-Tenant Database Schema (DDL)

### A. Extensions & Spaces Table
```sql
-- Enable pgvector extension
create extension if not exists vector;

-- Universal multi-tenant Spaces table
create table if not exists spaces (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text unique not null,
  space_type text not null default 'stay' check (space_type in ('stay', 'menu', 'real_estate', 'auto', 'insurance')),
  wifi_ssid text,
  wifi_password text,
  address text,
  contact_phone text,
  whatsapp_number text,
  check_in_instructions text,
  check_out_instructions text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for instant slug lookups by guests
create index if not exists idx_spaces_slug on spaces(slug);
create index if not exists idx_spaces_host_id on spaces(host_id);
```

### B. Knowledge Chunks with HNSW Vector Index
```sql
create table if not exists knowledge_chunks (
  id bigint generated always as identity primary key,
  space_id uuid not null references spaces(id) on delete cascade,
  content text not null,
  embedding vector(1536), -- Matches text-embedding-3-small or Gemini text-embedding-004
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Index for strict multi-tenant filtering
create index if not exists idx_knowledge_chunks_space_id on knowledge_chunks(space_id);

-- HNSW Vector Index for low-latency cosine distance search
create index if not exists idx_knowledge_chunks_hnsw 
on knowledge_chunks 
using hnsw (embedding vector_cosine_ops);
```

---

## 3. High-Performance Multi-Tenant RAG Function (RPC)

```sql
create or replace function match_space_knowledge (
  query_embedding vector(1536),
  filter_space_id uuid,
  match_threshold float default 0.6,
  match_count int default 3
)
returns table (
  id bigint,
  content text,
  similarity float,
  metadata jsonb
)
language sql stable
as $$
  select
    knowledge_chunks.id,
    knowledge_chunks.content,
    1 - (knowledge_chunks.embedding <=> query_embedding) as similarity,
    knowledge_chunks.metadata
  from knowledge_chunks
  where knowledge_chunks.space_id = filter_space_id
    and (knowledge_chunks.embedding <=> query_embedding) < (1 - match_threshold)
  order by knowledge_chunks.embedding <=> query_embedding
  limit match_count;
$$;
```

---

## 4. Row Level Security (RLS) Policies

```sql
-- 1. Spaces Security
alter table spaces enable row level security;

-- Hosts can CRUD only their own spaces
create policy "Hosts manage their own spaces"
on spaces for all to authenticated
using ((select auth.uid()) = host_id)
with check ((select auth.uid()) = host_id);

-- Guests can read spaces public profile by slug (read-only)
create policy "Guests can view space by slug"
on spaces for select to anon, authenticated
using (true);

-- 2. Knowledge Chunks Security
alter table knowledge_chunks enable row level security;

-- Hosts can CRUD knowledge for their spaces
create policy "Hosts manage knowledge for their spaces"
on knowledge_chunks for all to authenticated
using (
  space_id in (select id from spaces where host_id = (select auth.uid()))
)
with check (
  space_id in (select id from spaces where host_id = (select auth.uid()))
);
```

---

## 5. Next.js 16 (@supabase/ssr) Client Implementations

### A. Browser Client (`src/lib/supabase/client.ts`)
```typescript
import { createBrowserClient } from '@supabase/ssr';

export const createClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
};
```

### B. Server Component / Action Client (`src/lib/supabase/server.ts`)
```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const createClient = async () => {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have proxy/refresh middleware.
          }
        },
      },
    }
  );
};
```

---

## 6. Python FastAPI Backend Client (`backend/app/core/database.py`)

```python
from supabase import create_client, Client
from app.core.config import settings

def get_supabase_client() -> Client:
    """Returns an authenticated Supabase client using secret key for backend tasks."""
    return create_client(
        supabase_url=settings.SUPABASE_URL,
        supabase_key=settings.SUPABASE_SECRET_KEY,
    )
```

---

## 7. Anti-Patterns & Strict Prohibitions
- ❌ **Никога** не правете векторно търсене без филтъра `space_id = filter_space_id`.
- ❌ **Никога** не използвайте `anon_key` или `service_role_key` (остарели).
- ❌ **Никога** не излагайте `SUPABASE_SECRET_KEY` на клиента (в браузъра).
- ❌ **Никога** не ползвайте IVFFlat индекс за векторни знания в SmartScan — използвайте **HNSW** (`using hnsw (embedding vector_cosine_ops)`).
