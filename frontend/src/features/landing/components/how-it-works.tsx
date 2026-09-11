'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Mic, Printer, Smartphone, Play, Pause, FileCheck, CheckCircle2 } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const t = useTranslations('howItWorks');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  return (
    <section
      id="how-it-works"
      className="py-16 md:py-24 relative overflow-hidden"
      aria-labelledby="how-it-works-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <Badge variant="emerald" className="mb-3 uppercase tracking-wider text-[11px]">
            {t('badge')}
          </Badge>
          <h2
            id="how-it-works-heading"
            className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight"
          >
            {t('title')}
          </h2>
          <p className="mt-4 text-base text-zinc-400 font-sans">
            {t('subtitle')}
          </p>
        </div>

        {/* 3 Step Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* STEP 1 — Voice Ingest */}
          <div className="flex flex-col justify-between rounded-3xl bg-zinc-950/80 border border-emerald-500/20 p-6 sm:p-7 shadow-xl hover:border-emerald-500/40 transition-all">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  <Mic className="w-5 h-5" />
                </span>
                <span className="font-mono text-xs font-bold tracking-wider text-emerald-400 uppercase">
                  {t('step1Badge')}
                </span>
              </div>

              <h3 className="font-display text-xl font-bold text-white mb-2">{t('step1Title')}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-6 font-sans">
                {t('step1Desc')}
              </p>

              {/* Simulated Voice Memo Card — UI element, stays in EN */}
              <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4">
                <div className="flex items-center justify-between mb-3">
                  <button
                    type="button"
                    onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                    aria-label={isPlayingAudio ? 'Pause simulated audio' : 'Play simulated voice note'}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-zinc-950 hover:bg-emerald-400 transition-colors cursor-pointer"
                  >
                    {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>
                  <div className="flex items-center gap-1.5 h-6">
                    {[12, 24, 18, 28, 14, 22, 16, 26, 10, 20, 28, 15, 25, 18, 24].map((h, i) => (
                      <span
                        key={i}
                        className={`w-1 rounded-full bg-emerald-400/80 transition-all ${isPlayingAudio ? 'animate-pulse' : ''}`}
                        style={{ height: `${h}px` }}
                      />
                    ))}
                  </div>
                  <span className="font-mono text-[11px] text-zinc-400">00:42 / 01:00</span>
                </div>
                <div className="rounded-lg bg-zinc-950 p-2.5 border border-zinc-800/80 text-[11px] text-zinc-300">
                  <span className="text-emerald-400 font-semibold">Transcribing: </span>
                  &quot;The hot water heater booster switch is inside the laundry cabinet...&quot;
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-900/80 flex items-center gap-2 text-xs text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{t('step1Footer')}</span>
            </div>
          </div>

          {/* STEP 2 — Print Plaque */}
          <div className="flex flex-col justify-between rounded-3xl bg-zinc-950/80 border border-emerald-500/20 p-6 sm:p-7 shadow-xl hover:border-emerald-500/40 transition-all">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/40">
                  <Printer className="w-5 h-5" />
                </span>
                <span className="font-mono text-xs font-bold tracking-wider text-teal-400 uppercase">
                  {t('step2Badge')}
                </span>
              </div>

              <h3 className="font-display text-xl font-bold text-white mb-2">{t('step2Title')}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-6 font-sans">
                {t('step2Desc')}
              </p>

              {/* PDF Plaque Graphic — UI element, stays in EN */}
              <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 flex flex-col items-center text-center">
                <div className="w-full h-28 rounded-xl bg-zinc-950 border border-emerald-500/30 flex flex-col items-center justify-center p-3 relative overflow-hidden">
                  <div className="flex items-center gap-2 text-xs font-bold text-white mb-1">
                    <FileCheck className="w-4 h-4 text-emerald-400" />
                    <span>A5 / A6 Stand Template</span>
                  </div>
                  <span className="text-[10px] text-zinc-400">
                    Precision Bleed &amp; Crop Marks (CMYK Ready)
                  </span>
                  <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-[10px] text-emerald-300">
                    300 DPI Vector PDF
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-900/80 flex items-center gap-2 text-xs text-teal-400 font-medium">
              <CheckCircle2 className="w-4 h-4 text-teal-400" />
              <span>{t('step2Footer')}</span>
            </div>
          </div>

          {/* STEP 3 — Guest Scan */}
          <div className="flex flex-col justify-between rounded-3xl bg-zinc-950/80 border border-emerald-500/20 p-6 sm:p-7 shadow-xl hover:border-emerald-500/40 transition-all">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  <Smartphone className="w-5 h-5" />
                </span>
                <span className="font-mono text-xs font-bold tracking-wider text-emerald-400 uppercase">
                  {t('step3Badge')}
                </span>
              </div>

              <h3 className="font-display text-xl font-bold text-white mb-2">{t('step3Title')}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-6 font-sans">
                {t('step3Desc')}
              </p>

              {/* Guest Scan Graphic — UI element, stays in EN */}
              <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4">
                <div className="flex items-center justify-between text-xs font-semibold text-white mb-2 pb-2 border-b border-zinc-800">
                  <span>Guest Scanned QR</span>
                  <span className="text-emerald-400">⚡ 0.8s load</span>
                </div>
                <div className="flex flex-col gap-1.5 text-[11px] text-zinc-300">
                  <div className="flex items-center justify-between bg-zinc-950 p-2 rounded-lg border border-zinc-800">
                    <span>Wi-Fi Credentials</span>
                    <span className="text-emerald-400 font-medium">1-Tap Copy</span>
                  </div>
                  <div className="flex items-center justify-between bg-zinc-950 p-2 rounded-lg border border-zinc-800">
                    <span>Native Language</span>
                    <span className="text-emerald-400 font-medium">Auto-detected</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-900/80 flex items-center gap-2 text-xs text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{t('step3Footer')}</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
