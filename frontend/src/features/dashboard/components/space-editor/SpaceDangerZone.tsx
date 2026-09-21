'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Trash2 } from 'lucide-react';

export interface SpaceDangerZoneProps {
  onRequestDelete: () => void;
}

/** Destructive "delete this space" card — kept visually isolated on purpose. */
export const SpaceDangerZone: React.FC<SpaceDangerZoneProps> = ({
  onRequestDelete,
}) => {
  const t = useTranslations('dashboard');

  return (
    <div className='mt-4 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-red-950/20 border border-red-500/20'>
      <div className='flex flex-col gap-0.5'>
        <span className='text-xs font-bold text-red-400 flex items-center gap-1.5'>
          <Trash2 className='w-3.5 h-3.5' />
          <span>{t('dangerZoneTitle')}</span>
        </span>
        <span className='text-[11px] text-zinc-400'>
          {t('dangerZoneDesc')}
        </span>
      </div>

      <button
        type='button'
        onClick={onRequestDelete}
        aria-label={t('deleteSpace')}
        className='inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold transition-all cursor-pointer self-start sm:self-auto shrink-0'
      >
        <Trash2 className='w-3.5 h-3.5' />
        <span>{t('deleteSpace')}</span>
      </button>
    </div>
  );
};
