'use client';

import React, { useState } from 'react';
import { LandingNavbar } from './components/landing-navbar';
import { LandingHero } from './components/landing-hero';
import { HeroShowcase } from './components/hero-showcase';
import { StatsRibbon } from './components/stats-ribbon';
import { HowItWorks } from './components/how-it-works';
import { FeaturesGrid } from './components/features-grid';
import { PricingSection } from './components/pricing-section';
import { Testimonials } from './components/testimonials';
import { LandingFooter } from './components/landing-footer';
import { AuthModal } from './components/auth-modal';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QrCode, ExternalLink, Sparkles } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isDemoOpen, setIsDemoOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-[#080b0a] text-zinc-100 flex flex-col antialiased selection:bg-emerald-500 selection:text-zinc-950">
      {/* Top sticky navigation bar */}
      <LandingNavbar
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenDemo={() => setIsDemoOpen(true)}
      />

      {/* Main landing sections */}
      <main className="flex-1 flex flex-col">
        <LandingHero
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenDemo={() => setIsDemoOpen(true)}
        />
        <HeroShowcase
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenDemo={() => setIsDemoOpen(true)}
        />
        <StatsRibbon />
        <HowItWorks />
        <FeaturesGrid />
        <PricingSection onOpenAuth={() => setIsAuthOpen(true)} />
        <Testimonials />
      </main>

      {/* Footer */}
      <LandingFooter />

      {/* Google OAuth & Registration Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onOpenDemo={() => setIsDemoOpen(true)}
      />

      {/* Interactive Guest Demo Modal */}
      <Dialog
        isOpen={isDemoOpen}
        onClose={() => setIsDemoOpen(false)}
        title="Live Guest Experience Demo"
        description="Experience SmartScan Stay exactly as a guest sees it when scanning an on-site QR stand."
      >
        <div className="flex flex-col items-center text-center gap-5 pt-2">
          <div className="relative p-6 rounded-3xl bg-zinc-900 border-2 border-emerald-500/40 shadow-xl shadow-emerald-500/10">
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-zinc-950 border border-emerald-400/40 text-emerald-400">
              <QrCode className="w-14 h-14 animate-pulse" />
            </div>
            <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-zinc-950">
              <Sparkles className="w-3 h-3" /> DEMO PROPERTY
            </span>
          </div>

          <div className="flex flex-col gap-1 max-w-sm">
            <h4 className="text-base font-bold text-white">Villa 1904 Sanctuary · Mykonos</h4>
            <p className="text-xs text-zinc-400">
              Zero app install. Tap below to launch the simulated mobile guest experience in a new tab.
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={() => {
              setIsDemoOpen(false);
              window.open('/stay/sanctuary-demo', '_blank');
            }}
            aria-label="Open Guest View in New Window"
            className="font-bold"
          >
            <span>Open Mobile Guest View</span>
            <ExternalLink className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </Dialog>
    </div>
  );
};
