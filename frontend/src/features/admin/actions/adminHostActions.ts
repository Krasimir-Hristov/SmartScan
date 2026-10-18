'use server';

import { revalidatePath } from 'next/cache';
import { getAuthenticatedAdmin } from '@/lib/auth/adminDal';
import { createAdminClient } from '@/lib/supabase/admin';
import type { AdminActionResponse } from '../types/adminTypes';

export interface ExtendTrialResponse extends AdminActionResponse {
  newTrialEndsAt?: string;
}

/**
 * Extends a host's account-level trial window by a specified number of days (e.g. +7 or +14).
 */
export async function extendHostTrialAction(
  hostId: string,
  daysToAdd: number = 7
): Promise<ExtendTrialResponse> {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return { success: false, error: 'Неоторизиран достъп.' };
  }

  const safeDays = Math.min(Math.max(daysToAdd, 1), 90);

  try {
    const supabaseAdmin = createAdminClient();
    const { data: existingHost } = await supabaseAdmin
      .from('hosts')
      .select('trial_ends_at, trial_claimed_at')
      .eq('id', hostId)
      .maybeSingle();

    const nowMs = Date.now();
    const currentTrialEndMs = existingHost?.trial_ends_at
      ? new Date(existingHost.trial_ends_at).getTime()
      : nowMs;

    const baseMs = currentTrialEndMs > nowMs ? currentTrialEndMs : nowMs;
    const newTrialEndsAt = new Date(
      baseMs + safeDays * 24 * 60 * 60 * 1000
    ).toISOString();

    const { error } = await supabaseAdmin.from('hosts').upsert(
      {
        id: hostId,
        trial_claimed_at: existingHost?.trial_claimed_at || new Date().toISOString(),
        trial_ends_at: newTrialEndsAt,
      },
      { onConflict: 'id' }
    );

    if (error) {
      return { success: false, error: 'Неуспешно удължаване на пробния период.' };
    }

    revalidatePath('/admin');
    return { success: true, newTrialEndsAt };
  } catch {
    return { success: false, error: 'Системна грешка при обновяване на хазяина.' };
  }
}

/**
 * Toggles the is_active flag of a space directly from the Owner Admin Panel.
 */
export async function toggleSpaceActiveAdminAction(
  spaceId: string,
  nextActive: boolean
): Promise<AdminActionResponse> {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return { success: false, error: 'Неоторизиран достъп.' };
  }

  try {
    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin
      .from('spaces')
      .update({ is_active: nextActive })
      .eq('id', spaceId);

    if (error) {
      return { success: false, error: 'Неуспешна промяна на статуса на обекта.' };
    }

    revalidatePath('/admin');
    return { success: true };
  } catch {
    return { success: false, error: 'Системна грешка при обновяване на обекта.' };
  }
}
