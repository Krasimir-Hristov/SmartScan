'use client';

import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import {
  CreditCard,
  X,
  ExternalLink,
  ArrowRight,
  Loader2,
  Home,
  AlertCircle,
} from 'lucide-react';
import type { Space } from '@/lib/types/databaseTypes';
import { triggerHaptic } from '@/lib/utils';
import {
  createCheckoutSessionAction,
  createCustomerPortalAction,
} from '../actions/billingActions';

export interface SubscriptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaces?: Space[];
}

const emptySubscribe = () => () => {};

export const SubscriptionsModal: React.FC<SubscriptionsModalProps> = ({
  isOpen,
  onClose,
  spaces = [],
}) => {
  const t = useTranslations('dashboard');
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const [loadingSpaceId, setLoadingSpaceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const modalRef = React.useRef<HTMLDivElement>(null);

  // Focus trap, Escape key handling, and focus restoration
  useEffect(() => {
    if (!isOpen) return;

    const previousActive = document.activeElement as HTMLElement | null;
    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const timer = setTimeout(() => {
      const first = modalRef.current?.querySelector<HTMLElement>(focusableSelector);
      first?.focus();
    }, 50);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loadingSpaceId) {
        onClose();
        return;
      }

      if (event.key === 'Tab' && modalRef.current) {
        const focusableElements = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(focusableSelector)
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      previousActive?.focus();
    };
  }, [isOpen, loadingSpaceId, onClose]);

  if (!isOpen || !isClient) return null;

  const handleAction = async (space: Space) => {
    const status = space.subscription_status || 'trialing';
    const needsSubscription =
      (status === 'trialing' && !space.stripe_subscription_id) ||
      status === 'canceled';

    triggerHaptic(50);
    setLoadingSpaceId(space.id);
    setError(null);

    try {
      const returnUrl = window.location.href;
      if (needsSubscription) {
        const res = await createCheckoutSessionAction(space.id, returnUrl);
        if (res.success && res.data?.checkout_url) {
          window.location.assign(res.data.checkout_url);
        } else {
          setError(res.error || t('billing.checkoutError'));
        }
      } else {
        const res = await createCustomerPortalAction(space.id, returnUrl);
        if (res.success && res.data?.portal_url) {
          window.location.assign(res.data.portal_url);
        } else {
          setError(res.error || t('billing.portalError'));
        }
      }
    } catch (err: unknown) {
      setError(
        (err instanceof Error ? err.message : String(err)) ||
          t('billing.stripeError')
      );
    } finally {
      setLoadingSpaceId(null);
    }
  };

  const getStatusBadge = (status: string | null | undefined) => {
    const current = status || 'trialing';
    switch (current) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{t('billing.activeLabel')}</span>
          </span>
        );
      case 'trialing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>{t('billing.trialingLabel')}</span>
          </span>
        );
      case 'past_due':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/30 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span>{t('billing.pastDueLabel')}</span>
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-500/15 text-zinc-400 border border-zinc-500/30 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            <span>{t('billing.pausedLabel')}</span>
          </span>
        );
      case 'canceled':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-500/15 text-zinc-400 border border-zinc-500/30 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            <span>{t('billing.canceledLabel')}</span>
          </span>
        );
    }
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="subscriptions-modal-title"
      onClick={() => {
        if (!loadingSpaceId) onClose();
      }}
      className="fixed inset-0 z-100 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-3xl bg-zinc-950 border border-white/10 shadow-2xl p-5 sm:p-6 flex flex-col gap-4 sm:gap-5 max-h-[88dvh] overflow-hidden"
      >
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shadow-inner shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <h2
                id="subscriptions-modal-title"
                className="font-display text-base sm:text-lg font-bold text-white tracking-tight leading-tight truncate"
              >
                {t('billing.modalTitle')}
              </h2>
              <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5 line-clamp-1 sm:line-clamp-none">
                {t('billing.modalSubtitle')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={!!loadingSpaceId}
            aria-label={t('close')}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="relative z-10 flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Spaces Subscriptions List */}
        <div className="relative z-10 flex flex-col gap-2.5 max-h-[50dvh] sm:max-h-[52dvh] overflow-y-auto pr-1">
          {spaces.length === 0 ? (
            <div className="p-8 rounded-2xl bg-zinc-900/40 border border-dashed border-white/10 text-center text-zinc-500 text-xs">
              {t('emptyTitle')}
            </div>
          ) : (
            spaces.map((space) => {
              const status = space.subscription_status || 'trialing';
              const needsSubscription =
                (status === 'trialing' && !space.stripe_subscription_id) ||
                status === 'canceled';
              const isLoading = loadingSpaceId === space.id;

              return (
                <div
                  key={space.id}
                  className="p-3.5 sm:p-4 rounded-2xl bg-zinc-900/60 border border-white/8 hover:border-white/15 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  {/* Space Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-white/5 flex items-center justify-center text-zinc-400 shrink-0">
                      <Home className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display text-sm font-bold text-white truncate max-w-160px sm:max-w-180px">
                          {space.name}
                        </span>
                        {getStatusBadge(space.subscription_status)}
                      </div>
                      <span className="text-[11px] text-zinc-400 font-mono mt-0.5 truncate">
                        /stay/{space.slug} &bull; {t('billing.perMonth')}
                      </span>
                    </div>
                  </div>

                  {/* Stripe Action Button */}
                  <button
                    type="button"
                    onClick={() => handleAction(space)}
                    disabled={isLoading || !!loadingSpaceId}
                    className={`inline-flex items-center justify-center gap-2 px-3.5 py-2.5 sm:py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 w-full sm:w-auto ${
                      needsSubscription
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold shadow-md shadow-emerald-500/20'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 hover:border-emerald-500/30'
                    }`}
                  >
                    {isLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : needsSubscription ? (
                      <>
                        <span>{t('billing.subscribe')}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    ) : (
                      <>
                        <span>{t('billing.manageOrCancel')}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Note */}
        <div className="relative z-10 pt-3 border-t border-white/8 flex items-center justify-between text-[11px] text-zinc-500">
          <span>{t('billing.portalNote')}</span>
          <button
            type="button"
            onClick={onClose}
            disabled={!!loadingSpaceId}
            className="text-zinc-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
