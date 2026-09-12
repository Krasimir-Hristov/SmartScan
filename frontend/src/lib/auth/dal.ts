import 'server-only';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

/**
 * Data Access Layer (DAL): Securely retrieves and verifies the authenticated host user.
 * Wrapped in React cache() to deduplicate requests within a single render pass.
 * Protected with 'server-only' to ensure it never runs on the client.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
});
