'use client';

import { useCallback, useState } from 'react';
import {
  PDF_QR_RASTER_SIZE_PX,
  STANDALONE_QR_SIZE_PX,
  sanitizeFileBaseName,
} from '../lib/plaqueConfig';
import {
  buildQrPayload,
  downloadDataUrl,
  rasterizeQr,
  type PlaqueQrPayload,
} from '../lib/qrCode';

export interface UseQrGeneratorReturn {
  isDownloading: boolean;
  /** Downloads a standalone 1024px PNG (for engravers / external printers). */
  downloadStandaloneQr: (slug: string) => Promise<void>;
  /** Builds the vector + raster payload consumed by the PDF generator. */
  generateQrPayload: () => Promise<PlaqueQrPayload>;
  printPlaque: () => void;
}

export const useQrGenerator = (): UseQrGeneratorReturn => {
  const [isDownloading, setIsDownloading] = useState(false);

  const printPlaque = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }, []);

  const generateQrPayload = useCallback(
    () => buildQrPayload(PDF_QR_RASTER_SIZE_PX),
    [],
  );

  const downloadStandaloneQr = useCallback(
    async (slug: string): Promise<void> => {
      if (typeof window === 'undefined') return;

      setIsDownloading(true);
      try {
        const pngDataUrl = await rasterizeQr(STANDALONE_QR_SIZE_PX);
        const filename = `SmartScan_${sanitizeFileBaseName(slug)}_QR_${STANDALONE_QR_SIZE_PX}px.png`;
        downloadDataUrl(pngDataUrl, filename);
      } finally {
        setIsDownloading(false);
      }
    },
    [],
  );

  return {
    isDownloading,
    downloadStandaloneQr,
    generateQrPayload,
    printPlaque,
  };
};
