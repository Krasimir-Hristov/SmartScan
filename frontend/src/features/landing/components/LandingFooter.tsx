'use client';

import React, { useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { locales } from '@/lib/i18n/config';
import { setLocaleCookie } from '@/features/i18n/actions';
import { QrCode, Globe, ShieldCheck, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

export const LandingFooter: React.FC = () => {
  const t = useTranslations('footer');
  const currentLocale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const year = new Date().getFullYear();

  const isHome = pathname === '/';

  const handleLocaleChange = (code: string) => {
    if (code === currentLocale || isPending) return;
    startTransition(async () => {
      try {
        await setLocaleCookie(code);
        router.refresh();
      } catch {
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }
    });
  };

  return (
    <footer className="border-t border-zinc-900 bg-zinc-950 py-12 text-zinc-400">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* 10 Tourism Markets Bar — SVG flags with 1-click Language Switching */}
        <div className="pb-8 border-b border-zinc-900 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300 shrink-0">
            <Globe className="w-4 h-4 text-emerald-400" />
            <span>{t('markets')}</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {locales.map((loc) => {
              const isActive = loc.code === currentLocale;
              return (
                <button
                  key={loc.code}
                  type="button"
                  onClick={() => handleLocaleChange(loc.code)}
                  disabled={isPending}
                  aria-label={`Switch language to ${loc.label}`}
                  title={loc.label}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono uppercase transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60',
                    isActive
                      ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300 font-bold shadow-xs shadow-emerald-500/20'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                  )}
                >
                  {/* SVG flag from flag-icons */}
                  <span
                    className={`fi fi-${loc.countryCode} rounded-xs shrink-0`}
                    style={{
                      width: '1rem',
                      height: '0.75rem',
                      display: 'inline-block',
                      backgroundSize: 'cover',
                    }}
                    aria-hidden="true"
                  />
                  <span>{loc.code}</span>
                  {isActive && (
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 ml-0.5"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Footer Row */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          {/* Brand */}
          <Link
            href="/"
            className="flex items-center gap-3 group cursor-pointer hover:opacity-90 transition-opacity"
            aria-label="SmartScan Stay Home"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-emerald-400 to-teal-600 shadow-md shadow-emerald-500/20 text-zinc-950 font-bold">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-white font-display">
                SmartScan Stay
              </p>
              <p className="text-xs text-zinc-400 font-sans">
                Next-Gen AI Guest Concierge for Luxury Vacation Rentals
              </p>
            </div>
          </Link>

          {/* Navigation Links (Section Anchor or Route Navigation) */}
          <nav
            className="flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-400"
            aria-label="Footer Navigation"
          >
            <Link
              href={isHome ? '#overview' : '/#overview'}
              className="hover:text-emerald-400 transition-colors cursor-pointer"
            >
              {t('overview')}
            </Link>
            <Link
              href={isHome ? '#how-it-works' : '/#how-it-works'}
              className="hover:text-emerald-400 transition-colors cursor-pointer"
            >
              {t('howItWorks')}
            </Link>
            <Link
              href={isHome ? '#pricing' : '/#pricing'}
              className="hover:text-emerald-400 transition-colors cursor-pointer"
            >
              {t('pricing')}
            </Link>

            <span className="text-zinc-800 hidden sm:inline" aria-hidden="true">
              |
            </span>

            <Link
              href="/privacy"
              className={cn(
                'transition-colors cursor-pointer',
                pathname === '/privacy'
                  ? 'text-emerald-400 font-semibold'
                  : 'text-zinc-400 hover:text-white'
              )}
            >
              {t('privacy')}
            </Link>
            <Link
              href="/terms"
              className={cn(
                'transition-colors cursor-pointer',
                pathname === '/terms'
                  ? 'text-emerald-400 font-semibold'
                  : 'text-zinc-400 hover:text-white'
              )}
            >
              {t('terms')}
            </Link>
          </nav>
        </div>

        {/* Compliance Trust Ribbon */}
        <div className="mt-8 pt-6 border-t border-zinc-900/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 font-sans">
          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] font-mono text-zinc-400">
            <span className="inline-flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
              <span>Stripe Verified Partner</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>GDPR Compliant (EU Host)</span>
            </span>
          </div>

          <p className="text-center sm:text-right">
            © {year} SmartScan Stay. {t('copyright')}
          </p>
        </div>
      </div>
    </footer>
  );
};
