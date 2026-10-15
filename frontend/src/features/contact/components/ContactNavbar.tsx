'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { QrCode, ArrowLeft } from 'lucide-react';

export const ContactNavbar: React.FC = () => {
  const tContact = useTranslations('contact');

  return (
    <header className="sticky top-0 z-40 w-full border-b border-emerald-950/40 bg-zinc-950/85 backdrop-blur-xl shadow-lg shadow-black/40">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo & Back to Home */}
        <div className="flex items-center gap-3 sm:gap-6">
          <Link
            href="/"
            aria-label="SmartScan Stay Home"
            className="flex items-center gap-2.5 group cursor-pointer transition-opacity hover:opacity-90"
          >
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-emerald-400 to-teal-600 shadow-md shadow-emerald-500/20 group-hover:shadow-emerald-500/35 transition-all">
              <QrCode className="h-5 w-5 text-zinc-950" />
            </div>
            <div className="flex flex-col">
              <span className="text-base sm:text-lg font-bold tracking-tight text-white font-display">
                SmartScan
              </span>
              <span className="text-[10px] font-medium tracking-wider uppercase text-emerald-500/80 -mt-1 font-mono">
                Stay Contact
              </span>
            </div>
          </Link>

          <Link
            href="/"
            aria-label={tContact('backToHome')}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-900/60 hover:bg-zinc-800 border border-white/5 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{tContact('backToHome')}</span>
          </Link>
        </div>

        {/* Right Actions: Back to Home (Mobile) + Language Switcher */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label={tContact('backToHome')}
            className="inline-flex md:hidden items-center justify-center p-2 rounded-lg text-zinc-400 hover:text-white bg-zinc-900/60 border border-white/5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <LanguageSwitcher align="right" variant="ghost" />
        </div>
      </div>
    </header>
  );
};
