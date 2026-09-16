'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Moon, SunMedium, Clock } from 'lucide-react';

export interface QuietHoursControlProps {
  nightSilenceStart: string;
  nightSilenceEnd: string;
  hasNightSilence: boolean;
  onToggleNightSilence: (active: boolean) => void;
  onChangeNightStart: (val: string) => void;
  onChangeNightEnd: (val: string) => void;

  afternoonRestStart: string;
  afternoonRestEnd: string;
  hasAfternoonRest: boolean;
  onToggleAfternoonRest: (active: boolean) => void;
  onChangeAfternoonStart: (val: string) => void;
  onChangeAfternoonEnd: (val: string) => void;
}

const NIGHT_START_OPTIONS = [
  '20:00',
  '20:30',
  '21:00',
  '21:30',
  '22:00',
  '22:30',
  '23:00',
  '23:30',
  '00:00',
  '01:00',
];

const NIGHT_END_OPTIONS = [
  '06:00',
  '06:30',
  '07:00',
  '07:30',
  '08:00',
  '08:30',
  '09:00',
  '09:30',
  '10:00',
];

const SIESTA_START_OPTIONS = [
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
];

const SIESTA_END_OPTIONS = [
  '16:00',
  '16:30',
  '17:00',
  '17:30',
  '18:00',
  '18:30',
];

const getOptionsWithFallback = (list: string[], currentVal?: string): string[] => {
  if (currentVal && !list.includes(currentVal)) {
    return [currentVal, ...list];
  }
  return list;
};

export const QuietHoursControl: React.FC<QuietHoursControlProps> = ({
  nightSilenceStart,
  nightSilenceEnd,
  hasNightSilence,
  onToggleNightSilence,
  onChangeNightStart,
  onChangeNightEnd,

  afternoonRestStart,
  afternoonRestEnd,
  hasAfternoonRest,
  onToggleAfternoonRest,
  onChangeAfternoonStart,
  onChangeAfternoonEnd,
}) => {
  const t = useTranslations('dashboard');

  const nightStartOptions = getOptionsWithFallback(NIGHT_START_OPTIONS, nightSilenceStart);
  const nightEndOptions = getOptionsWithFallback(NIGHT_END_OPTIONS, nightSilenceEnd);
  const siestaStartOptions = getOptionsWithFallback(SIESTA_START_OPTIONS, afternoonRestStart);
  const siestaEndOptions = getOptionsWithFallback(SIESTA_END_OPTIONS, afternoonRestEnd);

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-white/8 flex flex-col gap-4">
      <div className="flex items-center gap-2 pb-2 border-b border-white/5">
        <Clock className="w-4 h-4 text-emerald-400" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
          {t('quietHoursTitle')}
        </h3>
      </div>

      {/* 1. Night Silence Section */}
      <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-zinc-950/50 border border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Moon className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-white">
                {t('nightSilence')}
              </span>
              <p className="text-[11px] text-zinc-400">
                {t('nightSilenceDesc')}
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={hasNightSilence}
            aria-label={t('nightSilence')}
            onClick={() => onToggleNightSilence(!hasNightSilence)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
              hasNightSilence ? 'bg-emerald-500' : 'bg-zinc-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                hasNightSilence ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {hasNightSilence ? (
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5 animate-in fade-in duration-150">
            <div className="flex flex-col gap-1">
              <label htmlFor="night-start-select" className="text-[11px] font-medium text-zinc-400">
                {t('from')}
              </label>
              <select
                id="night-start-select"
                value={nightSilenceStart || '23:00'}
                onChange={(e) => onChangeNightStart(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {nightStartOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="night-end-select" className="text-[11px] font-medium text-zinc-400">
                {t('to')}
              </label>
              <select
                id="night-end-select"
                value={nightSilenceEnd || '08:00'}
                onChange={(e) => onChangeNightEnd(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {nightEndOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-zinc-500 italic pt-1">
            {t('nightSilenceOff')}
          </p>
        )}
      </div>

      {/* 2. Afternoon Rest / Siesta Section */}
      <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-zinc-950/50 border border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <SunMedium className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-white">
                {t('afternoonRest')}
              </span>
              <p className="text-[11px] text-zinc-400">
                {t('afternoonRestDesc')}
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={hasAfternoonRest}
            aria-label={t('afternoonRest')}
            onClick={() => onToggleAfternoonRest(!hasAfternoonRest)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
              hasAfternoonRest ? 'bg-emerald-500' : 'bg-zinc-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                hasAfternoonRest ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {hasAfternoonRest ? (
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5 animate-in fade-in duration-150">
            <div className="flex flex-col gap-1">
              <label htmlFor="siesta-start-select" className="text-[11px] font-medium text-zinc-400">
                {t('from')}
              </label>
              <select
                id="siesta-start-select"
                value={afternoonRestStart || '14:30'}
                onChange={(e) => onChangeAfternoonStart(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {siestaStartOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="siesta-end-select" className="text-[11px] font-medium text-zinc-400">
                {t('to')}
              </label>
              <select
                id="siesta-end-select"
                value={afternoonRestEnd || '17:30'}
                onChange={(e) => onChangeAfternoonEnd(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {siestaEndOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-zinc-500 italic pt-1">
            {t('afternoonRestOff')}
          </p>
        )}
      </div>
    </div>
  );
};
