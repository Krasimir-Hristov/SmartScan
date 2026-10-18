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
  const lastDot = token.lastIndexOf('.');
  if (lastDot === -1) return null;

  const secondLastDot = token.lastIndexOf('.', lastDot - 1);
  if (secondLastDot === -1) return null;

  const email = token.slice(0, secondLastDot).trim().toLowerCase();
  const issuedAtStr = token.slice(secondLastDot + 1, lastDot);
  const providedSig = token.slice(lastDot + 1);

  if (!email || !issuedAtStr || !providedSig) return null;

  // Validate signature format (64-character lowercase/uppercase hex)
  if (!/^[0-9a-fA-F]{64}$/.test(providedSig)) return null;

  // Validate timestamp format (digits only)
  if (!/^\d+$/.test(issuedAtStr)) return null;

  const issuedAt = Number.parseInt(issuedAtStr, 10);
  if (Number.isNaN(issuedAt)) return null;

  const now = Date.now();
  // Reject future tokens (allowing 60s max tolerance for clock skew)
  if (issuedAt > now + 60_000) {
    return null;
  }

  // Reject expired tokens
  if (now - issuedAt > TOKEN_EXPIRY_MS) {
    return null;
  }

  try {
    const payload = `admin:${email}:${issuedAtStr}`;
    const expectedSig = createHmac('sha256', getSigningSecret())
      .update(payload)
      .digest('hex');

    const a = Buffer.from(providedSig, 'hex');
    const b = Buffer.from(expectedSig, 'hex');
    if (a.length !== b.length) return null;
    return timingSafeEqual(a, b) ? email : null;
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
