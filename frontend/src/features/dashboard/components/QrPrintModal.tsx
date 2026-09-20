'use client';

import React, { useCallback, useState, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { Printer } from 'lucide-react';
import type { Space } from '@/lib/types/databaseTypes';
import { triggerHaptic } from '@/lib/utils';
import { PlaqueVisualPreview } from './PlaqueVisualPreview';
import { PlaqueActionButtons } from './qr-print/PlaqueActionButtons';
import { PlaqueFormatControls } from './qr-print/PlaqueFormatControls';
import { PlaqueGuestLinkField } from './qr-print/PlaqueGuestLinkField';
import { PlaqueModalShell } from './qr-print/PlaqueModalShell';
import { useQrGenerator } from '../hooks/useQrGenerator';
import {
  DEFAULT_PLAQUE_FORMAT,
  DEFAULT_PLAQUE_THEME,
  buildGuestUrl,
  getValidGuestLinkOrigin,
  type PlaqueFormat,
  type PlaqueTheme,
} from '../lib/plaqueConfig';

export interface QrPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Only the fields that may ever reach the printed plaque. */
  space: Pick<Space, 'name' | 'slug'>;
  /**
   * Canonical public origin resolved on the server. The browser origin is only
   * accepted as a development fallback — never for a printed QR code.
   */
  canonicalOrigin?: string;
}

const emptySubscribe = () => () => {};
const getClientOrigin = () =>
  typeof window !== 'undefined' ? window.location.origin : '';
const getServerOrigin = () => '';

export const QrPrintModal: React.FC<QrPrintModalProps> = ({
  isOpen,
  onClose,
  space,
  canonicalOrigin = '',
}) => {
  const t = useTranslations('plaqueModal');
  const [format, setFormat] = useState<PlaqueFormat>(DEFAULT_PLAQUE_FORMAT);
  const [theme, setTheme] = useState<PlaqueTheme>(DEFAULT_PLAQUE_THEME);
  const [hasQrError, setHasQrError] = useState(false);

  const { isDownloading, downloadStandaloneQr, generateQrPayload, printPlaque } =
    useQrGenerator();

  const windowOrigin = useSyncExternalStore(
    emptySubscribe,
    getClientOrigin,
    getServerOrigin,
  );
  // A printed QR code must never encode an unverified origin: the browser
  // origin is only acceptable while developing locally, where the server has no
  // canonical domain to resolve.
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const validOrigin = getValidGuestLinkOrigin(
    canonicalOrigin,
    windowOrigin,
    isDevelopment,
  );
  const guestUrl = validOrigin ? buildGuestUrl(validOrigin, space.slug) : '';

  const handleDownloadQr = useCallback(async () => {
    triggerHaptic(50);
    setHasQrError(false);
    try {
      await downloadStandaloneQr(space.slug);
    } catch (error) {
      console.error('Failed to export the plaque QR code:', error);
      setHasQrError(true);
    }
  }, [downloadStandaloneQr, space.slug]);

  const handlePrint = useCallback(() => {
    triggerHaptic(50);
    printPlaque();
  }, [printPlaque]);

  return (
    <PlaqueModalShell
      isOpen={isOpen}
      onClose={onClose}
      format={format}
      theme={theme}
      title={t('title')}
      subtitle={t('subtitle', { name: space.name })}
      headerIcon={<Printer className='w-5 h-5' />}
    >
      <div className='grid grid-cols-1 lg:grid-cols-12 gap-6 items-start'>
        {/* Column 1: configuration controls */}
        <div className='lg:col-span-5 flex flex-col gap-5'>
          <PlaqueFormatControls
            format={format}
            theme={theme}
            onFormatChange={setFormat}
            onThemeChange={setTheme}
          />

          <PlaqueGuestLinkField guestUrl={guestUrl} origin={validOrigin || ''} />

          <PlaqueActionButtons
            spaceName={space.name}
            slug={space.slug}
            format={format}
            theme={theme}
            isDownloadingQr={isDownloading}
            hasQrError={hasQrError}
            isDisabled={!validOrigin}
            onPrint={handlePrint}
            onDownloadQr={handleDownloadQr}
            generateQrPayload={generateQrPayload}
          />
        </div>

        {/* Column 2: live WYSIWYG plaque preview */}
        <div className='lg:col-span-7 flex flex-col items-center justify-center p-4 sm:p-6 rounded-2xl bg-zinc-950/80 border border-white/5 overflow-hidden'>
          <PlaqueVisualPreview
            spaceName={space.name}
            guestUrl={guestUrl}
            format={format}
            theme={theme}
          />
        </div>
      </div>
    </PlaqueModalShell>
  );
};
