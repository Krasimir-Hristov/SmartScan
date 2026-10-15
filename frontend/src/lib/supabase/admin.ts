import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/databaseTypes';

/**
 * Creates an administrative Supabase client using the secret key (service role).
 * Used strictly in trusted server-side environments (Server Actions, DAL) for operations
 * like executing protected RPCs with elevated privileges.
 */
export function createAdminClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseSecretKey =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing Supabase URL: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL must be set.');
  }

  const authKey =
    supabaseSecretKey ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!authKey) {
    throw new Error('Missing Supabase API key.');
  }

  return createClient<Database>(supabaseUrl, authKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
