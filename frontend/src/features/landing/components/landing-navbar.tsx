'use client';

import React, { useState, useRef, useEffect } from 'react';
import { locales, type LocaleCode } from '@/lib/i18n/config';
import { Button } from '@/components/ui/button';
import { ChevronDown, Menu, X, Sparkles, QrCode } from 'lucide-react';
import type { NavItem } from '../types/landing.types';

export interface LandingNavbarProps {
  onOpenAuth: () => void;
  onOpenDemo: () => void;
}

const navItems: NavItem[] = [
  { label: 'Overview', href: '#overview' },
  { label: 'How it Works', href: '#how-it-works' },
  { label: 'Showcase', href: '#showcase' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Reviews', href: '#reviews' },
];

export const LandingNavbar: React.FC<LandingNavbarProps> = ({
  onOpenAuth,
  onOpenDemo,
}) => {
  const [activeLocale, setActiveLocale] = useState<LocaleCode>('en');
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  // Close language menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setIsLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLocaleData = locales.find((l) => l.code === activeLocale) || locales[0];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-emerald-950/40 bg-zinc-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <a
          href="#overview"
          aria-label="SmartScan Stay Home"
          className="flex items-center gap-2.5 group cursor-pointer transition-opacity hover:opacity-90"
        >
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-emerald-400 to-teal-600 shadow-md shadow-emerald-500/20 group-hover:shadow-emerald-500/35 transition-all">
            <QrCode className="h-5 w-5 text-zinc-950" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-300"></span>
            </span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold tracking-tight text-white">SmartScan</span>
              <span className="text-lg font-extrabold tracking-tight text-emerald-400">Stay</span>
            </div>
            <span className="text-[10px] font-medium tracking-wider uppercase text-emerald-500/80 -mt-1">
              AI Concierge
            </span>
          </div>
        </a>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-7" aria-label="Main Navigation">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-sm font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Right Section: Language Dropdown + Google Sign-In */}
        <div className="hidden sm:flex items-center gap-3">
          {/* Language Selector */}
          <div className="relative" ref={langMenuRef}>
            <button
              type="button"
              aria-label={`Select language. Current language is ${currentLocaleData.label}`}
              aria-expanded={isLangMenuOpen}
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-zinc-300 bg-zinc-900/90 hover:bg-zinc-800/90 border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-colors"
            >
              <span className="text-sm">{currentLocaleData.flag}</span>
              <span className="uppercase tracking-wider">{currentLocaleData.code}</span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 transition-transform duration-200" />
            </button>

            {isLangMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-zinc-950 border border-emerald-500/20 shadow-xl shadow-black/80 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">
                  Select Language (10 Markets)
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-zinc-900">
                  {locales.map((loc) => (
                    <button
                      key={loc.code}
                      type="button"
                      onClick={() => {
                        setActiveLocale(loc.code);
                        setIsLangMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs text-left text-zinc-300 hover:text-white hover:bg-emerald-950/40 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <span>{loc.flag}</span>
                        <span>{loc.label}</span>
                      </span>
                      {activeLocale === loc.code && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sign In with Google */}
          <button
            type="button"
            aria-label="Sign in with Google"
            onClick={onOpenAuth}
            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-zinc-900/90 hover:bg-zinc-800 border border-emerald-500/20 hover:border-emerald-500/40 shadow-sm transition-all cursor-pointer active:scale-[0.98]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Sign in with Google</span>
          </button>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex sm:hidden items-center gap-2">
          <button
            type="button"
            aria-label="Open mobile menu"
            onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
            className="p-2 rounded-xl text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 cursor-pointer"
          >
            {isMobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileNavOpen && (
        <div className="sm:hidden border-b border-zinc-800 bg-zinc-950 px-4 py-5 animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col gap-4">
            <nav className="flex flex-col gap-3">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setIsMobileNavOpen(false)}
                  className="text-base font-medium text-zinc-300 hover:text-emerald-400 py-1 cursor-pointer"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="pt-3 border-t border-zinc-900 flex flex-col gap-3">
              {/* Language Selector for Mobile */}
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Display Language</span>
                <select
                  aria-label="Select Mobile Language"
                  value={activeLocale}
                  onChange={(e) => setActiveLocale(e.target.value as LocaleCode)}
                  className="bg-zinc-900 text-zinc-200 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs cursor-pointer"
                >
                  {locales.map((loc) => (
                    <option key={loc.code} value={loc.code}>
                      {loc.flag} {loc.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mobile Auth Button */}
              <Button
                variant="primary"
                size="md"
                fullWidth
                onClick={() => {
                  setIsMobileNavOpen(false);
                  onOpenAuth();
                }}
                aria-label="Sign in with Google (Mobile)"
              >
                <Sparkles className="w-4 h-4 mr-1 text-zinc-950" />
                Sign in with Google
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
