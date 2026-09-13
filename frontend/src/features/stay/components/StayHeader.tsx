'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { Sparkles } from 'lucide-react';

interface StayHeaderProps {
  propertyName: string;
  badgeText?: string;
}

export const StayHeader: React.FC<StayHeaderProps> = ({
  propertyName,
  badgeText,
}) => {
  const t = useTranslations('stay');

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-zinc-950/80 backdrop-blur-md border-b border-white/[0.08]">
      {/* Property Brand */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-xs shadow-emerald-500/20">
          <Sparkles className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
            <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-400 font-mono">
              {badgeText || t('propertyBadge')}
            </span>
          </div>
          <h1 className="font-display text-sm sm:text-base font-bold text-white truncate tracking-tight">
            {propertyName}
          </h1>
        </div>
      </div>

      {/* Language Switcher (10 Core Tourism Locales) */}
      <div className="shrink-0">
        <LanguageSwitcher align="right" variant="ghost" />
      </div>
    </header>
  );
};
