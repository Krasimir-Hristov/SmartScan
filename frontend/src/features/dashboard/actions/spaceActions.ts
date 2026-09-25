'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const BACKEND_INTERNAL_URL = process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:8000';
const BACKEND_PROXY_SECRET = process.env.BACKEND_PROXY_SECRET || '';
import { generateSpaceSlug } from '../utils/slugUtils';
import {
  PLAQUE_NAME_MAX_LENGTH,
  isPlaqueNameWithinLimit,
} from '../lib/plaqueName';
import type { Space, KnowledgeChunk, StaySettings } from '@/lib/types/databaseTypes';
import type {
  CreateSpaceInput,
  UpdateSpaceInput,
  CreateKnowledgeInput,
  ActionResult,
} from '../types/dashboardTypes';

/**
 * Printed plaques render the space name on a single line (see `lib/plaqueName.ts`),
 * so the limit is enforced before the record is written — not only in the UI.
 */
const NAME_TOO_LONG_ERROR = `Името на обекта не може да надвишава ${PLAQUE_NAME_MAX_LENGTH} знака — по-дългите имена не се побират на физическата табелка.`;

/**
 * Creates a new space for the authenticated host.
 */
export async function createSpaceAction(
  input: CreateSpaceInput
): Promise<ActionResult<Space>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Нямате оторизация за това действие.' };
    }

    const trimmedName = input.name?.trim();
    if (!trimmedName) {
      return { success: false, error: 'Името на обекта е задължително.' };
    }

    if (!isPlaqueNameWithinLimit(trimmedName)) {
      return { success: false, error: NAME_TOO_LONG_ERROR };
    }

    // Generate guaranteed-unique short public code (Airbnb / Booking style, e.g. 'v-8k92pm')
    let finalSlug = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      attempts++;
      const candidateSlug = generateSpaceSlug(6);
      const { data: existingSlug } = await supabase
        .from('spaces')
        .select('id')
        .eq('slug', candidateSlug)
        .maybeSingle();

      if (!existingSlug) {
        finalSlug = candidateSlug;
        isUnique = true;
      }
    }

    if (!finalSlug) {
      return { success: false, error: 'Грешка при генериране на уникален код за обекта.' };
    }

    const staySettings: StaySettings = {
      taxiAddress: input.taxiAddress?.trim() || undefined,
      wifiSsid: input.wifiSsid?.trim() || undefined,
      wifiPassword: input.wifiPassword?.trim() || undefined,
      taxiPhone: input.taxiPhone?.trim() || undefined,
      whatsappPhone: input.whatsappPhone?.trim() || undefined,
      emergencyNumber: input.emergencyNumber?.trim() || '112',
      nightSilenceStart: input.nightSilenceStart?.trim() || undefined,
      nightSilenceEnd: input.nightSilenceEnd?.trim() || undefined,
      afternoonRestStart: input.afternoonRestStart?.trim() || undefined,
      afternoonRestEnd: input.afternoonRestEnd?.trim() || undefined,
      checkInTime: input.checkInTime?.trim() || '15:00',
      checkOutTime: input.checkOutTime?.trim() || '11:00',
      keyboxCode: input.keyboxCode?.trim() || undefined,
    };

    const { data: createdSpace, error: insertError } = await supabase
      .from('spaces')
      .insert({
        host_id: user.id,
        name: trimmedName,
        slug: finalSlug,
        space_type: 'stay',
        is_active: true,
        stay_settings: staySettings,
      })
      .select('*')
      .single();

    if (insertError || !createdSpace) {
      return {
        success: false,
        error: insertError?.message || 'Грешка при създаване на обекта.',
      };
    }

    revalidatePath('/dashboard');
    return { success: true, data: createdSpace as Space };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Неочаквана грешка на сървъра.';
    return { success: false, error: message };
  }
}

/**
 * Updates basic info and stay_settings for an existing space owned by the host.
 */
export async function updateSpaceAction(
  input: UpdateSpaceInput
): Promise<ActionResult<Space>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Нямате оторизация за това действие.' };
    }

    const trimmedName = input.name?.trim();
    if (!trimmedName) {
      return { success: false, error: 'Името на обекта е задължително.' };
    }

    if (!isPlaqueNameWithinLimit(trimmedName)) {
      return { success: false, error: NAME_TOO_LONG_ERROR };
    }

    const { data: existingSpace, error: fetchError } = await supabase
      .from('spaces')
      .select('stay_settings')
      .eq('id', input.id)
      .eq('host_id', user.id)
      .single();

    if (fetchError || !existingSpace) {
      return { success: false, error: 'Нямате права над този обект или той не съществува.' };
    }

    const existingSettings = (existingSpace.stay_settings || {}) as StaySettings;

    const mergedStaySettings: StaySettings = {
      ...existingSettings,
      taxiAddress: input.taxiAddress !== undefined ? (input.taxiAddress?.trim() || undefined) : existingSettings.taxiAddress,
      wifiSsid: input.wifiSsid !== undefined ? (input.wifiSsid?.trim() || undefined) : existingSettings.wifiSsid,
      wifiPassword: input.wifiPassword !== undefined ? (input.wifiPassword?.trim() || undefined) : existingSettings.wifiPassword,
      taxiPhone: input.taxiPhone !== undefined ? (input.taxiPhone?.trim() || undefined) : existingSettings.taxiPhone,
      whatsappPhone: input.whatsappPhone !== undefined ? (input.whatsappPhone?.trim() || undefined) : existingSettings.whatsappPhone,
      emergencyNumber: input.emergencyNumber !== undefined ? (input.emergencyNumber?.trim() || '112') : (existingSettings.emergencyNumber || '112'),
      nightSilenceStart: input.nightSilenceStart !== undefined ? (input.nightSilenceStart?.trim() || undefined) : existingSettings.nightSilenceStart,
      nightSilenceEnd: input.nightSilenceEnd !== undefined ? (input.nightSilenceEnd?.trim() || undefined) : existingSettings.nightSilenceEnd,
      afternoonRestStart: input.afternoonRestStart !== undefined ? (input.afternoonRestStart?.trim() || undefined) : existingSettings.afternoonRestStart,
      afternoonRestEnd: input.afternoonRestEnd !== undefined ? (input.afternoonRestEnd?.trim() || undefined) : existingSettings.afternoonRestEnd,
      checkInTime: input.checkInTime !== undefined ? (input.checkInTime?.trim() || '15:00') : (existingSettings.checkInTime || '15:00'),
      checkOutTime: input.checkOutTime !== undefined ? (input.checkOutTime?.trim() || '11:00') : (existingSettings.checkOutTime || '11:00'),
      keyboxCode: input.keyboxCode !== undefined ? (input.keyboxCode?.trim() || undefined) : existingSettings.keyboxCode,
    };

    const { data: updatedSpace, error: updateError } = await supabase
      .from('spaces')
      .update({
        name: trimmedName,
        stay_settings: mergedStaySettings,
        ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
      })
      .eq('id', input.id)
      .eq('host_id', user.id)
      .select('*')
      .single();

    if (updateError || !updatedSpace) {
      return {
        success: false,
        error: updateError?.message || 'Грешка при обновяване на обекта.',
      };
    }

    revalidatePath('/dashboard');
    if (updatedSpace.slug) {
      revalidatePath(`/stay/${updatedSpace.slug}`);
    }

    return { success: true, data: updatedSpace as Space };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Неочаквана грешка на сървъра.';
    return { success: false, error: message };
  }
}

/**
 * Adds a textual knowledge chunk to the AI concierge knowledge base.
 */
export async function addKnowledgeChunkAction(
  input: CreateKnowledgeInput
): Promise<ActionResult<KnowledgeChunk>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Нямате оторизация за това действие.' };
    }

    const trimmedContent = input.content?.trim();
    if (!trimmedContent) {
      return { success: false, error: 'Съдържанието на бележката е задължително.' };
    }

    // Verify space ownership
    const { data: spaceOwner } = await supabase
      .from('spaces')
      .select('id')
      .eq('id', input.spaceId)
      .eq('host_id', user.id)
      .maybeSingle();

    if (!spaceOwner) {
      return { success: false, error: 'Нямате права над това пространство.' };
    }

    const { data: chunk, error: insertError } = await supabase
      .from('knowledge_chunks')
      .insert({
        space_id: input.spaceId,
        title: input.title?.trim() || 'Бележка за обекта',
        content: trimmedContent,
        category: input.category || 'general',
      })
      .select('*')
      .single();

    if (insertError || !chunk) {
      return {
        success: false,
        error: insertError?.message || 'Грешка при запис на знанието.',
      };
    }

    revalidatePath('/dashboard');
    return { success: true, data: chunk as KnowledgeChunk };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Неочаквана грешка на сървъра.';
    return { success: false, error: message };
  }
}

/**
 * Deletes a knowledge chunk.
 */
export async function deleteKnowledgeChunkAction(
  chunkId: string,
  spaceId: string
): Promise<ActionResult<boolean>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Нямате оторизация.' };
    }

    const { data: deletedChunk, error: deleteError } = await supabase
      .from('knowledge_chunks')
      .delete()
      .eq('id', chunkId)
      .eq('space_id', spaceId)
      .select('id')
      .maybeSingle();

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    // Zero deleted rows (wrong id / not owned) must not be reported as success.
    if (!deletedChunk) {
      return { success: false, error: 'Бележката не е намерена или вече е изтрита.' };
    }

    revalidatePath('/dashboard');
    return { success: true, data: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Неочаквана грешка при изтриване.';
    return { success: false, error: message };
  }
}

/**
 * Retrieves all knowledge chunks for a given space owned by the host.
 */
export async function getSpaceKnowledgeChunksAction(
  spaceId: string
): Promise<ActionResult<KnowledgeChunk[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Нямате оторизация.' };
    }

    // Verify host ownership of this space
    const { data: spaceOwner, error: ownerError } = await supabase
      .from('spaces')
      .select('id')
      .eq('id', spaceId)
      .eq('host_id', user.id)
      .maybeSingle();

    if (ownerError || !spaceOwner) {
      return { success: false, error: 'Нямате права над това пространство.' };
    }

    const { data: chunks, error: chunksError } = await supabase
      .from('knowledge_chunks')
      .select('*')
      .eq('space_id', spaceId)
      .order('created_at', { ascending: true });

    if (chunksError) {
      return { success: false, error: chunksError.message };
    }

    return { success: true, data: (chunks as KnowledgeChunk[]) ?? [] };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Неочаквана грешка при зареждане на знанията.';
    return { success: false, error: message };
  }
}

/**
 * Deletes an entire space owned by the host.
 */
export async function deleteSpaceAction(
  spaceId: string
): Promise<ActionResult<boolean>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized.' };
    }

    const response = await fetch(`${BACKEND_INTERNAL_URL}/api/py/spaces/${spaceId}`, {
      method: 'DELETE',
      headers: {
        'x-user-id': user.id,
        'x-internal-auth': BACKEND_PROXY_SECRET,
      }
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return { success: false, error: errData.detail || 'Failed to delete space securely.' };
    }

    revalidatePath('/dashboard');
    return { success: true, data: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error deleting space.';
    return { success: false, error: message };
  }

}
