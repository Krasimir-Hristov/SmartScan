'use client';

import React, { useState } from 'react';
import { CreditCard, AlertTriangle, ExternalLink } from 'lucide-react';
import type { Space } from '@/lib/types/databaseTypes';
import { triggerHaptic } from '@/lib/utils';
import {
  createCheckoutSessionAction,
  createCustomerPortalAction,
} from '../../actions/billingActions';

export interface SpaceBillingCardProps {
  space: Space;
}

export const SpaceBillingCard: React.FC<SpaceBillingCardProps> = ({ space }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status = space.subscription_status || 'trialing';
  
  // Basic display logic depending on status
  const getStatusDisplay = () => {
    switch (status) {
      case 'active':
        return {
          label: 'Активен абонамент',
          description: 'Профилът е активен и платен. (€1.00/месец)',
          badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          dotClass: 'bg-emerald-400 animate-pulse',
        };
      case 'trialing':
        return {
          label: 'Пробен период',
          description: 'Използвате безплатния период. Абонирайте се, за да запазите достъпа си.',
          badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          dotClass: 'bg-amber-400 animate-pulse',
        };
      case 'paused':
        return {
          label: 'Паузиран',
          description: 'Абонаментът е паузиран. Обектът не е публично достъпен.',
          badgeClass: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
          dotClass: 'bg-zinc-400',
        };
      case 'past_due':
        return {
          label: 'Неуспешно плащане',
          description: 'Моля, обновете платежния си метод.',
          badgeClass: 'bg-red-500/10 text-red-400 border-red-500/30',
          dotClass: 'bg-red-400',
        };
      case 'canceled':
      default:
        return {
          label: 'Прекратен',
          description: 'Абонаментът е изтекъл или прекратен.',
          badgeClass: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
          dotClass: 'bg-zinc-400',
        };
    }
  };

  const display = getStatusDisplay();
  const needsSubscription = status === 'trialing' || status === 'canceled';

  const handleAction = async () => {
    triggerHaptic(50);
    setIsLoading(true);
    setError(null);
    try {
      const returnUrl = window.location.href;
      if (needsSubscription) {
        // Go to Checkout
        const res = await createCheckoutSessionAction(space.id, returnUrl);
        if (res.success && res.data?.checkout_url) {
          window.location.href = res.data.checkout_url;
        } else {
          setError(res.error || 'Грешка при пренасочване към плащане.');
        }
      } else {
        // Go to Customer Portal
        const res = await createCustomerPortalAction(space.id, returnUrl);
        if (res.success && res.data?.portal_url) {
          window.location.href = res.data.portal_url;
        } else {
          setError(res.error || 'Грешка при отваряне на портала.');
        }
      }
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : String(err)) || 'Възникна неочаквана грешка.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        
        {/* Status Info */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-zinc-400">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">Абонамент и Плащане</h3>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${display.badgeClass}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${display.dotClass}`} />
                  {display.label}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">{display.description}</p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="shrink-0 flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={handleAction}
            disabled={isLoading}
            className={`group inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed
              ${
                needsSubscription
                  ? 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400 focus:ring-emerald-500'
                  : 'bg-zinc-800 text-white hover:bg-zinc-700 focus:ring-zinc-600'
              }
            `}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : needsSubscription ? (
              <>
                Абонирай се <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </>
            ) : (
              <>
                Управление <ExternalLink className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
      
      {error && (
        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
};
