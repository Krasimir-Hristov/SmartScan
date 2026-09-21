'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Sparkles } from 'lucide-react';
import {
  DEFAULT_PLAQUE_FORMAT,
  DEFAULT_PLAQUE_THEME,
  PLAQUE_BOTTOM_LANGUAGES,
  PLAQUE_BRAND_BADGE,
  PLAQUE_PRINT_ID,
  PLAQUE_PRINT_SPECS,
  PLAQUE_QR_CAPTION,
  PLAQUE_QR_ID,
  PLAQUE_SUBTITLE,
  PLAQUE_TOP_LANGUAGES,
  QR_BACKGROUND_COLOR,
  QR_FOREGROUND_COLOR,
  QR_QUIET_ZONE_MODULES,
  getPlaqueAspectRatio,
  getPlaqueDesignHeightPx,
  getPlaquePrintScale,
  type PlaqueFormat,
  type PlaqueLanguageCallout,
  type PlaqueTheme,
} from '../lib/plaqueConfig';

export interface PlaqueVisualPreviewProps {
  spaceName: string;
  guestUrl: string;
  format?: PlaqueFormat;
  theme?: PlaqueTheme;
}

/** Inline CSS variables + aspect ratio published for the print stylesheet. */
type PlaquePrintStyle = React.CSSProperties & {
  '--plaque-design-w': string;
  '--plaque-design-h': string;
  '--plaque-print-padding': string;
  '--plaque-print-scale': string;
};

const SCREEN_PADDING_CLASS: Record<PlaqueFormat, string> = {
  A4: 'p-6 sm:p-8',
  A5: 'p-6 sm:p-7',
  A6: 'p-5 sm:p-6',
};

const LanguageRow: React.FC<{
  callout: PlaqueLanguageCallout;
  isDark: boolean;
}> = ({ callout, isDark }) => (
  <div className='flex items-center gap-2.5 text-[11px] leading-tight'>
    <span
      className={`fi fi-${callout.countryCode} rounded-xs shrink-0 shadow-xs`}
      style={{ width: '1.25rem', height: '0.9375rem', backgroundSize: 'cover' }}
      aria-hidden='true'
    />
    <span className='font-mono font-bold text-[10px] text-emerald-500 shrink-0'>
      {callout.langName}
    </span>
    <span
      className={`truncate font-medium ${
        isDark ? 'text-zinc-300' : 'text-zinc-700'
      }`}
    >
      {callout.text}
    </span>
  </div>
);

/** Discrete vector acrylic screw mount accent for the tabletop plaque feel. */
const CornerScrew: React.FC<{ theme: PlaqueTheme }> = ({ theme }) => {
  const isDark = theme === 'dark';
  return (
    <div
      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
        isDark
          ? 'bg-zinc-800 border-zinc-700 shadow-inner'
          : 'bg-zinc-200 border-zinc-300 shadow-inner'
      }`}
      aria-hidden='true'
    >
      <div
        className={`w-2 h-0.5 rounded-full ${
          isDark ? 'bg-zinc-600' : 'bg-zinc-400'
        } transform rotate-45`}
      />
    </div>
  );
};

export const PlaqueVisualPreview: React.FC<PlaqueVisualPreviewProps> = ({
  spaceName,
  guestUrl,
  format = DEFAULT_PLAQUE_FORMAT,
  theme = DEFAULT_PLAQUE_THEME,
}) => {
  const isDark = theme === 'dark';
  const spec =
    PLAQUE_PRINT_SPECS[format] ?? PLAQUE_PRINT_SPECS[DEFAULT_PLAQUE_FORMAT];

  // Print geometry is published as CSS variables so the print stylesheet can
  // scale this exact design box onto the physical paper size (true WYSIWYG).
  const printVariables: PlaquePrintStyle = {
    '--plaque-design-w': `${spec.designWidthPx}px`,
    '--plaque-design-h': `${getPlaqueDesignHeightPx(spec)}px`,
    '--plaque-print-padding': `${spec.designPaddingPx}px`,
    '--plaque-print-scale': String(getPlaquePrintScale(spec)),
    aspectRatio: getPlaqueAspectRatio(spec),
  };

  return (
    <div
      id={PLAQUE_PRINT_ID}
      aria-label={`Printable guest plaque (${format})`}
      style={printVariables}
      className={`relative mx-auto flex flex-col justify-between select-none transition-colors duration-200 w-full ${
        spec.screenMaxWidthClass
      } ${SCREEN_PADDING_CLASS[format]} rounded-3xl shadow-2xl border ${
        isDark
          ? 'bg-[#09090b] text-white border-white/10'
          : 'bg-white text-zinc-950 border-zinc-200 shadow-zinc-200/50'
      }`}
    >
      {/* 4 corner screw accents */}
      <div className='absolute top-4 left-4'>
        <CornerScrew theme={theme} />
      </div>
      <div className='absolute top-4 right-4'>
        <CornerScrew theme={theme} />
      </div>
      <div className='absolute bottom-4 left-4'>
        <CornerScrew theme={theme} />
      </div>
      <div className='absolute bottom-4 right-4'>
        <CornerScrew theme={theme} />
      </div>

      {/* 1. Header: brand & space name */}
      <header className='flex flex-col items-center text-center mt-2 px-6'>
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase mb-2 ${
            isDark
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}
        >
          <Sparkles
            className='w-3.5 h-3.5 text-emerald-500'
            aria-hidden='true'
          />
          <span>{PLAQUE_BRAND_BADGE}</span>
        </div>

        <h1
          className={`font-display text-2xl sm:text-3xl font-extrabold uppercase tracking-tight line-clamp-2 wrap-break-word ${
            isDark ? 'text-white' : 'text-zinc-950'
          }`}
          title={spaceName}
        >
          {spaceName || 'Villa Sanctuary'}
        </h1>

        <p
          className={`text-xs font-medium tracking-wide mt-1 uppercase ${
            isDark ? 'text-zinc-400' : 'text-zinc-600'
          }`}
        >
          {PLAQUE_SUBTITLE}
        </p>
      </header>

      {/* 2. Top five languages with SVG flags */}
      <section
        aria-label='Multilingual guest instructions (top group)'
        className={`flex flex-col gap-1.5 px-4 py-2.5 rounded-2xl border ${
          isDark ? 'bg-[#121216] border-white/8' : 'bg-zinc-50 border-zinc-200'
        }`}
      >
        {PLAQUE_TOP_LANGUAGES.map((callout) => (
          <LanguageRow key={callout.code} callout={callout} isDark={isDark} />
        ))}
      </section>

      {/* 3. Center QR code with targeting brackets */}
      <section
        aria-label='Scan QR code'
        className='flex flex-col items-center justify-center my-2'
      >
        <div
          className={`relative p-3.5 sm:p-4 rounded-2xl border flex flex-col items-center justify-center shadow-lg ${
            isDark
              ? 'bg-[#121216] border-emerald-500/30'
              : 'bg-white border-emerald-500/40 shadow-emerald-500/10'
          }`}
        >
          <div className='absolute top-1.5 left-1.5 w-3.5 h-3.5 border-t-2 border-l-2 border-emerald-500 rounded-tl-sm' />
          <div className='absolute top-1.5 right-1.5 w-3.5 h-3.5 border-t-2 border-r-2 border-emerald-500 rounded-tr-sm' />
          <div className='absolute bottom-1.5 left-1.5 w-3.5 h-3.5 border-b-2 border-l-2 border-emerald-500 rounded-bl-sm' />
          <div className='absolute bottom-1.5 right-1.5 w-3.5 h-3.5 border-b-2 border-r-2 border-emerald-500 rounded-br-sm' />

          {/* High-contrast white surface + spec-compliant quiet zone */}
          <div className='p-2.5 rounded-xl bg-white flex items-center justify-center shadow-inner'>
            <QRCodeSVG
              id={PLAQUE_QR_ID}
              value={guestUrl}
              size={spec.qrRenderSizePx}
              level='H'
              marginSize={QR_QUIET_ZONE_MODULES}
              fgColor={QR_FOREGROUND_COLOR}
              bgColor={QR_BACKGROUND_COLOR}
            />
          </div>

          <span className='mt-2 font-mono text-[10px] font-bold tracking-widest uppercase text-emerald-500'>
            {PLAQUE_QR_CAPTION}
          </span>
        </div>
      </section>

      {/* 4. Bottom five languages with SVG flags */}
      <section
        aria-label='Multilingual guest instructions (bottom group)'
        className={`flex flex-col gap-1.5 px-4 py-2.5 rounded-2xl border ${
          isDark ? 'bg-[#121216] border-white/8' : 'bg-zinc-50 border-zinc-200'
        }`}
      >
        {PLAQUE_BOTTOM_LANGUAGES.map((callout) => (
          <LanguageRow key={callout.code} callout={callout} isDark={isDark} />
        ))}
      </section>

      <div className='h-2' aria-hidden='true' />
    </div>
  );
};
