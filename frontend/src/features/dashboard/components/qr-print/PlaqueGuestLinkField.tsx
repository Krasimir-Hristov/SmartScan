'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Check, Copy, ExternalLink } from 'lucide-react';
import { isLocalOrPreviewOrigin } from '../../lib/plaqueConfig';
import { triggerHaptic } from '@/lib/utils';

export interface PlaqueGuestLinkFieldProps {
  guestUrl: string;
  origin: string;
}

export const PlaqueGuestLinkField: React.FC<PlaqueGuestLinkFieldProps> = ({
  guestUrl,
  origin,
}) => {
  const t = useTranslations('plaqueModal');
  const [isCopied, setIsCopied] = useState(false);
  const showOriginWarning = isLocalOrPreviewOrigin(origin);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(guestUrl);
      setIsCopied(true);
      triggerHaptic(50);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — the link stays selectable below
    }
  };

  return (
    <div className='flex flex-col gap-2 p-4 rounded-2xl bg-[#121216] border border-white/5'>
      <span className='text-xs font-semibold text-zinc-400'>
        {t('targetUrl')}
      </span>

      <div className='flex items-center justify-between gap-2 p-2.5 rounded-xl bg-zinc-950 border border-white/8'>
        <code className='text-xs font-mono text-emerald-300 truncate select-all'>
          {guestUrl}
        </code>
        <div className='flex items-center gap-1 shrink-0'>
          <button
            type='button'
            onClick={handleCopy}
            aria-label={t('copyLink')}
            className='p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer'
          >
            {isCopied ? (
              <Check className='w-4 h-4 text-emerald-400' />
            ) : (
              <Copy className='w-4 h-4' />
            )}
          </button>
          <button
            type='button'
            onClick={() => window.open(guestUrl, '_blank', 'noopener')}
            aria-label={t('openGuestTab')}
            className='p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer'
          >
            <ExternalLink className='w-4 h-4' />
          </button>
        </div>
      </div>

      {showOriginWarning && (
        <p
          role='status'
          className='text-[11px] text-amber-400 flex items-start gap-1.5'
        >
          <AlertTriangle className='w-3.5 h-3.5 shrink-0 mt-px' />
          <span>{t('localOriginWarning')}</span>
        </p>
      )}
    </div>
  );
};
