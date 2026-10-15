'use server';

import { createHash } from 'crypto';
import { headers } from 'next/headers';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
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
 * Extracts client IP and generates a privacy-preserving SHA-256 hash.
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

  return createHash('sha256')
    .update(`${clientIp}-smartscan-stay-contact-salt`)
    .digest('hex');
}

/**
 * Server Action to submit contact messages to Supabase without exposing public contacts.
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

    // 4. Supabase Client
    const supabase = await createClient();

    // 5. Submit via atomic rate-limited RPC
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

    if (!rpcError && typeof rpcResponse === 'object' && rpcResponse !== null) {
      const result = rpcResponse as Record<string, unknown>;
      if (result.success === true) {
        // Architectural Hook for future scaling:
        // 1. Asynchronous AI triage (Gemini Flash summary, sentiment, draft response)
        // 2. Notification dispatch to owner inbox via Resend / SMTP
        return { success: true };
      }
      if (result.error === 'RATE_LIMIT') {
        return {
          success: false,
          error: 'RATE_LIMIT',
        };
      }
    }

    // Fallback: Direct table insert if RPC is not yet synchronized
    const { error: insertError } = await supabase
      .from('contact_messages')
      .insert({
        name: validData.name,
        email: validData.email,
        phone: validData.phone || null,
        subject: validData.subject,
        message: validData.message,
        ip_hash: ipHash,
        user_agent: userAgent,
        status: 'unread',
        priority: 'normal',
        metadata: {},
      });

    if (insertError) {
      // In development or preview environments where migrations are pending,
      // log to console and return user-friendly error
      console.warn('[ContactAction] Failed to insert contact message:', insertError.message);
      return {
        success: false,
        error: 'DATABASE_ERROR',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('[ContactAction] Unexpected error processing contact form:', error);
    return {
      success: false,
      error: 'SERVER_ERROR',
    };
  }
}
