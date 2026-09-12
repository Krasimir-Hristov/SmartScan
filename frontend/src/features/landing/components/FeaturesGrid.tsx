'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { locales } from '@/lib/i18n/config';
import { ShieldCheck, Zap, Globe, MessageSquareWarning, ArrowUpRight, Phone, CheckCircle2, Check } from 'lucide-react';

/**
 * Renders a real SVG flag via flag-icons CSS (imported in globals.css).
 * Works on Windows unlike emoji flags.
 */
interface FlagChipProps {
  countryCode: string;
  code: string;
}

const FlagChip: React.FC<FlagChipProps> = ({ countryCode, code }) => (
  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200">
    <span
      className={`fi fi-${countryCode} rounded-[2px] shrink-0`}
      style={{ width: '1rem', height: '0.75rem', display: 'inline-block', backgroundSize: 'cover' }}
      aria-hidden="true"
    />
    <span className="font-mono font-medium uppercase">{code}</span>
  </span>
);

export const FeaturesGrid: React.FC = () => {
  const t = useTranslations('features');

  return (
    <section className="py-16 md:py-24 bg-zinc-950/40 relative" aria-labelledby="features-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-14">
          <Badge variant="emerald" className="mb-3 uppercase tracking-wider text-[11px]">
            {t('badge')}
          </Badge>
          <h2
            id="features-heading"
            className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight"
          >
            {t('title')}
          </h2>
          <p className="mt-3 text-base text-zinc-400 font-sans">
            {t('subtitle')}
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Card 1: Wide (2 cols) — Zero Knowledge Misdirection */}
          <div className="md:col-span-2 rounded-3xl bg-zinc-950/90 border border-emerald-500/20 p-7 shadow-xl flex flex-col justify-between hover:border-emerald-500/40 transition-all">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-400">
                  {t('card1Badge')}
                </span>
              </div>
              <h3 className="font-display text-xl sm:text-2xl font-bold text-white mb-2">
                {t('card1Title')}
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl mb-6 font-sans">
                {t('card1Desc')}
              </p>

              {/* Verified Property Guardrail Visual — sleek, host-friendly, zero code */}
              <div className="rounded-2xl bg-zinc-900/90 border border-emerald-500/20 p-4 sm:p-5 font-sans">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800 text-xs">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                    {t('card1VisualHeader')}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-md border border-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    {t('card1VisualStatus')}
                  </span>
                </div>
                <div className="flex flex-col gap-3 text-xs">
                  <div className="flex items-start gap-3 text-zinc-300">
                    <span className="p-1 rounded-md bg-emerald-500/10 text-emerald-400 mt-0.5 shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                    <span className="leading-relaxed">
                      {t('card1VisualPoint1')}
                    </span>
                  </div>
                  <div className="flex items-start gap-3 text-zinc-300">
                    <span className="p-1 rounded-md bg-emerald-500/10 text-emerald-400 mt-0.5 shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </span>
                    <span className="leading-relaxed">
                      {t('card1VisualPoint2')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-900 text-xs text-zinc-500">
              {t('card1Footer')}
            </div>
          </div>

          {/* Card 2: Instant Speed (SSE) */}
          <div className="rounded-3xl bg-zinc-950/90 border border-emerald-500/20 p-7 shadow-xl flex flex-col justify-between hover:border-emerald-500/40 transition-all">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  <Zap className="w-5 h-5" />
                </span>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-teal-400">
                  {t('card2Badge')}
                </span>
              </div>
              <h3 className="font-display text-xl font-bold text-white mb-2">{t('card2Title')}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-6 font-sans">
                {t('card2Desc')}
              </p>

              <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-4 text-center">
                <div className="font-display text-3xl font-extrabold text-teal-400 mb-1">&lt; 1.2s</div>
                <div className="text-xs text-zinc-400">First Token Stream Velocity</div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-900 text-xs text-zinc-500">
              {t('card2Footer')}
            </div>
          </div>

          {/* Card 3: Universal Polyglot */}
          <div className="rounded-3xl bg-zinc-950/90 border border-emerald-500/20 p-7 shadow-xl flex flex-col justify-between hover:border-emerald-500/40 transition-all">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Globe className="w-5 h-5" />
                </span>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-400">
                  {t('card3Badge')}
                </span>
              </div>
              <h3 className="font-display text-xl font-bold text-white mb-2">{t('card3Title')}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-6 font-sans">
                {t('card3Desc')}
              </p>

              {/* Flags Chip Preview — SVG flags from flag-icons, no emoji */}
              <div className="flex flex-wrap gap-2">
                {locales.slice(0, 8).map((loc) => (
                  <FlagChip key={loc.code} countryCode={loc.countryCode} code={loc.code} />
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-900 text-xs text-zinc-500">
              {t('card3Footer')}
            </div>
          </div>

          {/* Card 4: Wide (2 cols) — Failsafe Escalation */}
          <div className="md:col-span-2 rounded-3xl bg-zinc-950/90 border border-emerald-500/20 p-7 shadow-xl flex flex-col justify-between hover:border-emerald-500/40 transition-all">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <MessageSquareWarning className="w-5 h-5" />
                </span>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-amber-400">
                  {t('card4Badge')}
                </span>
              </div>
              <h3 className="font-display text-xl sm:text-2xl font-bold text-white mb-2">
                {t('card4Title')}
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl mb-6 font-sans">
                {t('card4Desc')}
              </p>

              {/* Escalation UI indicators — stay in EN */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span>Host Status: Standby for Emergencies</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 text-zinc-300 text-xs border border-zinc-800">
                  <Phone className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Direct Emergency Dial</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-medium border border-emerald-500/40">
                  <span>Direct WhatsApp Dispatch</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-900 text-xs text-zinc-500">
              {t('card4Footer')}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
