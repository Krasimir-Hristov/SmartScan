'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ArrowRight, ShieldCheck, Star, QrCode } from 'lucide-react';

export interface LandingHeroProps {
  onOpenAuth: () => void;
  onOpenDemo: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onOpenAuth,
  onOpenDemo,
}) => {
  const t = useTranslations('hero');

  return (
    <section
      id="overview"
      className="relative pt-12 pb-16 md:pt-20 md:pb-24 overflow-hidden"
      aria-labelledby="hero-heading"
    >
      {/* Background ambient glow */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[650px] h-[350px] bg-radial from-emerald-500/15 via-emerald-900/5 to-transparent blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">

        {/* Feature Announcement Pill */}
        <div className="mb-6 inline-flex">
          <Badge
            variant="emerald"
            className="px-4 py-1.5 text-xs sm:text-sm font-semibold text-emerald-400 bg-emerald-950/80 border-emerald-500/30 gap-2"
          >
            <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>{t('pill')}</span>
          </Badge>
        </div>

        {/* Main H1 Headline — 3-part structure for highlighted middle */}
        <h1
          id="hero-heading"
          className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.12]"
        >
          {t('headlinePre')}{' '}
          <span className="text-transparent bg-clip-text bg-linear-to-r from-emerald-400 via-emerald-300 to-teal-200">
            {t('headlineHighlight')}
          </span>{' '}
          {t('headlinePost')}
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-base sm:text-lg md:text-xl text-zinc-400 max-w-3xl leading-relaxed font-sans">
          {t('subtitle')}
        </p>

        {/* CTA Buttons */}
        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md sm:max-w-none">
          <Button
            variant="primary"
            size="lg"
            onClick={onOpenAuth}
            aria-label={t('ctaPrimary')}
            className="w-full sm:w-auto px-8 py-4 text-base font-bold shadow-xl shadow-emerald-500/30 group"
          >
            <span>{t('ctaPrimary')}</span>
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>

          <Button
            variant="secondary"
            size="lg"
            onClick={onOpenDemo}
            aria-label={t('ctaDemo')}
            className="w-full sm:w-auto px-7 py-4 text-base font-medium border-emerald-500/20 hover:border-emerald-500/40 text-zinc-200"
          >
            <QrCode className="w-5 h-5 mr-2 text-emerald-400" />
            <span>{t('ctaDemo')}</span>
          </Button>
        </div>

        {/* Trust Indicators Strip */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-y-2 gap-x-4 text-xs sm:text-sm text-zinc-400">
          <div className="flex items-center gap-1 text-amber-400">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
            ))}
            <span className="ml-1 font-semibold text-zinc-200">{t('rating')}</span>
          </div>
          <span className="hidden sm:inline text-zinc-700">·</span>
          <span className="text-zinc-300">{t('trustedBy')}</span>
          <span className="hidden sm:inline text-zinc-700">·</span>
          <span className="inline-flex items-center gap-1 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            {t('zeroFee')}
          </span>
          <span className="hidden sm:inline text-zinc-700">·</span>
          <span>{t('noCard')}</span>
        </div>
      </div>
    </section>
  );
};
