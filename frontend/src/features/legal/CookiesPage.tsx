'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { LegalNavbar } from './components/LegalNavbar';
import { LegalHeader } from './components/LegalHeader';
import { LegalTableOfContents } from './components/LegalTableOfContents';
import { LegalSectionCard } from './components/LegalSectionCard';
import { LandingFooter } from '@/features/landing/components/LandingFooter';
import { triggerCookieSettings } from '@/features/cookies';
import { SlidersHorizontal } from 'lucide-react';
import { buildCookiesDocument } from './content/cookiesContent';

export const CookiesPage: React.FC = () => {
  const tCookies = useTranslations('cookies');
  const [activeId, setActiveId] = useState<string>('what-are-cookies');

  const doc = useMemo(() => buildCookiesDocument(tCookies), [tCookies]);

  // Scrollspy to highlight active clause in TOC
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 160;
      const ids = doc.clauses.map((c) => c.id);

      for (let i = ids.length - 1; i >= 0; i--) {
        const id = ids[i];
        const el = document.getElementById(id);
        if (el && scrollPosition >= el.offsetTop) {
          setActiveId(id);
          return;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [doc.clauses]);

  const handleSelectClause = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const navbarOffset = 90;
      const top = el.getBoundingClientRect().top + window.scrollY - navbarOffset;
      window.scrollTo({ top, behavior: 'smooth' });
      setActiveId(id);
    }
  }, []);

  return (
    <div className="min-h-dvh bg-[#09090b] text-zinc-100 flex flex-col antialiased selection:bg-emerald-500 selection:text-zinc-950 font-sans">
      <LegalNavbar currentDoc="cookies" />

      <main className="flex-1 flex flex-col">
        <LegalHeader document={doc} />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 w-full flex flex-col lg:flex-row gap-8 lg:gap-10">
          <LegalTableOfContents
            clauses={doc.clauses}
            activeId={activeId}
            onSelectClause={handleSelectClause}
          />

          <section className="flex-1 flex flex-col gap-6 max-w-4xl" aria-label="Cookie Policy Clauses">
            {/* Interactive Consent Management Quick Action */}
            <div className="rounded-2xl bg-[#121216] border border-emerald-500/30 p-5 sm:p-6 shadow-xl shadow-black/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs uppercase tracking-wider font-semibold">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>{tCookies('manageConsentTitle')}</span>
                </div>
                <p className="text-xs sm:text-sm text-zinc-300 font-sans">
                  {tCookies('manageConsentDesc')}
                </p>
              </div>
              <button
                type="button"
                onClick={triggerCookieSettings}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-zinc-950 bg-linear-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 shadow-md shadow-emerald-500/20 transition-all active:scale-[0.98] cursor-pointer shrink-0"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>{tCookies('manageConsentBtn')}</span>
              </button>
            </div>

            {doc.clauses.map((clause) => (
              <LegalSectionCard key={clause.id} clause={clause} />
            ))}
          </section>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
};
