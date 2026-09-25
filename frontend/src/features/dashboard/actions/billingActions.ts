'use server';

import { createClient } from '@/lib/supabase/server';
import { ActionResult } from '../types/dashboardTypes';

const BACKEND_INTERNAL_URL = process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:8000';
const BACKEND_PROXY_SECRET = process.env.BACKEND_PROXY_SECRET || '';

interface BillingPayload {
  space_id: string;
  return_url?: string;
}

/**
 * Shared helper for authenticated billing POST requests to the backend.
 */
async function postBilling<T>(endpoint: string, payload: BillingPayload): Promise<T> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const response = await fetch(`${BACKEND_INTERNAL_URL}/api/py/billing/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': user.id,
      'x-user-email': user.email || '',
      'x-internal-auth': BACKEND_PROXY_SECRET,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errData: unknown = await response.json().catch(() => ({}));
    let detail = 'Error connecting to billing service.';
    if (errData && typeof errData === 'object' && 'detail' in errData && typeof errData.detail === 'string') {
      detail = errData.detail;
    }
    throw new Error(detail);
  }

  const data: unknown = await response.json();
  return data as T;
}

/**
 * Creates a Stripe Checkout session by calling the backend API.
 */
export async function createCheckoutSessionAction(
  spaceId: string,
  returnUrl?: string
): Promise<ActionResult<{ checkout_url: string }>> {
  try {
    const data = await postBilling<unknown>('checkout', { space_id: spaceId, return_url: returnUrl });
    
    if (!data || typeof data !== 'object' || !('checkout_url' in data) || typeof data.checkout_url !== 'string') {
      throw new Error('Invalid response from checkout service');
    }

    return { success: true, data: { checkout_url: data.checkout_url } };
  } catch (error: unknown) {
    console.error('Checkout action error:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Creates a Stripe Customer Portal session by calling the backend API.
 */
export async function createCustomerPortalAction(
  spaceId: string,
  returnUrl?: string
): Promise<ActionResult<{ portal_url: string }>> {
  try {
    const data = await postBilling<unknown>('portal', { space_id: spaceId, return_url: returnUrl });
    
    if (!data || typeof data !== 'object' || !('portal_url' in data) || typeof data.portal_url !== 'string') {
      throw new Error('Invalid response from portal service');
    }

    return { success: true, data: { portal_url: data.portal_url } };
  } catch (error: unknown) {
    console.error('Portal action error:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
