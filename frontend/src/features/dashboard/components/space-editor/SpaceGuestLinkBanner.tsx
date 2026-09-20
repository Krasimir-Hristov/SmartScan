'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Check, Copy, ExternalLink, Printer, Sparkles } from 'lucide-react';

export interface SpaceGuestLinkBannerProps {
  slug: string;
  copiedLink: boolean;
  onCopyGuestLink: () => void;
  onOpenPrintModal: () => void;
}

/** Guest link banner with the 1-click copy, print-plaque and preview actions. */
export const SpaceGuestLinkBanner: React.FC<SpaceGuestLinkBannerProps> = ({
  slug,
  copiedLink,
  onCopyGuestLink,
  onOpenPrintModal,
}) => {
  const t = useTranslations('dashboard');

  return (
    <div className='p-4 sm:p-5 rounded-3xl bg-linear-to-r from-zinc-900/90 via-[#121216] to-zinc-900/90 border border-emerald-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl'>
      <div className='flex flex-col gap-1.5'>
        <div className='flex items-center gap-2'>
          <span className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'>
            <Sparkles className='w-3 h-3' />
            <span>{t('guestLinkTitle')}</span>
          </span>
          <span className='text-xs text-zinc-400'>{t('guestLinkSub')}</span>
        </div>
        <div className='flex items-center gap-2'>
          <code className='text-xs sm:text-sm font-mono text-emerald-300 bg-zinc-950/80 px-3 py-1.5 rounded-xl border border-white/8 select-all'>
            <span className='text-zinc-500 font-sans text-xs select-none'>
              /stay/
            </span>
            {slug}
          </code>
        </div>
      </div>

      <div className='flex items-center flex-wrap gap-2.5 self-start md:self-auto'>
        <button
          type='button'
          onClick={onCopyGuestLink}
          aria-label={t('copyLink')}
          className='inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold border border-white/10 transition-colors cursor-pointer'
        >
          {copiedLink ? (
            <>
              <Check className='w-3.5 h-3.5 text-emerald-400' />
              <span className='text-emerald-400'>{t('linkCopied')}</span>
            </>
          ) : (
            <>
              <Copy className='w-3.5 h-3.5 text-zinc-400' />
              <span>{t('copyLink')}</span>
            </>
          )}
        </button>

        <button
          type='button'
          onClick={onOpenPrintModal}
          aria-label={t('printPlaque')}
          className='inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold border border-white/10 transition-colors cursor-pointer'
        >
          <Printer className='w-3.5 h-3.5 text-emerald-400' />
          <span>{t('printPlaque')}</span>
        </button>

        <Link
          href={`/stay/${slug}`}
          target='_blank'
          rel='noopener noreferrer'
          aria-label={t('previewGuest')}
          className='inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition-all shadow-md shadow-emerald-500/20 cursor-pointer'
        >
          <ExternalLink className='w-3.5 h-3.5' />
          <span>{t('previewGuest')}</span>
        </Link>
      </div>
    </div>
  );
};
