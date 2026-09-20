'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Layers, Moon, Sparkles, Sun } from 'lucide-react';
import {
  PLAQUE_FORMATS,
  type PlaqueFormat,
  type PlaqueTheme,
} from '../../lib/plaqueConfig';
import { triggerHaptic } from '@/lib/utils';

export interface PlaqueFormatControlsProps {
  format: PlaqueFormat;
  theme: PlaqueTheme;
  onFormatChange: (format: PlaqueFormat) => void;
  onThemeChange: (theme: PlaqueTheme) => void;
}

const FORMAT_BADGE_KEY: Record<PlaqueFormat, string> = {
  A4: 'formatA4Badge',
  A5: 'formatA5Badge',
  A6: 'formatA6Badge',
};

export const PlaqueFormatControls: React.FC<PlaqueFormatControlsProps> = ({
  format,
  theme,
  onFormatChange,
  onThemeChange,
}) => {
  const t = useTranslations('plaqueModal');

  return (
    <>
      {/* Paper format (A4 is the European default) */}
      <div className='flex flex-col gap-2 p-4 rounded-2xl bg-[#121216] border border-white/5'>
        <span className='text-xs font-semibold text-zinc-300 flex items-center gap-2'>
          <Layers className='w-3.5 h-3.5 text-emerald-400' />
          <span>{t('formatLabel')}</span>
        </span>

        <div className='grid grid-cols-3 gap-2 mt-1'>
          {PLAQUE_FORMATS.map((candidate) => (
            <button
              key={candidate}
              type='button'
              onClick={() => {
                onFormatChange(candidate);
                triggerHaptic(30);
              }}
              aria-pressed={format === candidate}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 border ${
                format === candidate
                  ? 'bg-emerald-500 text-zinc-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                  : 'bg-zinc-900/80 text-zinc-400 hover:text-white border-white/5 hover:border-white/10'
              }`}
            >
              <span>{candidate}</span>
              <span className='text-[10px] font-normal opacity-80'>
                {t(FORMAT_BADGE_KEY[candidate])}
              </span>
            </button>
          ))}
        </div>

        <p className='text-[11px] text-zinc-400 mt-1'>
          {t('formatA4Description')}
        </p>
      </div>

      {/* Theme / paper style */}
      <div className='flex flex-col gap-2 p-4 rounded-2xl bg-[#121216] border border-white/5'>
        <span className='text-xs font-semibold text-zinc-300 flex items-center gap-2'>
          <Sparkles className='w-3.5 h-3.5 text-emerald-400' />
          <span>{t('themeLabel')}</span>
        </span>

        <div className='grid grid-cols-2 gap-2 mt-1'>
          <button
            type='button'
            onClick={() => {
              onThemeChange('light');
              triggerHaptic(30);
            }}
            aria-pressed={theme === 'light'}
            className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 border ${
              theme === 'light'
                ? 'bg-white text-zinc-950 border-zinc-200 font-bold shadow-md'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-white border-white/5'
            }`}
          >
            <Sun className='w-3.5 h-3.5 text-amber-500' />
            <span>{t('themeLight')}</span>
          </button>

          <button
            type='button'
            onClick={() => {
              onThemeChange('dark');
              triggerHaptic(30);
            }}
            aria-pressed={theme === 'dark'}
            className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 border ${
              theme === 'dark'
                ? 'bg-emerald-500 text-zinc-950 border-emerald-400 font-bold shadow-md shadow-emerald-500/20'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-white border-white/5'
            }`}
          >
            <Moon className='w-3.5 h-3.5 text-emerald-400' />
            <span>{t('themeDark')}</span>
          </button>
        </div>

        <p className='text-[11px] text-zinc-400 mt-1'>
          {theme === 'light' ? t('themeLightDesc') : t('themeDarkDesc')}
        </p>
      </div>
    </>
  );
};
