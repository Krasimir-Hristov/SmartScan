'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'motion/react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Check, Sparkles, Shield, ArrowRight } from 'lucide-react';

export interface PricingSectionProps {
  onOpenAuth: () => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ onOpenAuth }) => {
  const t = useTranslations('pricing');

  const features = [
    t('feature1'),
    t('feature2'),
    t('feature3'),
    t('feature4'),
    t('feature5'),
    t('feature6'),
    t('feature7'),
  ];

  return (
    <section
      id="pricing"
      className="py-16 md:py-24 relative overflow-hidden scroll-mt-24"
      aria-labelledby="pricing-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge variant="emerald" className="mb-3 uppercase tracking-wider text-[11px]">
            {t('badge')}
          </Badge>
          <h2
            id="pricing-heading"
            className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight"
          >
            {t('title')}
          </h2>
          <p className="mt-3 text-base text-zinc-400 font-sans max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        {/* Centered Pricing Card */}
        <div className="max-w-xl mx-auto">
          <div className="relative rounded-3xl bg-zinc-950 border-2 border-emerald-500/50 p-8 sm:p-10 shadow-2xl shadow-emerald-950/40">

            {/* Top ribbon */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-extrabold bg-linear-to-r from-emerald-400 to-teal-400 text-zinc-950 shadow-md font-mono">
                <Sparkles className="w-3.5 h-3.5" />
                {t('tagline')}
              </span>
            </div>

            {/* Price Header — Pure Monthly Pricing */}
            <div className="text-center pb-8 border-b border-zinc-900">
              <div className="flex items-baseline justify-center gap-1">
                <span className="font-display text-5xl sm:text-6xl font-black text-white tracking-tight">
                  {t('monthlyPrice')}
                </span>
                <span className="text-sm font-medium text-zinc-400">
                  {t('monthlyPer')}
                </span>
              </div>
              <p className="mt-2 text-xs text-zinc-400 font-sans">
                {t('billedMonthlyNote')}
              </p>
            </div>

            {/* Features Checklist — Fully translated */}
            <div className="py-8 flex flex-col gap-3.5">
              {features.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 mt-0.5">
                    <Check className="w-3 h-3" />
                  </div>
                  <span className="text-sm text-zinc-300 leading-snug font-sans">{feature}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="pt-2 flex flex-col items-center gap-3">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={onOpenAuth}
                aria-label={t('ctaTrial')}
                className="relative overflow-hidden py-4 text-base font-bold shadow-xl shadow-emerald-500/30 group cursor-pointer transition-all hover:shadow-emerald-500/50 hover:scale-[1.01] active:scale-[0.98]"
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
                <span className="relative z-10">{t('ctaTrial')}</span>
                <ArrowRight className="relative z-10 w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('noCard')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
