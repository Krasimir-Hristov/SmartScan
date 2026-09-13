'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { LandingNavbar } from './components/LandingNavbar';
import { LandingHero } from './components/LandingHero';
import { HeroShowcase } from './components/HeroShowcase';
import { StatsRibbon } from './components/StatsRibbon';
import { HowItWorks } from './components/HowItWorks';
import { FeaturesGrid } from './components/FeaturesGrid';
import { PricingSection } from './components/PricingSection';
import { LandingFooter } from './components/LandingFooter';
import { AuthModal } from './components/AuthModal';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { ExternalLink, Sparkles } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const emptySubscribe = () => () => {};
const getClientOrigin = () => (typeof window !== 'undefined' ? window.location.origin : '');
const getServerOrigin = () => '';

export const LandingPage: React.FC = () => {
  const tDemo = useTranslations('demo');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isDemoOpen, setIsDemoOpen] = useState(false);

  const origin = React.useSyncExternalStore(emptySubscribe, getClientOrigin, getServerOrigin);
  const demoUrl = origin ? `${origin}/stay/villa-smartscan` : '/stay/villa-smartscan';

  return (
    <div className="min-h-dvh bg-[#09090b] text-zinc-100 flex flex-col antialiased selection:bg-emerald-500 selection:text-zinc-950 font-sans">
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
      </main>

      {/* Footer */}
      <LandingFooter />

      {/* Google OAuth & Registration Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />

      {/* Interactive Guest Demo Modal with Scannable Vector QR Code */}
      <Dialog
        isOpen={isDemoOpen}
        onClose={() => setIsDemoOpen(false)}
        title={tDemo('title')}
        description={tDemo('desc')}
      >
        <div className="flex flex-col items-center text-center gap-5 pt-2">
          {/* Real Vector SVG QR Code Card */}
          <div className="relative p-4 rounded-3xl bg-white border-2 border-emerald-500/50 shadow-2xl shadow-emerald-500/15 flex items-center justify-center">
            <QRCodeSVG
              value={demoUrl}
              size={180}
              level="H"
              marginSize={0}
              fgColor="#09090b"
              bgColor="#ffffff"
            />
            <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-zinc-950 font-mono shadow-md whitespace-nowrap">
              <Sparkles className="w-3 h-3" /> {tDemo('demoBadge')}
            </span>
          </div>

          <div className="flex flex-col gap-1 max-w-sm">
            <h4 className="font-display text-base font-bold text-white tracking-tight">
              {tDemo('property')}
            </h4>
            <p className="text-xs text-zinc-400 font-sans leading-relaxed">
              {tDemo('subtitle')}
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={() => {
              setIsDemoOpen(false);
              window.open('/stay/villa-smartscan', '_blank');
            }}
            aria-label={tDemo('openGuest')}
            className="font-bold cursor-pointer"
          >
            <span>{tDemo('openGuest')}</span>
            <ExternalLink className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </Dialog>
    </div>
  );
};
