'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { QrCode } from 'lucide-react';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { UserProfileDropdown } from './UserProfileDropdown';
import type { DashboardUser } from '../types/dashboardTypes';

export interface DashboardNavbarProps {
  user: DashboardUser;
}

export const DashboardNavbar: React.FC<DashboardNavbarProps> = ({ user }) => {
  const t = useTranslations('dashboard');

  return (
    <header className="sticky top-0 z-40 w-full border-b border-emerald-950/40 bg-zinc-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand & Badge */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            aria-label="SmartScan Stay Dashboard"
            className="flex items-center gap-2.5 group cursor-pointer"
          >
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-emerald-400 to-teal-600 shadow-md shadow-emerald-500/20">
              <QrCode className="h-5 w-5 text-zinc-950" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-300" />
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-white font-display">
                SmartScan
              </span>
              <span className="text-[10px] font-medium tracking-wider uppercase text-emerald-500/80 -mt-1 font-mono">
                AI Concierge
              </span>
            </div>
          </Link>

          <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
            {t('hostBadge')}
          </span>
        </div>

        {/* Language & User Profile Dropdown */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Language Switcher */}
          <div className="flex items-center">
            <LanguageSwitcher align="right" variant="ghost" />
          </div>

          {/* User Profile Dropdown (Responsive: avatar only on mobile, avatar+name+chevron on desktop) */}
          <UserProfileDropdown user={user} />
        </div>
      </div>
    </header>
  );
};
