import 'server-only';

import { cache } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import type { Space, KnowledgeChunk, StaySettings } from '@/lib/types/databaseTypes';
import { DEMO_VILLA_SMARTSCAN, type SpaceStayData } from '@/features/stay';

/**
 * Data Access Layer (DAL): Secure server-only abstraction for database operations.
 * - Enforces multi-tenant data boundaries.
 * - Protects raw database credentials from ever leaking to the browser.
 * - Uses React cache() for request-scoped query deduplication.
 */

/**
 * Helper to map a database Space row + stay_settings JSONB to SpaceStayData.
 */
function mapSpaceRowToStayData(space: Space): SpaceStayData {
  const settings: StaySettings = space.stay_settings || {};

  return {
    id: space.id,
    slug: space.slug,
    name: space.name,
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
        `Hello! Writing from ${space.name} regarding our stay.`,
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

/**
 * 1. Retrieves and verifies the currently authenticated host user.
 */
export const getAuthenticatedHost = cache(async (): Promise<User | null> => {
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

export const getCurrentUser = getAuthenticatedHost;

/**
 * 2. Retrieves all spaces owned by the authenticated host (for Host Dashboard).
 */
export const getHostSpaces = cache(async (hostId?: string): Promise<Space[]> => {
  try {
    const supabase = await createClient();
    let targetHostId = hostId;

    if (!targetHostId) {
      const user = await getAuthenticatedHost();
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

/**
 * 3. Retrieves an active space by its public slug (for Guest PWA).
 */
export const getSpaceBySlug = cache(async (slug: string): Promise<Space | null> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('spaces')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
});

/**
 * 4. Retrieves space stay data by slug with graceful fallback to the demo villa.
 * Used by /stay/[slug] to guarantee zero downtime even before database seeding.
 */
export const getSpaceStayDataWithFallback = cache(
  async (slug: string): Promise<SpaceStayData> => {
    try {
      const space = await getSpaceBySlug(slug);
      if (space) {
        return mapSpaceRowToStayData(space);
      }
    } catch {
      // Fallback on error
    }

    // Default fallback for demo or unfound slug
    return DEMO_VILLA_SMARTSCAN;
  }
);

/**
 * 5. Retrieves a single space by its unique UUID (for Dashboard SpaceEditor).
 */
export const getSpaceById = cache(async (id: string): Promise<Space | null> => {
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

/**
 * 6. Retrieves all knowledge chunks for a specific space (for Host Knowledge Editor).
 */
export const getSpaceKnowledgeChunks = cache(
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
