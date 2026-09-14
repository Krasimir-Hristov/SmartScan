import 'server-only';

import { cache } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import type { Space, KnowledgeChunk, StaySettings, GuestSpace } from '@/lib/types/databaseTypes';
import { DEMO_VILLA_SMARTSCAN, type SpaceStayData } from '@/features/stay';

/**
 * Data Access Layer (DAL): Secure server-only abstraction for database operations.
 * - Enforces multi-tenant data boundaries.
 * - Shields sensitive host billing data from anonymous guest queries.
 * - Uses React cache() for request-scoped query deduplication.
 * - Exports named wrapper functions for optimal stack traces and HMR safety.
 */

/**
 * Safe validator / parser for stay_settings JSONB values.
 * Guarantees a valid StaySettings object even if raw database content is malformed or null.
 */
function parseStaySettings(raw: unknown): StaySettings {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return {};
  }

  const record = raw as Record<string, unknown>;

  return {
    wifiSsid: typeof record.wifiSsid === 'string' ? record.wifiSsid : undefined,
    wifiPassword: typeof record.wifiPassword === 'string' ? record.wifiPassword : undefined,
    taxiAddress: typeof record.taxiAddress === 'string' ? record.taxiAddress : undefined,
    taxiPhone: typeof record.taxiPhone === 'string' ? record.taxiPhone : undefined,
    whatsappPhone: typeof record.whatsappPhone === 'string' ? record.whatsappPhone : undefined,
    whatsappPrefilledMessage:
      typeof record.whatsappPrefilledMessage === 'string'
        ? record.whatsappPrefilledMessage
        : undefined,
    emergencyNumber: typeof record.emergencyNumber === 'string' ? record.emergencyNumber : undefined,
    checkInTime: typeof record.checkInTime === 'string' ? record.checkInTime : undefined,
    checkOutTime: typeof record.checkOutTime === 'string' ? record.checkOutTime : undefined,
    keyboxCode: typeof record.keyboxCode === 'string' ? record.keyboxCode : undefined,
    nightSilenceStart:
      typeof record.nightSilenceStart === 'string' ? record.nightSilenceStart : undefined,
    nightSilenceEnd:
      typeof record.nightSilenceEnd === 'string' ? record.nightSilenceEnd : undefined,
    afternoonRestStart:
      typeof record.afternoonRestStart === 'string' ? record.afternoonRestStart : undefined,
    afternoonRestEnd:
      typeof record.afternoonRestEnd === 'string' ? record.afternoonRestEnd : undefined,
    customRules: typeof record.customRules === 'string' ? record.customRules : undefined,
    tagline: typeof record.tagline === 'string' ? record.tagline : undefined,
  };
}

/**
 * Maps a guest-safe space payload to the frontend SpaceStayData shape.
 */
function mapGuestSpaceToStayData(guestSpace: GuestSpace): SpaceStayData {
  const settings = parseStaySettings(guestSpace.stay_settings);

  return {
    id: guestSpace.id,
    slug: guestSpace.slug,
    name: guestSpace.name,
    tagline: settings.tagline || 'Boutique Digital Concierge Guide',
    wifi: {
      ssid: settings.wifiSsid || '',
      password: settings.wifiPassword || '',
      encryption: 'WPA',
    },
    contacts: {
      taxiAddress: settings.taxiAddress || '',
      taxiPhone: settings.taxiPhone || '',
      whatsappPhone: settings.whatsappPhone || '',
      whatsappPrefilledMessage:
        settings.whatsappPrefilledMessage ||
        `Hello! Writing from ${guestSpace.name} regarding our stay.`,
      emergencyNumber: settings.emergencyNumber || '112',
    },
    schedule: {
      checkInTime: settings.checkInTime || '15:00',
      checkOutTime: settings.checkOutTime || '11:00',
      keyboxCode: settings.keyboxCode,
    },
    quietHours:
      settings.nightSilenceStart && settings.nightSilenceEnd
        ? {
            nightStart: settings.nightSilenceStart,
            nightEnd: settings.nightSilenceEnd,
            siestaStart: settings.afternoonRestStart,
            siestaEnd: settings.afternoonRestEnd,
          }
        : undefined,
  };
}

// ----------------------------------------------------------------------------
// Internal Cached Implementations
// ----------------------------------------------------------------------------

const cachedGetAuthenticatedHost = cache(async (): Promise<User | null> => {
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

const cachedGetHostSpaces = cache(async (hostId?: string): Promise<Space[]> => {
  try {
    const supabase = await createClient();
    let targetHostId = hostId;

    if (!targetHostId) {
      const user = await cachedGetAuthenticatedHost();
      if (!user) return [];
      targetHostId = user.id;
    }

    const { data, error } = await supabase
      .from('spaces')
      .select('*')
      .eq('host_id', targetHostId)
      .order('created_at', { ascending: false });

    if (error) {
      return [];
    }

    return data ?? [];
  } catch {
    return [];
  }
});

const cachedGetGuestSpaceBySlug = cache(async (slug: string): Promise<GuestSpace | null> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('get_guest_space_by_slug', {
      space_slug: slug,
    });

    if (error || !data || data.length === 0) {
      return null;
    }

    return data[0];
  } catch {
    return null;
  }
});

const cachedGetSpaceStayDataWithFallback = cache(
  async (slug: string): Promise<SpaceStayData> => {
    try {
      const guestSpace = await cachedGetGuestSpaceBySlug(slug);
      if (guestSpace) {
        return mapGuestSpaceToStayData(guestSpace);
      }
    } catch {
      // Fallback on error
    }

    // Default fallback for demo or unfound slug
    return DEMO_VILLA_SMARTSCAN;
  }
);

const cachedGetSpaceById = cache(async (id: string): Promise<Space | null> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('spaces')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
});

const cachedGetSpaceKnowledgeChunks = cache(
  async (spaceId: string): Promise<KnowledgeChunk[]> => {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('knowledge_chunks')
        .select('*')
        .eq('space_id', spaceId)
        .order('created_at', { ascending: true });

      if (error) {
        return [];
      }

      return data ?? [];
    } catch {
      return [];
    }
  }
);

// ----------------------------------------------------------------------------
// Public Exported Named Functions
// ----------------------------------------------------------------------------

/**
 * 1. Retrieves and verifies the currently authenticated host user.
 */
export async function getAuthenticatedHost(): Promise<User | null> {
  return cachedGetAuthenticatedHost();
}

/**
 * Alias for getAuthenticatedHost() for backward compatibility.
 */
export async function getCurrentUser(): Promise<User | null> {
  return cachedGetAuthenticatedHost();
}

/**
 * 2. Retrieves all spaces owned by the authenticated host (for Host Dashboard).
 */
export async function getHostSpaces(hostId?: string): Promise<Space[]> {
  return cachedGetHostSpaces(hostId);
}

/**
 * 3. Retrieves public guest-safe space fields via secure RPC (shields host_id and Stripe IDs).
 */
export async function getGuestSpaceBySlug(slug: string): Promise<GuestSpace | null> {
  return cachedGetGuestSpaceBySlug(slug);
}

/**
 * 4. Retrieves space stay data by slug with graceful fallback to the demo villa.
 * Used by /stay/[slug] to guarantee zero downtime even before database seeding.
 */
export async function getSpaceStayDataWithFallback(slug: string): Promise<SpaceStayData> {
  return cachedGetSpaceStayDataWithFallback(slug);
}

/**
 * 5. Retrieves a single space by its unique UUID (for Dashboard SpaceEditor).
 */
export async function getSpaceById(id: string): Promise<Space | null> {
  return cachedGetSpaceById(id);
}

/**
 * 6. Retrieves all knowledge chunks for a specific space (for Host Knowledge Editor).
 */
export async function getSpaceKnowledgeChunks(spaceId: string): Promise<KnowledgeChunk[]> {
  return cachedGetSpaceKnowledgeChunks(spaceId);
}
