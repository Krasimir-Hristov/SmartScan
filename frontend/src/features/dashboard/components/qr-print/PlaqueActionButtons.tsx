'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Download, Printer } from 'lucide-react';
import type { PlaqueFormat, PlaqueTheme } from '../../lib/plaqueConfig';
import type { PlaqueQrPayload } from '../../lib/qrCode';

const PdfButtonFallback: React.FC = () => {
  const t = useTranslations('plaqueModal');
  return (
    <button
      type='button'
      disabled
      className='w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-950 text-zinc-400 text-xs font-medium border border-white/5 cursor-not-allowed'
    >
      <span className='w-3.5 h-3.5 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin' />
      <span>{t('generatingPdf')}</span>
    </button>
  );
};

const PlaquePdfDownloadButton = dynamic(
  () =>
    import('./PlaquePdfDownloadButton').then(
      (mod) => mod.PlaquePdfDownloadButton,
    ),
  { ssr: false, loading: () => <PdfButtonFallback /> },
);

export interface PlaqueActionButtonsProps {
  spaceName: string;
  slug: string;
  format: PlaqueFormat;
  theme: PlaqueTheme;
  isDownloadingQr: boolean;
  hasQrError: boolean;
  onPrint: () => void;
  onDownloadQr: () => void;
  generateQrPayload: () => Promise<PlaqueQrPayload>;
}

export const PlaqueActionButtons: React.FC<PlaqueActionButtonsProps> = ({
  spaceName,
  slug,
  format,
  theme,
  isDownloadingQr,
  hasQrError,
  onPrint,
  onDownloadQr,
  generateQrPayload,
}) => {
  const t = useTranslations('plaqueModal');

  return (
    <div className='flex flex-col gap-2.5 mt-1'>
      <button
        type='button'
        onClick={onPrint}
        aria-label={t('directPrint')}
        className='w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-all shadow-lg shadow-emerald-500/20 cursor-pointer'
      >
        <Printer className='w-4 h-4' />
        <span>{t('directPrint')}</span>
      </button>

      <button
        type='button'
        onClick={onDownloadQr}
        disabled={isDownloadingQr}
        aria-label={t('downloadQr')}
        className='w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold border border-white/10 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50'
      >
        <Download className='w-4 h-4 text-emerald-400' />
        <span>{isDownloadingQr ? t('downloadingQr') : t('downloadQr')}</span>
      </button>

      {hasQrError && (
        <p
          role='alert'
          className='text-[11px] text-red-400 flex items-start gap-1.5'
        >
          <AlertTriangle className='w-3.5 h-3.5 shrink-0 mt-px' />
          <span>{t('qrError')}</span>
        </p>
      )}

      <PlaquePdfDownloadButton
        spaceName={spaceName}
        slug={slug}
        format={format}
        theme={theme}
        generateQrPayload={generateQrPayload}
      />
    </div>
  );
};
