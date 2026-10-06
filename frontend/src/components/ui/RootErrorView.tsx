'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AlertTriangle, RotateCcw, LayoutDashboard, Home } from 'lucide-react';

export interface RootErrorViewProps {
  reset: () => void;
}

export const RootErrorView: React.FC<RootErrorViewProps> = ({ reset }) => {
  const t = useTranslations('errorPages');

  return (
    <main
      role="alert"
      aria-label={t('title500')}
      className="min-h-[80dvh] flex items-center justify-center p-4 relative"
    >
      <div className="w-full max-w-lg mx-auto rounded-3xl p-8 sm:p-10 bg-zinc-900/70 border border-white/10 backdrop-blur-xl shadow-2xl relative overflow-hidden text-center">
        {/* Ambient emerald backlight glow */}
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 shadow-inner">
            <AlertTriangle className="w-8 h-8" aria-hidden="true" />
          </div>

          <span className="text-xs uppercase font-mono tracking-widest text-emerald-400/80 mb-2">
            SmartScan Stay
          </span>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
            {t('title500')}
          </h1>

          <p className="text-sm text-zinc-400 leading-relaxed mb-8 max-w-md">
            {t('desc500')}
          </p>

          <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => reset()}
              aria-label={t('retry')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-linear-to-r from-emerald-500 to-teal-600 text-zinc-950 font-semibold text-sm hover:from-emerald-400 hover:to-teal-500 active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              <span>{t('retry')}</span>
            </button>

            <Link
              href="/dashboard"
              aria-label={t('backToDashboard')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 font-medium text-sm transition-all cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4" aria-hidden="true" />
              <span>{t('backToDashboard')}</span>
            </Link>

            <Link
              href="/"
              aria-label={t('home')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-transparent hover:bg-white/5 text-zinc-400 hover:text-zinc-200 font-medium text-sm transition-all cursor-pointer"
            >
              <Home className="w-4 h-4" aria-hidden="true" />
              <span>{t('home')}</span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
};
