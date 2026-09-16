const SLUG_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';

/**
 * Generates a short, secure, non-ambiguous random slug (e.g. 'v-8k92pm')
 * optimized for camera QR scans and URL safety.
 */
export function generateSpaceSlug(length = 6): string {
  let result = 'v-';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < length; i++) {
      result += SLUG_ALPHABET[bytes[i] % SLUG_ALPHABET.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      const idx = Math.floor(Math.random() * SLUG_ALPHABET.length);
      result += SLUG_ALPHABET[idx];
    }
  }
  return result;
}
