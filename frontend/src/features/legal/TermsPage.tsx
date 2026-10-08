'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { LegalNavbar } from './components/LegalNavbar';
import { LegalHeader } from './components/LegalHeader';
import { LegalTableOfContents } from './components/LegalTableOfContents';
import { LegalSectionCard } from './components/LegalSectionCard';
import { LandingFooter } from '@/features/landing/components/LandingFooter';
import { buildTermsDocument } from './content/termsContent';

export const TermsPage: React.FC = () => {
  const tTerms = useTranslations('terms');
  const [activeId, setActiveId] = useState<string>('definitions');

  const doc = buildTermsDocument(tTerms);

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
      <LegalNavbar currentDoc="terms" />

      <main className="flex-1 flex flex-col">
        <LegalHeader document={doc} />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 w-full flex flex-col lg:flex-row gap-8 lg:gap-10">
          <LegalTableOfContents
            clauses={doc.clauses}
            activeId={activeId}
            onSelectClause={handleSelectClause}
          />

          <section className="flex-1 flex flex-col gap-6 max-w-4xl" aria-label="Terms of Service Clauses">
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
