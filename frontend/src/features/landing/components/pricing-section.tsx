'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Sparkles, Shield, ArrowRight } from 'lucide-react';

export interface PricingSectionProps {
  onOpenAuth: () => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ onOpenAuth }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  const features = [
    'Unlimited guest queries & 50+ language polyglot AI',
    '60-second voice note ingest & auto knowledge formatting',
    'Custom branded mobile PWA (/stay/[slug]) with fast Wi-Fi copy',
    'High-res print-ready acrylic QR plaque PDF (A5/A6 300 DPI)',
    'Failsafe host WhatsApp & direct emergency escalation',
    'Free seasonal pausing (preserve data during off-season)',
    '14-day free trial with full access (no credit card required)',
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
            TRANSPARENT PRICING
          </Badge>
          <h2
            id="pricing-heading"
            className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight"
          >
            One Flat Fee per Property. Zero Hidden Overage Charges.
          </h2>
          <p className="mt-3 text-base text-zinc-400">
            Everything you need to host effortlessly. Free 14-day trial with full access to all features.
          </p>

          {/* Billing Switcher (Monthly vs Annual) */}
          <div className="mt-6 inline-flex items-center rounded-2xl bg-zinc-900/90 p-1 border border-zinc-800">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              aria-label="Monthly Billing"
              className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-emerald-500 text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('annual')}
              aria-label="Annual Billing (Save 27%)"
              className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                billingCycle === 'annual'
                  ? 'bg-emerald-500 text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span>Annual Billing</span>
              <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded-md border border-emerald-500/30">
                Save 27%
              </span>
            </button>
          </div>
        </div>

        {/* Centered Pricing Card */}
        <div className="max-w-xl mx-auto">
          <div className="relative rounded-3xl bg-zinc-950 border-2 border-emerald-500/50 p-8 sm:p-10 shadow-2xl shadow-emerald-950/40">
            {/* Top highlight ribbon */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-extrabold bg-linear-to-r from-emerald-400 to-teal-400 text-zinc-950 shadow-md">
                <Sparkles className="w-3.5 h-3.5" />
                ALL-INCLUSIVE LUXURY
              </span>
            </div>

            {/* Price Header */}
            <div className="text-center pb-8 border-b border-zinc-900">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl sm:text-6xl font-black text-white tracking-tight">
                  {billingCycle === 'monthly' ? '€9' : '€79'}
                </span>
                <span className="text-sm font-medium text-zinc-400">
                  {billingCycle === 'monthly' ? '/ month per property' : '/ year per property'}
                </span>
              </div>
              <p className="mt-2 text-xs text-zinc-400">
                {billingCycle === 'monthly'
                  ? 'Billed monthly. Pause or cancel anytime in your Stripe portal.'
                  : 'Billed annually (€6.58/mo). Includes complimentary seasonal pausing.'}
              </p>
            </div>

            {/* Features Checklist */}
            <div className="py-8 flex flex-col gap-3.5">
              {features.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 mt-0.5">
                    <Check className="w-3 h-3" />
                  </div>
                  <span className="text-sm text-zinc-300 leading-snug">{feature}</span>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <div className="pt-2 flex flex-col items-center gap-3">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={onOpenAuth}
                aria-label="Start 14-Day Free Trial for Property"
                className="py-4 text-base font-bold shadow-xl shadow-emerald-500/30 group"
              >
                <span>Start 14-Day Free Trial</span>
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>No credit card required · Instant 60s setup</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
