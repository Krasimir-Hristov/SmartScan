import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/databaseTypes';

/**
 * Creates an administrative Supabase client using the secret key (service role).
 * Used strictly in trusted server-side environments (Server Actions, DAL) for operations
 * like executing protected RPCs with elevated privileges.
 *
 * Strictly requires SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY.
 * Does not fall back to publishable credentials to prevent silent authorization failures.
 */
export function createAdminClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseSecretKey =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing Supabase URL: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL must be set.');
  }

  if (!supabaseSecretKey) {
    throw new Error(
      'Missing Supabase service credential: SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY must be configured to construct an admin client.'
    );
  }

  return createClient<Database>(supabaseUrl, supabaseSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
