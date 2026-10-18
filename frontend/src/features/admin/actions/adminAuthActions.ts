'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import {
  DEV_ADMIN_COOKIE_NAME,
  signAdminDevToken,
  TEST_ADMIN_EMAIL,
} from '@/lib/auth/adminDal';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { AdminActionResponse } from '../types/adminTypes';

const TEST_ADMIN_DEFAULT_PASSWORD =
  process.env.TEST_ADMIN_PASSWORD || 'admin123';

/**
 * Ensures the test admin account exists in Supabase Auth and public.hosts
 * with is_platform_admin = true.
 */
async function ensureTestAdminProvisioned(): Promise<string | null> {
  try {
    const supabaseAdmin = createAdminClient();
    const { data: listData } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });

    const existingUser = listData?.users?.find(
      (u) => u.email?.toLowerCase() === TEST_ADMIN_EMAIL
    );

    let adminUserId: string | null = existingUser?.id ?? null;

    if (!adminUserId) {
      const { data: created, error: createErr } =
        await supabaseAdmin.auth.admin.createUser({
          email: TEST_ADMIN_EMAIL,
          password: TEST_ADMIN_DEFAULT_PASSWORD,
          email_confirm: true,
          user_metadata: {
            full_name: 'SmartScan Owner (Test Admin)',
            is_platform_admin: true,
          },
        });

      if (!createErr && created.user) {
        adminUserId = created.user.id;
      }
    } else {
      await supabaseAdmin.auth.admin.updateUserById(adminUserId, {
        password: TEST_ADMIN_DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: 'SmartScan Owner (Test Admin)',
          is_platform_admin: true,
        },
      });
    }

    if (adminUserId) {
      const trialEnds = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await supabaseAdmin.from('hosts').upsert(
        {
          id: adminUserId,
          is_platform_admin: true,
          trial_claimed_at: new Date().toISOString(),
          trial_ends_at: trialEnds,
        },
        { onConflict: 'id' }
      );
    }

    return adminUserId;
  } catch {
    return null;
  }
}

/**
 * 1-Click Test Admin Login for development and staging verification.
 * Provisions the test admin user in Supabase and establishes an authenticated admin session.
 */
export async function loginAsTestAdminAction(): Promise<AdminActionResponse> {
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.ALLOW_TEST_ADMIN_LOGIN !== 'true'
  ) {
    return {
      success: false,
      error: 'Тестовият 1-клик вход е деактивиран в продукционна среда.',
    };
  }

  try {
    await ensureTestAdminProvisioned();

    try {
      const supabase = await createClient();
      await supabase.auth.signInWithPassword({
        email: TEST_ADMIN_EMAIL,
        password: TEST_ADMIN_DEFAULT_PASSWORD,
      });
    } catch {
      // Cookie session fallback below guarantees access even if password auth is disabled in Supabase settings
    }

    const cookieStore = await cookies();
    cookieStore.set(DEV_ADMIN_COOKIE_NAME, signAdminDevToken(TEST_ADMIN_EMAIL), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    revalidatePath('/admin');
    return { success: true };
  } catch {
    return {
      success: false,
      error: 'Неуспешно активиране на тестовия админ акаунт.',
    };
  }
}

/**
 * Standard Email + Password login for the platform administrator.
 */
export async function loginAdminWithPasswordAction(
  email: string,
  password: string
): Promise<AdminActionResponse> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();

  if (!cleanEmail || !cleanPassword) {
    return {
      success: false,
      error: 'Моля, въведете имейл и парола.',
    };
  }

  try {
    const isTestCandidate =
      (cleanEmail === 'admin' ||
        cleanEmail === 'admin@test.bg' ||
        cleanEmail === 'admin@smartscan.stay') &&
      (cleanPassword === 'admin' ||
        cleanPassword === 'admin123' ||
        cleanPassword === 'SmartScanAdmin2026!');

    // If logging in with the test admin credentials, auto-provision and log in immediately
    if (
      isTestCandidate &&
      (process.env.NODE_ENV !== 'production' ||
        process.env.ALLOW_TEST_ADMIN_LOGIN === 'true')
    ) {
      return loginAsTestAdminAction();
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: cleanPassword,
    });

    if (error || !data.user) {
      return {
        success: false,
        error: 'Невалиден имейл или парола.',
      };
    }

    const supabaseAdmin = createAdminClient();
    const { data: hostRow } = await supabaseAdmin
      .from('hosts')
      .select('is_platform_admin')
      .eq('id', data.user.id)
      .maybeSingle();

    const allowedEmails = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);

    const isAdmin =
      hostRow?.is_platform_admin === true ||
      allowedEmails.includes(cleanEmail) ||
      cleanEmail === TEST_ADMIN_EMAIL ||
      data.user.user_metadata?.is_platform_admin === true;

    if (!isAdmin) {
      await supabase.auth.signOut();
      return {
        success: false,
        error: 'Този акаунт няма администраторски права за достъп до /admin.',
      };
    }

    const cookieStore = await cookies();
    cookieStore.set(DEV_ADMIN_COOKIE_NAME, signAdminDevToken(cleanEmail), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    revalidatePath('/admin');
    return { success: true };
  } catch {
    return {
      success: false,
      error: 'Възникна системна грешка при вход. Опитайте отново.',
    };
  }
}

/**
 * Signs out the administrator and clears the admin session cookie.
 */
export async function logoutAdminAction(): Promise<AdminActionResponse> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(DEV_ADMIN_COOKIE_NAME);

    const supabase = await createClient();
    await supabase.auth.signOut();

    revalidatePath('/admin');
    return { success: true };
  } catch {
    return { success: false, error: 'Грешка при изход от системата.' };
  }
}
