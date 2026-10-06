'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { RotateCcw, ShieldAlert, PhoneCall } from 'lucide-react';

export interface StayErrorViewProps {
  reset: () => void;
}

export const StayErrorView: React.FC<StayErrorViewProps> = ({ reset }) => {
  const t = useTranslations('errorPages');

  return (
    <main
      role="alert"
      aria-label={t('stayTitle')}
      className="min-h-dvh bg-[#070709] text-zinc-100 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-md mx-auto rounded-3xl p-6 sm:p-8 bg-zinc-900/80 border border-white/10 shadow-2xl relative overflow-hidden text-center">
        {/* Ambient backlight */}
        <div
          className="absolute -top-20 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5 shadow-inner">
            <ShieldAlert className="w-7 h-7" aria-hidden="true" />
          </div>

          <span className="text-[11px] uppercase font-mono tracking-widest text-emerald-400/90 mb-2">
            SmartScan Stay
          </span>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2.5">
            {t('stayTitle')}
          </h1>

          <p className="text-sm text-zinc-400 leading-relaxed mb-6">
            {t('stayDesc')}
          </p>

          <div className="w-full flex flex-col gap-3">
            <button
              type="button"
              onClick={() => reset()}
              aria-label={t('retry')}
              className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-linear-to-r from-emerald-500 to-teal-600 text-zinc-950 font-semibold text-sm hover:from-emerald-400 hover:to-teal-500 active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              <span>{t('retry')}</span>
            </button>

            {/* Emergency SOS quick contact fallback */}
            <a
              href="tel:112"
              aria-label="Спешен телефон 112 / Emergency SOS 112"
              className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 text-red-300 font-medium text-xs transition-all cursor-pointer"
            >
              <PhoneCall className="w-3.5 h-3.5 text-red-400" aria-hidden="true" />
              <span>Спешна помощ (SOS 112)</span>
            </a>
          </div>
        </div>
      </div>
    </main>
  );
};
