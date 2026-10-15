'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { CheckCircle2, RotateCcw } from 'lucide-react';

interface ContactSuccessStateProps {
  onReset: () => void;
}

export const ContactSuccessState: React.FC<ContactSuccessStateProps> = ({ onReset }) => {
  const t = useTranslations('contact');

  return (
    <div className="w-full max-w-xl mx-auto rounded-3xl bg-zinc-900/70 border border-emerald-500/30 p-8 sm:p-12 backdrop-blur-xl shadow-2xl shadow-emerald-950/30 text-center animate-in fade-in zoom-in-95 duration-300">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-6 shadow-md shadow-emerald-500/10">
        <CheckCircle2 className="h-8 w-8 text-emerald-400" />
      </div>

      <h2 className="text-2xl sm:text-3xl font-bold text-white font-display">
        {t('successTitle')}
      </h2>

      <p className="mt-3 text-sm sm:text-base text-zinc-300 leading-relaxed max-w-md mx-auto">
        {t('successMessage')}
      </p>

      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          onClick={onReset}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
        >
          <RotateCcw className="w-4 h-4 text-zinc-400" />
          <span>{t('sendAnother')}</span>
        </button>

        <Link
          href="/"
          className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-xl bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-zinc-950 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-emerald-500/20"
        >
          {t('backToHome')}
        </Link>
      </div>
    </div>
  );
};
