'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Clock,
  CreditCard,
  QrCode,
} from 'lucide-react';
import { HeroVisualStage } from './HeroVisualStage';

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
      className="relative pt-8 pb-12 md:pt-14 md:pb-20 overflow-hidden scroll-mt-24"
      aria-labelledby="hero-heading"
    >
      {/* Subtle high-tech perspective grid */}
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-size-[3.5rem_3.5rem] mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"
        aria-hidden="true"
      />

      {/* Background ambient animated glow */}
      <motion.div
        animate={{ opacity: [0.12, 0.25, 0.12], scale: [0.95, 1.05, 0.95] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-162.5 h-87.5 bg-radial from-emerald-500/20 via-emerald-900/5 to-transparent blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          
          {/* LEFT COLUMN: Punchy Copy & CTAs */}
          <div className="lg:col-span-5 text-center lg:text-left flex flex-col items-center lg:items-start">
            {/* Feature Announcement Pill */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="mb-4 inline-flex"
            >
              <Badge
                variant="emerald"
                className="px-3.5 py-1 text-xs font-semibold text-emerald-400 bg-emerald-950/80 border-emerald-500/30 gap-2 shadow-lg shadow-emerald-950/50"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>{t('pill')}</span>
              </Badge>
            </motion.div>

            {/* Main H1 Headline — Compact, punchy 1-2 lines */}
            <motion.h1
              id="hero-heading"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
              className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-[1.12]"
            >
              {t('headlinePre') && `${t('headlinePre')} `}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-emerald-400 via-emerald-300 to-teal-200">
                {t('headlineHighlight')}
              </span>{' '}
              {t('headlinePost')}
            </motion.h1>

            {/* Subtitle — Single crisp sentence */}
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
              className="mt-4 text-sm sm:text-base text-zinc-400 leading-relaxed font-sans max-w-lg"
            >
              {t('subtitle')}
            </motion.p>

            {/* CTA Buttons with Balanced Heights and Hover Micro-Interactions */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
              className="mt-7 flex flex-wrap items-center justify-center lg:justify-start gap-3 w-full sm:w-auto"
            >
              <Button
                variant="primary"
                onClick={onOpenAuth}
                aria-label={t('ctaPrimary')}
                className="relative overflow-hidden h-11 sm:h-12 px-5 sm:px-6 text-sm font-semibold rounded-xl shadow-lg shadow-emerald-500/25 group transition-all hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap shrink-0"
              >
                {/* Luminous Shimmer Light Beam Effect */}
                <motion.div
                  initial={{ x: '-120%' }}
                  animate={{ x: '220%' }}
                  transition={{
                    repeat: Infinity,
                    repeatDelay: 2.5,
                    duration: 1.4,
                    ease: 'easeInOut',
                  }}
                  className="pointer-events-none absolute inset-0 -skew-x-12 bg-linear-to-r from-transparent via-white/40 to-transparent"
                />
                <span className="relative z-10">{t('ctaPrimary')}</span>
                <ArrowRight className="relative z-10 w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Button>

              <Button
                variant="secondary"
                onClick={onOpenDemo}
                aria-label={t('ctaDemo')}
                className="h-11 sm:h-12 px-5 sm:px-6 text-sm font-medium rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-900/90 text-zinc-200 transition-all hover:bg-zinc-800/90 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap shrink-0"
              >
                <QrCode className="w-4 h-4 text-emerald-400" />
                <span>{t('ctaDemo')}</span>
              </Button>
            </motion.div>

            {/* Value & Risk-Free Indicators Strip */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4, ease: 'easeOut' }}
              className="mt-6 flex flex-wrap items-center justify-center lg:justify-start gap-y-2 gap-x-3 text-xs text-zinc-400"
            >
              <span className="inline-flex items-center gap-1.5 text-zinc-300">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                {t('setupTime')}
              </span>
              <span className="hidden sm:inline text-zinc-700">·</span>
              <span className="inline-flex items-center gap-1.5 text-zinc-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                {t('freeTrial')}
              </span>
              <span className="hidden sm:inline text-zinc-700">·</span>
              <span className="inline-flex items-center gap-1.5 text-zinc-300">
                <CreditCard className="w-3.5 h-3.5 text-zinc-400" />
                {t('noCard')}
              </span>
              <span className="hidden sm:inline text-zinc-700">·</span>
              <span className="text-zinc-400">{t('cancelAnytime')}</span>
            </motion.div>
          </div>

          {/* RIGHT COLUMN: Interactive Living Product Stage */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35, ease: 'easeOut' }}
            className="lg:col-span-7 w-full"
          >
            <HeroVisualStage onOpenDemo={onOpenDemo} />
          </motion.div>

        </div>
      </div>
    </section>
  );
};
