import 'server-only';

import { createHmac, timingSafeEqual } from 'crypto';

export const TEST_ADMIN_EMAIL = 'admin@test.bg';
export const LEGACY_TEST_ADMIN_EMAIL = 'admin@smartscan.stay';
export const DEV_ADMIN_COOKIE_NAME = 'smartscan_admin_session';

const TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getSigningSecret(): string {
  const secret =
    process.env.ADMIN_SESSION_SECRET ||
    process.env.BACKEND_PROXY_SECRET ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ADMIN_SESSION_SECRET or BACKEND_PROXY_SECRET must be set in production.');
    }
    return 'dev-fallback-admin-secret-smartscan-2026';
  }
  return secret;
}

/**
 * Signs an admin session token containing the email and an issuance timestamp.
 * Format: {email}:{issuedAt}:{signature}
 */
export function signAdminDevToken(email: string): string {
  const normalized = email.trim().toLowerCase();
  const issuedAt = Date.now().toString();
  const payload = `admin:${normalized}:${issuedAt}`;
  const signature = createHmac('sha256', getSigningSecret())
    .update(payload)
    .digest('hex');
  return `${normalized}.${issuedAt}.${signature}`;
}

/**
 * Verifies an admin session token, validating HMAC signature and expiry.
 */
export function verifyAdminDevToken(token: string | undefined): string | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [email, issuedAtStr, providedSig] = parts;
  if (!email || !issuedAtStr || !providedSig) return null;

  const issuedAt = Number.parseInt(issuedAtStr, 10);
  if (Number.isNaN(issuedAt)) return null;

  if (Date.now() - issuedAt > TOKEN_EXPIRY_MS) {
    return null; // Expired token
  }

  try {
    const payload = `admin:${email.trim().toLowerCase()}:${issuedAtStr}`;
    const expectedSig = createHmac('sha256', getSigningSecret())
      .update(payload)
      .digest('hex');

    const a = Buffer.from(providedSig, 'hex');
    const b = Buffer.from(expectedSig, 'hex');
    if (a.length !== b.length) return null;
    return timingSafeEqual(a, b) ? email.trim().toLowerCase() : null;
  } catch {
    return null;
  }
}

/**
 * Returns set of configured platform admin email addresses.
 */
export function getConfiguredAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS || '';
  const list = raw
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return new Set(list);
}
