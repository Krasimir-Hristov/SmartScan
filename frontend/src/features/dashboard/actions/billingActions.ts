'use server';

import { ActionResult } from '../types/dashboardTypes';
import { fetchBackend } from './backendClient';

/**
 * Request body for a per-space billing operation.
 *
 * Billing is space-scoped: exactly ONE space gets its own dedicated Stripe
 * Subscription, so the backend expects `space_id` (a single id), not the
 * host-level `space_ids` array of the earlier billing model.
 */
interface CheckoutPayload {
  space_id: string;
  return_url?: string;
}

interface PortalPayload {
  return_url?: string;
}

/**
 * Creates a Stripe Checkout session for ONE space's dedicated subscription.
 */
export async function createCheckoutSessionAction(
  spaceId: string,
  returnUrl?: string
): Promise<ActionResult<{ checkout_url: string }>> {
  try {
    const payload: CheckoutPayload = { space_id: spaceId, return_url: returnUrl };
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
 * Creates a Stripe Customer Portal session listing every per-space subscription.
 */
export async function createCustomerPortalAction(
  spaceId: string,
  returnUrl?: string
): Promise<ActionResult<{ portal_url: string }>> {
  try {
    // The portal is account-scoped on the backend (one Stripe Customer owns all
    // per-space subscriptions), so no space_id is sent.
    const payload: PortalPayload = { return_url: returnUrl };
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

