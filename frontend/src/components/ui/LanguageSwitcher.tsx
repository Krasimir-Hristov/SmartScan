'use client';

import React, { useState, useRef, useEffect, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { locales } from '@/lib/i18n/config';
import { setLocaleCookie } from '@/features/i18n/actions';

interface LanguageSwitcherProps {
  /** Dropdown alignment relative to trigger button. */
  align?: 'left' | 'right';
  /** Visual variant — 'ghost' (navbar) vs 'outlined' (footer). */
  variant?: 'ghost' | 'outlined';
}

interface FlagIconProps {
  countryCode: string;
  size?: 'sm' | 'md';
}

/**
 * Renders a flag using the flag-icons CSS library (fi fi-{countryCode}).
 * This renders an actual SVG sprite — works on Windows unlike emoji flags.
 */
const FlagIcon: React.FC<FlagIconProps> = ({
  countryCode,
  size = 'sm',
}) => {
  const dimensions =
    size === 'md'
      ? { width: '1.5rem', height: '1.125rem' }
      : { width: '1.25rem', height: '0.9375rem' };

  return (
    <span
      className={`fi fi-${countryCode} rounded-xs shrink-0 shadow-sm`}
      style={{ ...dimensions, display: 'inline-block', backgroundSize: 'cover' }}
      aria-hidden="true"
    />
  );
};

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  align = 'right',
  variant = 'ghost',
}) => {
  const currentLocale = useLocale();
  const tNav = useTranslations('nav');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const current = locales.find((l) => l.code === currentLocale) ?? locales[0];

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleSelect = (code: string) => {
    setIsOpen(false);
    startTransition(async () => {
      await setLocaleCookie(code);
      router.refresh();
    });
  };

  const triggerClass =
    variant === 'outlined'
      ? 'inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono font-medium text-zinc-300 bg-[#18181b] hover:bg-zinc-800 border border-white/10 hover:border-emerald-500/40 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 transition-all duration-200'
      : 'inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium text-zinc-300 hover:text-white hover:bg-white/5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 transition-all duration-200';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button — shows flag + locale code */}
      <button
        type="button"
        aria-label={`${tNav('languageSelect')}. ${current.label}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => setIsOpen((v) => !v)}
        disabled={isPending}
        className={triggerClass}
      >
        <FlagIcon countryCode={current.countryCode} size="sm" />
        <span className="uppercase tracking-wider">{current.code}</span>
        <ChevronDown
          className={`w-3 h-3 text-zinc-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          role="listbox"
          aria-label={tNav('languageSelect')}
          className={`absolute mt-2 w-52 rounded-2xl overflow-hidden bg-zinc-950/95 backdrop-blur-xl border border-emerald-500/15 shadow-2xl shadow-black/60 py-1.5 z-200 ${align === 'right' ? 'right-0' : 'left-0'}`}
          style={{ animation: 'fadeScaleIn 0.15s ease-out' }}
        >
          <div className="px-3 pt-2 pb-2 border-b border-white/5">
            <p className="text-[10px] uppercase font-mono font-semibold text-zinc-500 tracking-widest">
              {tNav('languageSelect')}
            </p>
          </div>

          <ul className="py-1 max-h-72 overflow-y-auto">
            {locales.map((loc) => {
              const isActive = currentLocale === loc.code;
              return (
                <li key={loc.code}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => handleSelect(loc.code)}
                    disabled={isPending}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left cursor-pointer disabled:cursor-not-allowed transition-colors duration-150 ${
                      isActive
                        ? 'text-emerald-300 bg-emerald-950/40'
                        : 'text-zinc-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span className="flex items-center gap-3 font-sans">
                      {/* Real SVG flag via flag-icons */}
                      <FlagIcon countryCode={loc.countryCode} size="md" />
                      <span className="font-medium">{loc.label}</span>
                    </span>
                    {isActive && (
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <style>{`
        @keyframes fadeScaleIn {
          from { opacity: 0; transform: translateY(-4px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
      `}</style>
    </div>
  );
};
