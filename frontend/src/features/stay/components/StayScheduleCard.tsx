'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Clock, KeyRound } from 'lucide-react';
import { StaySchedule } from '../types/stayTypes';

interface StayScheduleCardProps {
  schedule: StaySchedule;
}

export const StayScheduleCard: React.FC<StayScheduleCardProps> = ({
  schedule,
}) => {
  const t = useTranslations('stay');

  return (
    <section
      aria-labelledby='schedule-heading'
      className='rounded-2xl bg-[#121216] border border-white/[0.08] p-5 shadow-xl flex flex-col gap-4'
    >
      <div className='flex items-center gap-2 text-zinc-400'>
        <Clock className='w-4 h-4 text-emerald-400' />
        <span
          id='schedule-heading'
          className='text-xs font-semibold uppercase tracking-wider text-zinc-300 font-mono'
        >
          {t('scheduleTitle')}
        </span>
      </div>

      <div className='grid grid-cols-2 gap-3'>
        {/* Check-in */}
        {schedule.checkInTime && (
          <div className='flex flex-col gap-1 p-3 rounded-xl bg-zinc-950/60 border border-white/[0.05]'>
            <span className='text-[11px] text-zinc-400'>{t('checkIn')}</span>
            <span className='text-base font-bold text-white font-mono'>
              {schedule.checkInTime}
            </span>
          </div>
        )}

        {/* Check-out */}
        {schedule.checkOutTime && (
          <div className='flex flex-col gap-1 p-3 rounded-xl bg-zinc-950/60 border border-white/[0.05]'>
            <span className='text-[11px] text-zinc-400'>{t('checkOut')}</span>
            <span className='text-base font-bold text-white font-mono'>
              {schedule.checkOutTime}
            </span>
          </div>
        )}
      </div>

      {/* Keybox Code (Zero-Empty-State) */}
      {schedule.keyboxCode && (
        <div className='flex items-center justify-between p-3.5 rounded-xl bg-zinc-950/70 border border-emerald-500/20'>
          <div className='flex items-center gap-2.5'>
            <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'>
              <KeyRound className='w-4 h-4 text-emerald-400' />
            </div>
            <span className='text-xs font-medium text-zinc-300'>
              {t('keyboxCode')}
            </span>
          </div>
          <span className='text-lg font-bold text-emerald-400 font-mono tracking-widest px-2.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30'>
            {schedule.keyboxCode}
          </span>
        </div>
      )}
    </section>
  );
};
