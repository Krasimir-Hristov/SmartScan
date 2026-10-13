'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'motion/react';
import {
  Cookie,
  ShieldCheck,
  CreditCard,
  X,
  ChevronRight,
  SlidersHorizontal,
  ChevronDown,
  CheckCircle2,
} from 'lucide-react';
import { useCookieConsent } from '../hooks/useCookieConsent';

export const CookieConsentBanner: React.FC = () => {
  const t = useTranslations('cookieBanner');
  const { isOpen, consentChoice, acceptAll, acceptEssential, close } = useCookieConsent();
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => {
      setIsDetailsOpen(true);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('smartscan:open-cookie-settings', handleOpen);
      return () => {
        window.removeEventListener('smartscan:open-cookie-settings', handleOpen);
      };
    }
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          role="dialog"
          aria-live="polite"
          aria-label={t('title')}
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.96 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 left-4 sm:left-auto sm:max-w-md md:max-w-lg z-50 rounded-2xl bg-[#121216]/95 border border-emerald-500/30 p-5 sm:p-6 shadow-2xl shadow-black/90 backdrop-blur-xl text-zinc-200 font-sans max-h-[85vh] overflow-y-auto"
        >
          {/* Top Decorative Emerald Accent Gradient */}
          <div
            className="absolute -top-px left-6 right-6 h-px bg-linear-to-r from-transparent via-emerald-400/80 to-transparent"
            aria-hidden="true"
          />

          {/* Header Row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-400 shadow-xs shadow-emerald-500/20 shrink-0">
                <Cookie className="h-4.5 w-4.5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white font-display tracking-tight leading-snug">
                  {t('title')}
                </h2>
                <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400 mt-0.5">
                  <span className="inline-flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>{t('gdprBadge')}</span>
                  </span>
                  <span className="text-zinc-600" aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 text-zinc-400">
                    <CreditCard className="w-3 h-3 text-emerald-400" />
                    <span>{t('stripeBadge')}</span>
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={close}
              aria-label={t('closeAria')}
              className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Description */}
          <p className="mt-3 text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
            {t('description')}
          </p>

          {/* Current Choice Indicator if already set */}
          {consentChoice && (
            <div className="mt-2.5 px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-white/5 flex items-center justify-between text-xs font-mono text-zinc-400">
              <span>{t('currentChoice')}:</span>
              <span className="text-emerald-400 font-bold">
                {consentChoice === 'all' ? t('statusAll') : t('statusEssential')}
              </span>
            </div>
          )}

          {/* Expandable Category Customization */}
          {isDetailsOpen && (
            <div className="mt-3.5 pt-3 border-t border-zinc-800/80 flex flex-col gap-2.5 text-xs">
              {/* Category 1: Essential */}
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-emerald-500/20">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    {t('catEssentialTitle')}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-500/30 text-[10px] font-mono text-emerald-300 font-bold">
                    {t('catEssentialBadge')}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                  {t('catEssentialDesc')}
                </p>
              </div>

              {/* Category 2: Marketing & Profiling (Zero-Trackers) */}
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    {t('catMarketingTitle')}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-[10px] font-mono text-zinc-400">
                    {t('catMarketingBadge')}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                  {t('catMarketingDesc')}
                </p>
              </div>
            </div>
          )}

          {/* Links & Customization toggle */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <Link
                href="/cookies"
                className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors font-medium cursor-pointer"
              >
                <span>{t('cookiePolicyLink')}</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
              <Link
                href="/privacy"
                className="hover:text-zinc-200 transition-colors cursor-pointer"
              >
                {t('privacyLink')}
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setIsDetailsOpen((prev) => !prev)}
              className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-emerald-300 transition-colors cursor-pointer font-mono"
            >
              <SlidersHorizontal className="w-3 h-3 text-emerald-400" />
              <span>{isDetailsOpen ? t('hideDetails') : t('customize')}</span>
              <ChevronDown
                className={`w-3 h-3 transition-transform ${isDetailsOpen ? 'rotate-180' : ''}`}
              />
            </button>
          </div>

          {/* Action Buttons with Equal Prominence (GDPR compliance) */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3 border-t border-zinc-800/80">
            <button
              type="button"
              onClick={acceptEssential}
              className="w-full inline-flex items-center justify-center rounded-xl px-4 py-2.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-200 hover:text-white text-xs font-semibold border border-white/10 hover:border-white/20 transition-all active:scale-[0.98] cursor-pointer"
            >
              {t('essentialOnly')}
            </button>

            <button
              type="button"
              onClick={acceptAll}
              className="w-full inline-flex items-center justify-center rounded-xl px-4 py-2.5 bg-linear-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-zinc-950 text-xs font-bold shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all active:scale-[0.98] cursor-pointer"
            >
              {t('acceptAll')}
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};
