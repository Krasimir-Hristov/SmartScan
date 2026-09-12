'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { locales } from '@/lib/i18n/config';
import { QrCode, Globe } from 'lucide-react';

export const LandingFooter: React.FC = () => {
  const t = useTranslations('footer');
  const year = new Date().getFullYear();

  return (
    <footer className='border-t border-zinc-900 bg-zinc-950 py-12 text-zinc-400'>
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        {/* 10 Tourism Markets Bar — SVG flags, no emoji */}
        <div className='pb-8 border-b border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4'>
          <div className='flex items-center gap-2 text-xs font-semibold text-zinc-300 shrink-0'>
            <Globe className='w-4 h-4 text-emerald-400' />
            <span>{t('markets')}</span>
          </div>
          <div className='flex flex-wrap items-center justify-center gap-2'>
            {locales.map((loc) => (
              <span
                key={loc.code}
                className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300'
              >
                {/* SVG flag from flag-icons — works on Windows */}
                <span
                  className={`fi fi-${loc.countryCode} rounded-2px shrink-0`}
                  style={{
                    width: '1rem',
                    height: '0.75rem',
                    display: 'inline-block',
                    backgroundSize: 'cover',
                  }}
                  aria-hidden='true'
                />
                <span className='font-mono font-medium uppercase'>
                  {loc.code}
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* Main Footer Row */}
        <div className='pt-8 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left'>
          {/* Brand */}
          <div className='flex items-center gap-3'>
            <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'>
              <QrCode className='h-4 w-4' />
            </div>
            <div>
              <p className='text-sm font-bold text-white font-display'>
                SmartScan
              </p>
              <p className='text-xs text-zinc-400 font-sans'>
                Next-Gen AI Guest Concierge for Luxury Vacation Rentals
              </p>
            </div>
          </div>

          {/* Nav Links */}
          <nav
            className='flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-400'
            aria-label='Footer Navigation'
          >
            <a
              href='#overview'
              className='hover:text-emerald-400 transition-colors cursor-pointer'
            >
              {t('overview')}
            </a>
            <a
              href='#how-it-works'
              className='hover:text-emerald-400 transition-colors cursor-pointer'
            >
              {t('howItWorks')}
            </a>
            <a
              href='#pricing'
              className='hover:text-emerald-400 transition-colors cursor-pointer'
            >
              {t('pricing')}
            </a>
            <span className='text-zinc-700' aria-hidden='true'>
              |
            </span>
            <a
              href='#privacy'
              className='hover:text-white transition-colors cursor-pointer'
            >
              {t('privacy')}
            </a>
            <a
              href='#terms'
              className='hover:text-white transition-colors cursor-pointer'
            >
              {t('terms')}
            </a>
          </nav>
        </div>

        {/* Copyright */}
        <div className='mt-8 pt-6 border-t border-zinc-900/60 text-center text-xs text-zinc-400 font-sans'>
          © {year} SmartScan Stay. {t('copyright')}
        </div>
      </div>
    </footer>
  );
};
