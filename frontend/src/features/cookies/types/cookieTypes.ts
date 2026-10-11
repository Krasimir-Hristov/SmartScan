export type CookieConsentChoice = 'all' | 'essential' | null;

export interface CookieConsentData {
  choice: 'all' | 'essential';
  timestamp: number;
}

export const COOKIE_CONSENT_KEY = 'smartscan_cookie_consent';
export const COOKIE_CONSENT_MAX_AGE_DAYS = 180;
