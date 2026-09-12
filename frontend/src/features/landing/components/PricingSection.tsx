'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Sparkles, Shield, ArrowRight } from 'lucide-react';

export interface PricingSectionProps {
  onOpenAuth: () => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ onOpenAuth }) => {
  const t = useTranslations('pricing');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

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
      className="py-16 md:py-24 relative overflow-hidden"
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
          <p className="mt-3 text-base text-zinc-400 font-sans">
            {t('subtitle')}
          </p>

          {/* Billing Switcher */}
          <div className="mt-6 inline-flex items-center rounded-2xl bg-zinc-900/90 p-1 border border-zinc-800">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              aria-label={t('monthly')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-emerald-500 text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {t('monthly')}
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('annual')}
              aria-label={`${t('annual')} — ${t('annualSave')}`}
              className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                billingCycle === 'annual'
                  ? 'bg-emerald-500 text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span>{t('annual')}</span>
              <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded-md border border-emerald-500/30">
                {t('annualSave')}
              </span>
            </button>
          </div>
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

            {/* Price Header */}
            <div className="text-center pb-8 border-b border-zinc-900">
              <div className="flex items-baseline justify-center gap-1">
                <span className="font-display text-5xl sm:text-6xl font-black text-white tracking-tight">
                  {billingCycle === 'monthly' ? t('monthlyPrice') : t('annualPrice')}
                </span>
                <span className="text-sm font-medium text-zinc-400">
                  {billingCycle === 'monthly' ? t('monthlyPer') : t('annualPer')}
                </span>
              </div>
              <p className="mt-2 text-xs text-zinc-400 font-sans">
                {billingCycle === 'monthly' ? t('billedMonthlyNote') : t('billedAnnuallyNote')}
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
                className="py-4 text-base font-bold shadow-xl shadow-emerald-500/30 group cursor-pointer"
              >
                <span>{t('ctaTrial')}</span>
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
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
