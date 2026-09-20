'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Check, FileDown, Loader2 } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { PlaquePdfDocument } from './PlaquePdfDocument';
import type { PlaqueFormat, PlaqueTheme } from '../../lib/plaqueConfig';
import { sanitizeFileBaseName } from '../../lib/plaqueConfig';
import type { PlaqueQrPayload } from '../../lib/qrCode';
import { triggerHaptic } from '@/lib/utils';

export interface PlaquePdfDownloadButtonProps {
  spaceName: string;
  slug: string;
  format: PlaqueFormat;
  theme: PlaqueTheme;
  isDisabled?: boolean;
  generateQrPayload: () => Promise<PlaqueQrPayload>;
}

export const PlaquePdfDownloadButton: React.FC<
  PlaquePdfDownloadButtonProps
> = ({ spaceName, slug, format, theme, isDisabled = false, generateQrPayload }) => {
  const t = useTranslations('plaqueModal');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleDownloadPdf = async () => {
    if (isGenerating || isDisabled) return;

    setIsGenerating(true);
    setHasError(false);
    triggerHaptic(30);

    try {
      // 1. Module-exact vector QR + high-density raster fallback
      const { vector, pngDataUrl } = await generateQrPayload();

      // 2. Render the vector PDF document to a Blob
      const blob = await pdf(
        <PlaquePdfDocument
          spaceName={spaceName}
          qrDataUrl={pngDataUrl}
          qrVector={vector}
          format={format}
          theme={theme}
        />,
      ).toBlob();

      // 3. Trigger the browser download
      const filename = `SmartScan_${sanitizeFileBaseName(slug)}_${format}_${theme}.pdf`;
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // Safari resolves the blob asynchronously, so revoking it on the same
      // macrotask can cancel the download before it starts.
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);

      // 4. Success feedback
      setIsSuccess(true);
      triggerHaptic(50);
      setTimeout(() => setIsSuccess(false), 2500);
    } catch (error) {
      console.error('Failed to generate the plaque PDF:', error);
      setHasError(true);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className='flex flex-col gap-1.5'>
      <button
        type='button'
        onClick={handleDownloadPdf}
        disabled={isGenerating || isDisabled}
        aria-label={t('downloadPdf')}
        className='w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold border border-white/10 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50'
      >
        {isGenerating ? (
          <>
            <Loader2 className='w-4 h-4 text-emerald-400 animate-spin' />
            <span>{t('generatingPdf')}</span>
          </>
        ) : isSuccess ? (
          <>
            <Check className='w-4 h-4 text-emerald-400' />
            <span className='text-emerald-400'>{t('pdfDownloaded')}</span>
          </>
        ) : (
          <>
            <FileDown className='w-4 h-4 text-emerald-400' />
            <span>{t('downloadPdf')}</span>
          </>
        )}
      </button>

      {hasError && (
        <p
          role='alert'
          className='text-[11px] text-red-400 flex items-start gap-1.5'
        >
          <AlertTriangle className='w-3.5 h-3.5 shrink-0 mt-px' />
          <span>{t('pdfError')}</span>
        </p>
      )}
    </div>
  );
};
