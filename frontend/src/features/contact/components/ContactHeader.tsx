'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Sparkles, ShieldCheck, Clock } from 'lucide-react';

export const ContactHeader: React.FC = () => {
  const t = useTranslations('contact');

  return (
    <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-10">
      {/* Category Pill */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono tracking-wider uppercase mb-4 shadow-xs shadow-emerald-500/10">
        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
        <span>{t('badge')}</span>
      </div>

      {/* Main Headline */}
      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white font-display">
        {t('title')}
      </h1>

      {/* Subtitle */}
      <p className="mt-4 text-sm sm:text-base text-zinc-400 leading-relaxed max-w-xl">
        {t('subtitle')}
      </p>

      {/* Trust & SLA Signals */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-zinc-500 font-mono">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-emerald-400" />
          <span>{t('responseTime')}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>{t('privacyProtected')}</span>
        </span>
      </div>
    </div>
  );
};
