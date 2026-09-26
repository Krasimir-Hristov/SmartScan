'use server';

import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { createClient as createAdminSupabase } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/databaseTypes';
import { fetchBackend } from './backendClient';

export interface DeleteAccountResult {
  success: boolean;
  error?: string;
}

export async function deleteAccountAction(
  confirmEmail: string
): Promise<DeleteAccountResult> {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user || !user.email) {
      return {
        success: false,
        error: 'Unauthorized: No active session found.',
      };
    }

    const normalizedConfirm = confirmEmail.trim().toLowerCase();
    const normalizedUserEmail = user.email.trim().toLowerCase();

    if (normalizedConfirm !== normalizedUserEmail) {
      return {
        success: false,
        error: 'Email mismatch: The entered email does not match your account email.',
      };
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !secretKey) {
      return {
        success: false,
        error: 'Server configuration error: Admin credentials unavailable for account deletion.',
      };
    }

    const hostId = user.id;

    // 1. Backend Purge (Cancels Stripe subscriptions & deletes spaces)
    try {
      await fetchBackend('spaces/host/purge', { method: 'DELETE' });
    } catch (backendError) {
      const msg = backendError instanceof Error ? backendError.message : 'Unknown backend error';
      return {
        success: false,
        error: `Failed to safely purge account billing: ${msg}`,
      };
    }

    // 2. Privileged account deletion via Supabase Auth Admin
    const adminClient = createAdminSupabase<Database>(supabaseUrl, secretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { error: adminDeleteError } =
      await adminClient.auth.admin.deleteUser(hostId);

    const isNotFound =
      adminDeleteError?.message?.toLowerCase().includes('not found') ||
      (adminDeleteError as { status?: number } | undefined)?.status === 404;

    if (adminDeleteError && !isNotFound) {
      return {
        success: false,
        error: 'Failed to delete user account: ' + adminDeleteError.message,
      };
    }

    // 3. Sign out the user and clear session cookies
    await supabase.auth.signOut();

    return {
      success: true,
    };
  } catch {
    return {
      success: false,
      error: 'An unexpected error occurred while deleting your account.',
    };
  }
}
