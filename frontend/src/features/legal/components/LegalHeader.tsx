'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Printer, ShieldCheck, Calendar, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import type { LegalDocument } from '../types/legalTypes';

export interface LegalHeaderProps {
  document: LegalDocument;
}

export const LegalHeader: React.FC<LegalHeaderProps> = ({ document }) => {
  const tLegal = useTranslations('legal');

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <section className="relative pt-10 pb-8 border-b border-zinc-900 bg-linear-to-b from-zinc-950 via-[#0d0d12] to-zinc-950">
      {/* Background radial glow */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-162.5 h-64 bg-radial from-emerald-500/10 via-emerald-950/5 to-transparent blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start gap-4">
          {/* Eyebrow badge */}
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="emerald">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-400" />
              <span>{tLegal('badge')}</span>
            </Badge>

            <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <span>{document.lastUpdated}</span>
            </span>
          </div>

          {/* Main title */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white font-display tracking-tight leading-tight">
            {document.title}
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-zinc-400 max-w-3xl font-sans leading-relaxed">
            {document.subtitle}
          </p>

          {/* Summary Callout Card */}
          <div className="mt-2 w-full max-w-4xl rounded-2xl p-4 sm:p-5 bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-md">
            <p className="text-xs sm:text-sm text-zinc-300 font-sans leading-relaxed">
              {document.summary}
            </p>
          </div>

          {/* Actions Bar: Print & 10-Language Selector */}
          <div className="mt-2 flex flex-wrap items-center justify-between w-full max-w-4xl gap-3 pt-2">
            {/* 10-Language Switcher */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 flex items-center gap-1 font-mono">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span>{tLegal('switchToLang')}:</span>
              </span>
              <LanguageSwitcher align="left" variant="outlined" />
            </div>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              aria-label={tLegal('printDoc')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-white/10 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-zinc-400" />
              <span>{tLegal('printDoc')}</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
