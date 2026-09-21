'use client';

import React, { useEffect, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import {
  PLAQUE_PRINT_ID,
  PLAQUE_PRINT_SPECS,
  type PlaqueFormat,
  type PlaqueTheme,
} from '../../lib/plaqueConfig';
import { useModalFocus } from '../../hooks/useModalFocus';

export interface PlaqueModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  format: PlaqueFormat;
  theme: PlaqueTheme;
  title: string;
  subtitle: string;
  headerIcon: React.ReactNode;
  children: React.ReactNode;
}

const emptySubscribe = () => () => {};

/**
 * Portal-based modal shell that also owns the print stylesheet: it hides the
 * host dashboard, pins the plaque to the physical page box and forces exact
 * colour printing (backgrounds, flags and emerald accents included).
 */
export const PlaqueModalShell: React.FC<PlaqueModalShellProps> = ({
  isOpen,
  onClose,
  format,
  theme,
  title,
  subtitle,
  headerIcon,
  children,
}) => {
  const t = useTranslations('plaqueModal');
  const containerRef = useRef<HTMLDivElement>(null);
  const spec = PLAQUE_PRINT_SPECS[format];
  const printBackground = theme === 'dark' ? '#09090b' : '#ffffff';

  // The portal must never be evaluated during SSR.
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  useModalFocus(isOpen, containerRef);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !isClient) return null;

  return createPortal(
    <div
      role='dialog'
      aria-modal='true'
      aria-labelledby='plaque-modal-title'
      className='fixed inset-0 z-100 flex items-center justify-center p-3 sm:p-6 overflow-y-auto'
    >
      <div
        onClick={onClose}
        className='fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity cursor-pointer'
        aria-hidden='true'
      />

      <style jsx global>{`
        @page {
          size: ${spec.pageSizeCss};
          margin: 0;
        }
        @media print {
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          body * {
            visibility: hidden !important;
          }
          #${PLAQUE_PRINT_ID},
          #${PLAQUE_PRINT_ID} * {
            visibility: visible !important;
          }
          #${PLAQUE_PRINT_ID} {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: var(--plaque-design-w) !important;
            height: var(--plaque-design-h) !important;
            max-width: none !important;
            max-height: none !important;
            padding: var(--plaque-print-padding) !important;
            transform: scale(var(--plaque-print-scale)) !important;
            transform-origin: top left !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: ${printBackground} !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div
        ref={containerRef}
        tabIndex={-1}
        className='relative z-10 w-full max-w-5xl rounded-3xl bg-[#0e0e12] border border-white/10 p-5 sm:p-7 shadow-2xl text-zinc-100 flex flex-col gap-6 my-auto max-h-[92dvh] overflow-y-auto focus:outline-none'
      >
        <div className='flex items-center justify-between pb-4 border-b border-white/10'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400'>
              {headerIcon}
            </div>
            <div>
              <h2
                id='plaque-modal-title'
                className='font-display text-lg sm:text-xl font-bold text-white tracking-tight'
              >
                {title}
              </h2>
              <p className='text-xs text-zinc-400'>{subtitle}</p>
            </div>
          </div>

          <button
            type='button'
            onClick={onClose}
            aria-label={t('close')}
            className='p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        {children}
      </div>
    </div>,
    document.body,
  );
};
