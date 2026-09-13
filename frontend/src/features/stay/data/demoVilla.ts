import { SpaceStayData } from '../types/stayTypes';

/**
 * Flagship Mock Data for „Вила Смарт Скан“ (Villa SmartScan).
 * Strictly ZERO photos / 100% High-Tech Typography and Vector Icons.
 * Prepared to seamlessly transition to Supabase pgvector DAL in Step 4.
 */
export const DEMO_VILLA_SMARTSCAN: SpaceStayData = {
  id: 'demo-space-villa-smartscan',
  slug: 'villa-smartscan',
  name: 'Villa SmartScan',
  tagline: 'Boutique Digital Concierge Guide',
  badge: 'SMARTSCAN STAY',
  wifi: {
    ssid: 'SmartScan_Villa_5G',
    password: 'SmartScan2026!',
    encryption: 'WPA2/WPA3',
  },
  contacts: {
    taxiAddress: '94 Pirin Str., Bansko, Bulgaria',
    taxiPhone: '+359888123456',
    whatsappPhone: '359888999888',
    whatsappPrefilledMessage: 'Hello! Writing from Villa SmartScan regarding our stay.',
    emergencyNumber: '112',
  },
  schedule: {
    checkInTime: '14:00',
    checkOutTime: '11:00',
    keyboxCode: '8492',
  },
  quietHours: {
    nightStart: '23:00',
    nightEnd: '08:00',
    siestaStart: '14:30',
    siestaEnd: '17:30',
  },
  hostName: 'Alexander',
};

/**
 * Lookup space stay data by slug.
 * Currently returns DEMO_VILLA_SMARTSCAN for 'villa-smartscan' (and fallbacks).
 */
export function getSpaceStayData(slug: string): SpaceStayData {
  // In Step 4, this function will query the Data Access Layer (DAL) from Supabase.
  // For now, it serves the flagship demo villa.
  if (
    slug === 'villa-smartscan' ||
    slug === 'sanctuary-demo' ||
    slug === 'demo'
  ) {
    return DEMO_VILLA_SMARTSCAN;
  }

  // Fallback template for any custom slug
  return {
    ...DEMO_VILLA_SMARTSCAN,
    slug,
    name: slug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' '),
  };
}
