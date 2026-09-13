'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Wifi, Copy, Check, Shield } from 'lucide-react';
import { WifiDetails } from '../types/stayTypes';
import { useClipboard } from '../hooks/useClipboard';
import { useHaptic } from '../hooks/useHaptic';

interface WifiCardProps {
  wifi: WifiDetails;
}

export const WifiCard: React.FC<WifiCardProps> = ({ wifi }) => {
  const t = useTranslations('stay');
  const { copied, copy } = useClipboard();
  const { triggerHaptic } = useHaptic();

  const handleCopy = async () => {
    triggerHaptic(50);
    await copy(wifi.password);
  };

  return (
    <section
      aria-labelledby='wifi-heading'
      className='relative overflow-hidden rounded-2xl bg-[#121216] border border-white/0.08 p-5 shadow-xl transition-all'
    >
      {/* Subtle emerald ambient aura */}
      <div
        className='pointer-events-none absolute -top-16 -right-16 w-32 h-32 bg-radial from-emerald-500/10 to-transparent blur-2xl'
        aria-hidden='true'
      />

      <div className='relative flex flex-col gap-4'>
        {/* Card Header */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2 text-zinc-400'>
            <Wifi className='w-4 h-4 text-emerald-400' />
            <span
              id='wifi-heading'
              className='text-xs font-semibold uppercase tracking-wider text-zinc-300 font-mono'
            >
              {t('wifiTitle')}
            </span>
          </div>
          {wifi.encryption && (
            <div className='flex items-center gap-1 text-[11px] text-zinc-400 font-mono'>
              <Shield className='w-3 h-3 text-zinc-400' />
              <span>{wifi.encryption}</span>
            </div>
          )}
        </div>

        {/* SSID & Password Block */}
        <div className='flex flex-col gap-2 rounded-xl bg-zinc-950/70 border border-white/0.05 p-3.5'>
          <div className='flex items-center justify-between'>
            <span className='text-xs text-zinc-400'>{t('wifiNetwork')}</span>
            <span className='text-sm font-semibold text-white font-mono tracking-tight'>
              {wifi.ssid}
            </span>
          </div>
          <div className='h-px bg-white/0.05' />
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">{t('yourPasswordLabel')}</span>
            <span className="text-base font-bold text-emerald-400 font-mono tracking-wider">
              {wifi.password}
            </span>
          </div>
        </div>

        {/* Big 1-Click Copy Action Button */}
        <button
          type='button'
          onClick={handleCopy}
          aria-label={copied ? t('passwordCopied') : t('copyPassword')}
          className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-display text-sm font-bold transition-all duration-200 cursor-pointer active:scale-[0.98] ${
            copied
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
              : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-lg shadow-emerald-500/25'
          }`}
        >
          {copied ? (
            <>
              <Check className='w-4 h-4 text-white stroke-[2.5]' />
              <span>{t('passwordCopied')}</span>
            </>
          ) : (
            <>
              <Copy className='w-4 h-4 text-zinc-950 stroke-[2.5]' />
              <span>{t('copyPassword')}</span>
            </>
          )}
        </button>
      </div>
    </section>
  );
};
