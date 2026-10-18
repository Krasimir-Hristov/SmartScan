'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getAuthenticatedAdmin } from '@/lib/auth/adminDal';
import { createAdminClient } from '@/lib/supabase/admin';
import type { AdminActionResponse } from '../types/adminTypes';

export interface ExtendTrialResponse extends AdminActionResponse {
  newTrialEndsAt?: string;
}

const extendTrialSchema = z.object({
  hostId: z.string().uuid({ message: 'Невалиден идентификатор на хазяин.' }),
  daysToAdd: z
    .number()
    .int()
    .min(1, { message: 'Дните трябва да са между 1 и 90.' })
    .max(90, { message: 'Дните трябва да са между 1 и 90.' }),
});

const toggleSpaceSchema = z.object({
  spaceId: z.string().uuid({ message: 'Невалиден идентификатор на пространство.' }),
  nextActive: z.boolean(),
});

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

  const validation = extendTrialSchema.safeParse({ hostId, daysToAdd });
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message || 'Невалидни входни данни.',
    };
  }

  const { hostId: validHostId, daysToAdd: safeDays } = validation.data;

  try {
    const supabaseAdmin = createAdminClient();
    const { data: existingHost } = await supabaseAdmin
      .from('hosts')
      .select('trial_ends_at, trial_claimed_at')
      .eq('id', validHostId)
      .maybeSingle();

    const nowMs = Date.now();
    let currentTrialEndMs = nowMs;
    if (existingHost?.trial_ends_at) {
      const parsedMs = new Date(existingHost.trial_ends_at).getTime();
      if (!Number.isNaN(parsedMs)) {
        currentTrialEndMs = parsedMs;
      }
    }

    const baseMs = currentTrialEndMs > nowMs ? currentTrialEndMs : nowMs;
    const newTrialEndsAt = new Date(
      baseMs + safeDays * 24 * 60 * 60 * 1000
    ).toISOString();

    const { error } = await supabaseAdmin.from('hosts').upsert(
      {
        id: validHostId,
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

  const validation = toggleSpaceSchema.safeParse({ spaceId, nextActive });
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message || 'Невалидни данни за пространство.',
    };
  }

  try {
    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin
      .from('spaces')
      .update({ is_active: validation.data.nextActive })
      .eq('id', validation.data.spaceId);

    if (error) {
      return { success: false, error: 'Неуспешна промяна на статуса на пространството.' };
    }

    revalidatePath('/admin');
    return { success: true };
  } catch {
    return { success: false, error: 'Системна грешка при промяна на пространството.' };
  }
}
