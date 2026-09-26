'use server';

import { ActionResult } from '../types/dashboardTypes';
import { fetchBackend } from './backendClient';

interface BillingPayload {
  space_id: string;
  return_url?: string;
}

/**
 * Creates a Stripe Checkout session by calling the backend API.
 */
export async function createCheckoutSessionAction(
  spaceId: string,
  returnUrl?: string
): Promise<ActionResult<{ checkout_url: string }>> {
  try {
    const payload: BillingPayload = { space_id: spaceId, return_url: returnUrl };
    const data = await fetchBackend<unknown>('billing/checkout', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    
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
    const payload: BillingPayload = { space_id: spaceId, return_url: returnUrl };
    const data = await fetchBackend<unknown>('billing/portal', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    
    if (!data || typeof data !== 'object' || !('portal_url' in data) || typeof data.portal_url !== 'string') {
      throw new Error('Invalid response from portal service');
    }

    return { success: true, data: { portal_url: data.portal_url } };
  } catch (error: unknown) {
    console.error('Portal action error:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
