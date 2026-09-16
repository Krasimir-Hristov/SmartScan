'use server';

import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { createClient as createAdminSupabase } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/databaseTypes';

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

    const hostId = user.id;

    // 1. Delete all host's spaces (cascades to knowledge_chunks)
    const { error: deleteSpacesError } = await supabase
      .from('spaces')
      .delete()
      .eq('host_id', hostId);

    if (deleteSpacesError) {
      return {
        success: false,
        error: 'Failed to remove user spaces: ' + deleteSpacesError.message,
      };
    }

    // 2. If admin secret key is available, delete the user from auth.users
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY;

    if (supabaseUrl && secretKey) {
      const adminClient = createAdminSupabase<Database>(supabaseUrl, secretKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      const { error: adminDeleteError } =
        await adminClient.auth.admin.deleteUser(hostId);

      if (adminDeleteError) {
        // Fallback: continue with sign out
        console.warn('Admin deleteUser warning:', adminDeleteError.message);
      }
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
