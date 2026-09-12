'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { DashboardNavbar } from './components/DashboardNavbar';
import { DashboardMetrics } from './components/DashboardMetrics';
import { PropertyCard } from './components/PropertyCard';
import type { DashboardUser } from './types/dashboard.types';
import { Sparkles, Bot } from 'lucide-react';

export interface DashboardPageProps {
  user: DashboardUser;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ user }) => {
  const t = useTranslations('dashboard');

  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    t('defaultHostName');

  return (
    <div className="min-h-dvh bg-[#09090b] text-zinc-100 flex flex-col antialiased selection:bg-emerald-500 selection:text-zinc-950 font-sans">
      {/* Dashboard Sticky Navbar */}
      <DashboardNavbar user={user} />

      {/* Main Content Area */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col gap-8 sm:gap-10">
        {/* Welcome Section */}
        <section aria-label="Welcome Banner" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                <Sparkles className="w-3.5 h-3.5" />
                <span>SmartScan Stay v1.0</span>
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
              {t('welcome', { name: displayName })}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400">
              {t('welcomeSub')}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-zinc-900 border border-emerald-500/30 text-xs font-medium text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>{t('aiSystemOnline')}</span>
            </span>
          </div>
        </section>

        {/* Key Metrics Section */}
        <section aria-label={t('keyMetrics')}>
          <DashboardMetrics />
        </section>

        {/* Managed Properties Section */}
        <section aria-label={t('managedProperties')} className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <Bot className="w-5 h-5 text-emerald-400" />
              <span>{t('activeProperties')}</span>
            </h2>
          </div>

          <PropertyCard />
        </section>
      </main>

      {/* Simple Dashboard Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-6 text-center text-xs text-zinc-500">
        {t('footerNote')}
      </footer>
    </div>
  );
};
