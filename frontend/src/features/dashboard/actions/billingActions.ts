'use server';

import { createClient } from '@/lib/supabase/server';
import { ActionResult } from '../types/dashboardTypes';

const BACKEND_INTERNAL_URL = process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:8000';
const BACKEND_PROXY_SECRET = process.env.BACKEND_PROXY_SECRET || '';

/**
 * Creates a Stripe Checkout session by calling the backend API.
 */
export async function createCheckoutSessionAction(
  spaceId: string,
  returnUrl?: string
): Promise<ActionResult<{ checkout_url: string }>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Call FastAPI backend securely
    const response = await fetch(`${BACKEND_INTERNAL_URL}/api/py/billing/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': user.id,
        'x-user-email': user.email || '',
        'x-internal-auth': BACKEND_PROXY_SECRET,
      },
      body: JSON.stringify({
        space_id: spaceId,
        return_url: returnUrl,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Възникна грешка при създаването на плащане.');
    }

    const data = await response.json();
    return { success: true, data: { checkout_url: data.checkout_url } };
  } catch (error: any) {
    console.error('Checkout action error:', error);
    return { success: false, error: error.message || 'Сървърна грешка.' };
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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Call FastAPI backend securely
    const response = await fetch(`${BACKEND_INTERNAL_URL}/api/py/billing/portal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': user.id,
        'x-user-email': user.email || '',
        'x-internal-auth': BACKEND_PROXY_SECRET,
      },
      body: JSON.stringify({
        space_id: spaceId,
        return_url: returnUrl,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Възникна грешка при отварянето на портала.');
    }

    const data = await response.json();
    return { success: true, data: { portal_url: data.portal_url } };
  } catch (error: any) {
    console.error('Portal action error:', error);
    return { success: false, error: error.message || 'Сървърна грешка.' };
  }
}
