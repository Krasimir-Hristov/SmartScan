'use server';

import { createHmac } from 'crypto';
import { headers } from 'next/headers';
import { after } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ContactActionResult, ContactFormData } from '../types/contactTypes';

const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: 'NAME_TOO_SHORT' })
    .max(100, { message: 'NAME_TOO_LONG' }),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: 'INVALID_EMAIL' })
    .max(150, { message: 'EMAIL_TOO_LONG' }),
  phone: z
    .string()
    .trim()
    .max(35, { message: 'PHONE_TOO_LONG' })
    .regex(/^[\+0-9\s\(\)\-\.]*$/, { message: 'PHONE_INVALID' })
    .refine((val) => !val || /[0-9]/.test(val), { message: 'PHONE_INVALID' })
    .optional(),
  subject: z.enum(['general', 'sales', 'support', 'legal'], {
    error: 'INVALID_SUBJECT',
  }),
  message: z
    .string()
    .trim()
    .min(10, { message: 'MESSAGE_TOO_SHORT' })
    .max(3000, { message: 'MESSAGE_TOO_LONG' }),
  honeypot: z.string().optional(),
  consent: z.literal(true, {
    error: 'CONSENT_REQUIRED',
  }),
});

/**
 * Extracts client IP and generates a privacy-preserving SHA-256 HMAC keyed by a server secret.
 * Requires BACKEND_PROXY_SECRET or SUPABASE_SECRET_KEY to be configured in the environment.
 */
function getClientIpHash(headerStore: Headers): string {
  const platformForwarded = headerStore.get('x-vercel-forwarded-for');
  const rawForwarded = headerStore.get('x-forwarded-for');
  const forwardedChain = rawForwarded
    ? rawForwarded.split(',').map((ip) => ip.trim()).filter(Boolean)
    : [];

  const clientIp =
    (platformForwarded ? platformForwarded.split(',')[0].trim() : '') ||
    (forwardedChain.length > 0 ? forwardedChain[forwardedChain.length - 1] : '') ||
    headerStore.get('x-real-ip') ||
    '127.0.0.1';

  const secret =
    process.env.BACKEND_PROXY_SECRET ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    throw new Error(
      'Missing server secret for IP hashing: BACKEND_PROXY_SECRET, SUPABASE_SECRET_KEY, or SUPABASE_SERVICE_ROLE_KEY must be configured.'
    );
  }

  return createHmac('sha256', secret)
    .update(clientIp)
    .digest('hex');
}

/**
 * Server Action to submit contact messages via rate-limited admin RPC.
 */
export async function sendContactAction(
  formData: ContactFormData
): Promise<ContactActionResult> {
  try {
    // 1. Zod input validation
    const parseResult = contactSchema.safeParse(formData);
    if (!parseResult.success) {
      const fieldErrors: Partial<Record<keyof ContactFormData, string>> = {};
      for (const issue of parseResult.error.issues) {
        const field = issue.path[0] as keyof ContactFormData;
        if (field) {
          fieldErrors[field] = issue.message;
        }
      }
      return {
        success: false,
        error: 'VALIDATION_FAILED',
        fieldErrors,
      };
    }

    const validData = parseResult.data;

    // 2. Honeypot check (Automated Bot Trap)
    // If the hidden field was filled out, silently succeed without storing to prevent bot retries
    if (validData.honeypot && validData.honeypot.trim().length > 0) {
      return { success: true };
    }

    // 3. Extract request metadata
    const headerStore = await headers();
    const ipHash = getClientIpHash(headerStore);
    const userAgent = headerStore.get('user-agent')?.slice(0, 500) || null;

    // 4. Supabase Admin Client
    const supabase = createAdminClient();

    // 5. Submit via atomic rate-limited RPC with advisory locking
    const { data: rpcResponse, error: rpcError } = await supabase.rpc(
      'submit_contact_message',
      {
        p_name: validData.name,
        p_email: validData.email,
        p_phone: validData.phone || null,
        p_subject: validData.subject,
        p_message: validData.message,
        p_ip_hash: ipHash,
        p_user_agent: userAgent,
      }
    );

    if (rpcError) {
      console.error('[ContactAction] RPC execution failed:', rpcError.message);
      return {
        success: false,
        error: 'SERVER_ERROR',
      };
    }

    if (typeof rpcResponse === 'object' && rpcResponse !== null) {
      const result = rpcResponse as Record<string, unknown>;
      if (result.success === true) {
        if (typeof result.id === 'string') {
          const messageId = result.id;
          after(async () => {
            try {
              const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:8000';
              const proxySecret = process.env.BACKEND_PROXY_SECRET || '';
              const triageHeaders: Record<string, string> = {
                'Content-Type': 'application/json',
              };
              if (proxySecret) {
                triageHeaders['x-internal-auth'] = proxySecret;
              }

              await fetch(`${backendUrl}/api/py/admin/triage`, {
                method: 'POST',
                headers: triageHeaders,
                body: JSON.stringify({
                  message_id: messageId,
                  name: validData.name,
                  email: validData.email,
                  subject: validData.subject,
                  message: validData.message,
                }),
                signal: AbortSignal.timeout(10000),
              });
            } catch {
              // Non-blocking background triage; admin can also trigger manually in /admin
            }
          });
        }
        return { success: true };
      }

      if (result.error === 'RATE_LIMIT') {
        return {
          success: false,
          error: 'RATE_LIMIT',
        };
      }

      if (result.error === 'INVALID_PHONE') {
        return {
          success: false,
          error: 'VALIDATION_FAILED',
          fieldErrors: { phone: 'PHONE_INVALID' },
        };
      }

      return {
        success: false,
        error: 'SERVER_ERROR',
      };
    }

    return {
      success: false,
      error: 'SERVER_ERROR',
    };
  } catch (error) {
    console.error('[ContactAction] Unexpected error processing contact form:', error);
    return {
      success: false,
      error: 'SERVER_ERROR',
    };
  }
}
