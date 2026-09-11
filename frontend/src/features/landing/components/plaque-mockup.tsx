'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Download, QrCode, Languages } from 'lucide-react';

export interface PlaqueMockupProps {
  onOpenDemo: () => void;
}

export const PlaqueMockup: React.FC<PlaqueMockupProps> = ({ onOpenDemo }) => {
  const t = useTranslations('showcase');

  return (
    <div className="flex flex-col justify-between rounded-3xl bg-zinc-950/80 border border-emerald-500/20 p-6 sm:p-8 shadow-2xl shadow-emerald-950/20 hover:border-emerald-500/40 transition-all">
      <div>
        {/* Header Label */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <span className="font-mono text-xs font-bold tracking-wider uppercase text-emerald-400">
            {t('plaqueTag')}
          </span>
          <span className="text-[11px] font-medium text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded-full border border-zinc-800">
            Villa 1904 Sanctuary · Mykonos
          </span>
        </div>

        <h3 className="font-display text-xl sm:text-2xl font-bold text-white mb-2">
          {t('plaqueTitle')}
        </h3>
        <p className="text-sm text-zinc-400 leading-relaxed mb-6 font-sans">
          {t('plaqueDesc')}
        </p>

        {/* Plaque Graphic Mockup */}
        <div className="relative rounded-2xl bg-zinc-900/90 border border-emerald-500/20 p-6 sm:p-8 text-center overflow-hidden">
          <div className="absolute inset-0 bg-radial from-emerald-500/10 to-transparent pointer-events-none" />

          <div className="relative flex flex-col sm:flex-row items-center justify-center gap-6">
            {/* High Tech QR Box */}
            <div className="relative flex flex-col items-center justify-center p-5 rounded-2xl bg-zinc-950 border border-emerald-500/40 shadow-xl shadow-emerald-500/15">
              <div className="w-32 h-32 relative flex items-center justify-center bg-zinc-900 rounded-xl p-2 border border-emerald-400/30">
                {/* Stylized QR Matrix */}
                <div className="grid grid-cols-6 gap-1 w-full h-full p-1 opacity-90">
                  {Array.from({ length: 36 }).map((_, i) => (
                    <div
                      key={i}
                      className={`rounded-xs ${
                        [0, 1, 2, 6, 8, 12, 13, 14, 20, 21, 22, 26, 27, 28, 30, 32, 35].includes(i)
                          ? 'bg-emerald-400'
                          : [3, 4, 7, 10, 17, 18, 23, 29, 31, 33, 34].includes(i)
                          ? 'bg-teal-300'
                          : 'bg-transparent'
                      }`}
                    />
                  ))}
                </div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="p-1.5 rounded-lg bg-zinc-950 border border-emerald-400 shadow-md">
                    <QrCode className="w-5 h-5 text-emerald-400" />
                  </div>
                </div>
              </div>
              <span className="font-mono mt-3 text-[11px] font-semibold text-emerald-300 tracking-wider uppercase">
                {t('plaqueScan')}
              </span>
            </div>

            {/* Plaque Metadata */}
            <div className="flex flex-col text-left gap-3 max-w-xs">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-semibold text-zinc-200">
                  {t('plaqueFeature1Title')}
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-sans">
                {t('plaqueFeature1Desc')}
              </p>
              <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                <Languages className="w-4 h-4" />
                <span>{t('plaqueFeature2')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Plaque Action */}
      <div className="mt-6 pt-6 border-t border-zinc-900 flex items-center justify-between">
        <span className="text-xs text-zinc-500 font-mono">{t('plaqueFooter')}</span>
        <button
          type="button"
          onClick={onOpenDemo}
          aria-label={t('plaqueAction')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>{t('plaqueAction')}</span>
        </button>
      </div>
    </div>
  );
};
