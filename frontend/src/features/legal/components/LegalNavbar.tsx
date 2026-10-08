'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { NavbarAuthAction } from '@/features/landing/components/NavbarAuthAction';
import { AuthModal } from '@/features/landing/components/AuthModal';
import { QrCode, ArrowLeft, Shield, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SupportedLegalDoc } from '../types/legalTypes';

export interface LegalNavbarProps {
  currentDoc: SupportedLegalDoc;
}

export const LegalNavbar: React.FC<LegalNavbarProps> = ({ currentDoc }) => {
  const tLegal = useTranslations('legal');
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  return (
    <>
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
                  Stay Legal
                </span>
              </div>
            </Link>

            <Link
              href="/"
              aria-label={tLegal('backToHome')}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-900/60 hover:bg-zinc-800 border border-white/5 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{tLegal('backToHome')}</span>
            </Link>
          </div>

          {/* Center Tabs: Terms vs Privacy */}
          <nav
            className="flex items-center gap-1 p-1 rounded-full bg-zinc-900/80 border border-white/5 backdrop-blur-md"
            aria-label="Legal Documents Navigation"
          >
            <Link
              href="/terms"
              aria-current={currentDoc === 'terms' ? 'page' : undefined}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer',
                currentDoc === 'terms'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-xs shadow-emerald-500/20 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{tLegal('viewTerms')}</span>
            </Link>

            <Link
              href="/privacy"
              aria-current={currentDoc === 'privacy' ? 'page' : undefined}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer',
                currentDoc === 'privacy'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-xs shadow-emerald-500/20 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{tLegal('viewPrivacy')}</span>
            </Link>
          </nav>

          {/* Right Utilities */}
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher align="right" variant="ghost" />
            <div className="hidden sm:block">
              <NavbarAuthAction onOpenAuth={() => setIsAuthOpen(true)} />
            </div>
          </div>
        </div>
      </header>

      {/* Google OAuth Modal */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
};
