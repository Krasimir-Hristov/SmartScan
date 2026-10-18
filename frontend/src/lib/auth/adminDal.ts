import 'server-only';

import { cache } from 'react';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/lib/auth/dal';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  DEV_ADMIN_COOKIE_NAME,
  getConfiguredAdminEmails,
  LEGACY_TEST_ADMIN_EMAIL,
  signAdminDevToken,
  TEST_ADMIN_EMAIL,
  verifyAdminDevToken,
} from './adminSession';

export {
  DEV_ADMIN_COOKIE_NAME,
  LEGACY_TEST_ADMIN_EMAIL,
  signAdminDevToken,
  TEST_ADMIN_EMAIL,
};

export { getAdminDashboardSnapshot } from './adminSnapshot';

export interface AuthenticatedAdmin {
  id: string;
  email: string;
}

const cachedGetAuthenticatedAdmin = cache(async (): Promise<AuthenticatedAdmin | null> => {
  try {
    const allowedEmails = getConfiguredAdminEmails();
    const user = await getCurrentUser();

    if (user && user.email) {
      const normalizedEmail = user.email.trim().toLowerCase();
      // Server-controlled app_metadata or configured admin email list
      if (
        allowedEmails.has(normalizedEmail) ||
        user.app_metadata?.is_platform_admin === true
      ) {
        return { id: user.id, email: normalizedEmail };
      }

      // Check authoritative public.hosts database table
      const supabaseAdmin = createAdminClient();
      const { data: hostRow } = await supabaseAdmin
        .from('hosts')
        .select('is_platform_admin')
        .eq('id', user.id)
        .maybeSingle();

      if (hostRow?.is_platform_admin === true) {
        return { id: user.id, email: normalizedEmail };
      }
    }

    // Signed session cookie check
    const isTestLoginAllowed =
      process.env.ALLOW_TEST_ADMIN_LOGIN !== undefined
        ? process.env.ALLOW_TEST_ADMIN_LOGIN === 'true'
        : process.env.NODE_ENV !== 'production';

    if (isTestLoginAllowed) {
      const cookieStore = await cookies();
      const rawCookie = cookieStore.get(DEV_ADMIN_COOKIE_NAME)?.value;
      const verifiedEmail = verifyAdminDevToken(rawCookie);
      if (verifiedEmail) {
        return {
          id: user?.id || '00000000-0000-0000-0000-000000000001',
          email: verifiedEmail,
        };
      }
    }

    return null;
  } catch {
    return null;
  }
});

export async function getAuthenticatedAdmin(): Promise<AuthenticatedAdmin | null> {
  return cachedGetAuthenticatedAdmin();
}
