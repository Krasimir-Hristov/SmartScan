'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { VolumeX, Moon, SunMedium } from 'lucide-react';
import { QuietHours } from '../types/stayTypes';

interface QuietHoursCardProps {
  quietHours?: QuietHours;
}

export const QuietHoursCard: React.FC<QuietHoursCardProps> = ({
  quietHours,
}) => {
  const t = useTranslations('stay');

  if (!quietHours || (!quietHours.nightStart && !quietHours.siestaStart)) {
    return null; // Zero-Empty-State: do not render if host did not configure quiet hours
  }

  return (
    <section
      aria-labelledby='quiet-heading'
      className='rounded-2xl bg-[#121216] border border-white/0.08 p-5 shadow-xl flex flex-col gap-4'
    >
      <div className='flex items-center gap-2 text-zinc-400'>
        <VolumeX className='w-4 h-4 text-emerald-400' />
        <span
          id='quiet-heading'
          className='text-xs font-semibold uppercase tracking-wider text-zinc-300 font-mono'
        >
          {t('quietHoursTitle')}
        </span>
      </div>

      <div className='flex flex-col gap-2.5'>
        {/* Night Silence */}
        {quietHours.nightStart && quietHours.nightEnd && (
          <div className='flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-white/0.05'>
            <div className='flex items-center gap-2.5'>
              <div className='flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'>
                <Moon className='w-3.5 h-3.5 text-indigo-400' />
              </div>
              <span className='text-xs text-zinc-300 font-medium'>
                {t('nightSilence')}
              </span>
            </div>
            <span className='text-sm font-semibold text-white font-mono'>
              {quietHours.nightStart} – {quietHours.nightEnd}
            </span>
          </div>
        )}

        {/* Afternoon Rest / Siesta */}
        {quietHours.siestaStart && quietHours.siestaEnd && (
          <div className='flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-white/0.05'>
            <div className='flex items-center gap-2.5'>
              <div className='flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20'>
                <SunMedium className='w-3.5 h-3.5 text-amber-400' />
              </div>
              <span className='text-xs text-zinc-300 font-medium'>
                {t('afternoonRest')}
              </span>
            </div>
            <span className='text-sm font-semibold text-white font-mono'>
              {quietHours.siestaStart} – {quietHours.siestaEnd}
            </span>
          </div>
        )}
      </div>
    </section>
  );
};
