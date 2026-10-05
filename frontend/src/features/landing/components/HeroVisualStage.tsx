'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { QRCodeSVG } from 'qrcode.react';
import {
  Wifi,
  Check,
  Languages,
  Sparkles,
  QrCode,
  Copy,
  ArrowRight,
  Bot,
  User,
} from 'lucide-react';
import { triggerHaptic } from '@/lib/utils';

export interface HeroVisualStageProps {
  onOpenDemo: () => void;
}

export const HeroVisualStage: React.FC<HeroVisualStageProps> = ({
  onOpenDemo,
}) => {
  const t = useTranslations('showcase');
  const tHero = useTranslations('hero');
  const [copiedWifi, setCopiedWifi] = useState(false);

  const handleCopyWifi = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(50);
    try {
      void navigator.clipboard.writeText('Sanctuary_5G_Guest');
      setCopiedWifi(true);
      setTimeout(() => setCopiedWifi(false), 2000);
    } catch {
      // Ignore clipboard write rejection
    }
  };

  return (
    <div className='relative w-full'>
      {/* Ambient background living glow beam */}
      <motion.div
        animate={{
          opacity: [0.15, 0.32, 0.15],
          scale: [0.96, 1.04, 0.96],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className='pointer-events-none absolute -inset-2 sm:-inset-4 rounded-3xl bg-radial from-emerald-500/25 via-teal-900/10 to-transparent blur-2xl'
        aria-hidden='true'
      />

      {/* Main Perspective Glass Stage Frame */}
      <div className='relative rounded-3xl border border-emerald-500/25 bg-zinc-950/80 p-3.5 sm:p-6 backdrop-blur-xl shadow-2xl shadow-emerald-950/40 overflow-hidden'>
        {/* Subtle grid pattern inside stage */}
        <div
          className='pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#10b98108_1px,transparent_1px),linear-gradient(to_bottom,#10b98108_1px,transparent_1px)] background-size-[2rem_2rem] mask-[radial-gradient(ellipse_70%_60%_at_50%_40%,#000_60%,transparent_100%)]'
          aria-hidden='true'
        />

        {/* Floating Satellite Badges (Desktop & Tablet) */}
        <div className='hidden lg:block pointer-events-none'>
          {/* Badge 1: Top-Left Instant Wi-Fi with Living Motion */}
          <motion.div
            animate={{ y: [-5, 5, -5] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className='absolute top-4 left-4 z-20 flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-zinc-900/95 px-3 py-1.5 shadow-lg shadow-emerald-950/40 backdrop-blur-md'
          >
            <div className='flex h-5 w-5 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400'>
              <Wifi className='h-3 w-3' />
            </div>
            <div className='text-left'>
              <div className='text-[10px] font-semibold text-zinc-200'>
                Wi-Fi: Sanctuary_5G
              </div>
              <div className='text-[9px] text-emerald-400 font-mono'>
                {t('satelliteWifiTag')}
              </div>
            </div>
          </motion.div>

          {/* Badge 2: Top-Right Multilingual AI with Living Motion */}
          <motion.div
            animate={{ y: [5, -5, 5] }}
            transition={{ duration: 4.6, repeat: Infinity, ease: 'easeInOut' }}
            className='absolute top-4 right-4 z-20 flex items-center gap-2 rounded-xl border border-teal-500/40 bg-zinc-900/95 px-3 py-1.5 shadow-lg shadow-teal-950/40 backdrop-blur-md'
          >
            <div className='flex h-5 w-5 items-center justify-center rounded-lg bg-teal-500/20 text-teal-300'>
              <Languages className='h-3 w-3' />
            </div>
            <div className='text-left'>
              <div className='text-[10px] font-semibold text-zinc-200'>
                {t('satelliteLanguages')}
              </div>
              <div className='text-[9px] text-teal-400 font-mono'>
                {t('satelliteTranslation')}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Stage Content: Split Grid (Left: Physical Plaque, Right: Mobile PWA) */}
        <div className='relative z-10 grid grid-cols-1 sm:grid-cols-12 gap-4 sm:gap-5 items-center'>
          {/* LEFT: Physical QR Plaque Mockup (sm:col-span-5) */}
          <motion.div
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className='sm:col-span-5 flex flex-col items-center cursor-pointer'
            onClick={onOpenDemo}
          >
            <div className='relative w-full max-w-xs rounded-2xl border border-emerald-500/30 bg-linear-to-b from-zinc-900/90 via-zinc-900/70 to-zinc-950/90 p-4 shadow-xl shadow-black/60 backdrop-blur-md text-center group hover:border-emerald-500/50 transition-colors'>
              {/* Plaque Header */}
              <div className='flex items-center justify-between mb-3 border-b border-zinc-800 pb-2'>
                <div className='flex items-center gap-1.5 text-left'>
                  <div className='h-2 w-2 rounded-full bg-emerald-400 animate-pulse' />
                  <span className='text-[10px] font-mono font-bold tracking-wider uppercase text-emerald-400'>
                    SmartScan Stay
                  </span>
                </div>
                <span className='text-[9px] font-mono text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-full border border-zinc-700/50'>
                  A4 / A5 Acrylic
                </span>
              </div>

              {/* Scannable Vector QR Code with Perpetual Laser Scanner */}
              <div className='relative mx-auto my-1 flex h-36 w-36 sm:h-40 sm:w-40 items-center justify-center rounded-2xl bg-white p-2.5 shadow-inner border border-emerald-500/40 overflow-hidden'>
                <QRCodeSVG
                  value='https://smartscan.app/stay/villa-smartscan'
                  size={120}
                  level='M'
                  fgColor='#09090b'
                  bgColor='#ffffff'
                />
                {/* Perpetual Living Laser Scanner Line */}
                <motion.div
                  animate={{ top: ['4%', '92%', '4%'] }}
                  transition={{
                    duration: 2.8,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className='pointer-events-none absolute left-0 right-0 h-1 bg-linear-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_var(--color-emerald-500)]'
                />
              </div>

              {/* Plaque Prompt */}
              <div className='mt-2 text-center'>
                <span className='text-xs font-semibold text-zinc-200'>
                  {t('plaqueScan')}
                </span>
                <p className='mt-0.5 text-[10px] text-zinc-400'>
                  {t('plaqueFeature1Title')}
                </p>
              </div>
            </div>
          </motion.div>

          {/* RIGHT: Mobile Guest Concierge PWA Mockup (sm:col-span-7) */}
          <motion.div
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className='sm:col-span-7 flex flex-col gap-2.5'
          >
            {/* Phone Container */}
            <div className='relative w-full rounded-2xl border border-zinc-800 bg-zinc-950/95 p-3.5 sm:p-4 shadow-2xl shadow-emerald-950/20 hover:border-emerald-500/40 transition-colors'>
              {/* Phone Status / Host Header */}
              <div className='flex items-center justify-between pb-2.5 border-b border-zinc-800/80 mb-2.5'>
                <div className='flex items-center gap-2'>
                  <div className='h-7 w-7 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-xs shrink-0'>
                    SS
                  </div>
                  <div>
                    <div className='text-xs font-bold text-white flex items-center gap-1.5'>
                      Villa SmartScan
                      <span className='h-1.5 w-1.5 rounded-full bg-emerald-400' />
                    </div>
                    <div className='text-[10px] text-zinc-400'>
                      {t('mobileAiSubtitle')}
                    </div>
                  </div>
                </div>
                <div className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-[10px] font-mono font-medium text-emerald-400'>
                  <span className='h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping' />
                  <span>{t('mobileOnline')}</span>
                </div>
              </div>

              {/* 1-Click Interactive Wi-Fi Card */}
              <div className='rounded-xl border border-emerald-500/30 bg-zinc-900/90 p-2.5 flex items-center justify-between gap-2.5 mb-2.5'>
                <div className='flex items-center gap-2'>
                  <div className='h-7 w-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0'>
                    <Wifi className='h-3.5 w-3.5' />
                  </div>
                  <div className='text-left'>
                    <div className='text-xs font-semibold text-zinc-200'>
                      Sanctuary_5G
                    </div>
                    <div className='text-[10px] text-zinc-400 font-mono'>
                      {t('wifiPasswordLabel')} mykonos2026
                    </div>
                  </div>
                </div>
                <button
                  type='button'
                  onClick={handleCopyWifi}
                  aria-label={t('copy')}
                  className='cursor-pointer min-h-11 inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25 px-2.5 py-1 text-xs font-medium text-emerald-300 transition-all active:scale-[0.98]'
                >
                  {copiedWifi ? (
                    <>
                      <Check className='h-3.5 w-3.5 text-emerald-400' />
                      <span>{t('copied')}</span>
                    </>
                  ) : (
                    <>
                      <Copy className='h-3.5 w-3.5' />
                      <span>{t('copy')}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Simulated Live Concierge Chat Stream */}
              <div className='space-y-2 text-xs'>
                {/* Guest message */}
                <div className='flex items-start gap-1.5 justify-end'>
                  <div className='rounded-2xl rounded-tr-none bg-emerald-600/90 text-white px-3 py-1.5 max-w-[85%] text-left shadow-md text-[11px] sm:text-xs'>
                    {t('chatGuestQuestion')}
                  </div>
                  <div className='h-5 w-5 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 text-zinc-400'>
                    <User className='h-2.5 w-2.5' />
                  </div>
                </div>

                {/* AI Concierge stream response */}
                <div className='flex items-start gap-1.5'>
                  <div className='h-5 w-5 rounded-full bg-emerald-950 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-400'>
                    <Bot className='h-2.5 w-2.5' />
                  </div>
                  <div className='rounded-2xl rounded-tl-none bg-zinc-900 border border-zinc-800 text-zinc-300 px-3 py-2 max-w-[90%] text-left leading-relaxed shadow-md text-[11px] sm:text-xs'>
                    <p>{t('chatAiResponse')}</p>
                    <div className='mt-1 flex items-center gap-1 text-[9px] text-emerald-400/80 font-mono'>
                      <Sparkles className='h-2.5 w-2.5' /> {t('answeredTime')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Interactive CTA Bar */}
              <div className='mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between'>
                <span className='text-[10px] text-zinc-400'>
                  {t('mobilePrompt')}
                </span>
                <button
                  type='button'
                  onClick={onOpenDemo}
                  aria-label={tHero('ctaDemo')}
                  className='cursor-pointer min-h-11 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 transition-colors shadow-md shadow-emerald-500/20 active:scale-[0.98]'
                >
                  <QrCode className='h-3.5 w-3.5' />
                  <span>{tHero('ctaDemo')}</span>
                  <ArrowRight className='h-3 w-3' />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
