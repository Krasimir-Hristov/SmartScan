'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  Building2,
  ExternalLink,
  Inbox,
  Loader2,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { logoutAdminAction } from '../actions/adminAuthActions';
import type { AdminTabId } from '../types/adminTypes';

export interface AdminNavbarProps {
  activeTab: AdminTabId;
  onSelectTab: (tab: AdminTabId) => void;
  adminEmail: string;
  unreadCount: number;
  hostsCount: number;
}

export const AdminNavbar: React.FC<AdminNavbarProps> = ({
  activeTab,
  onSelectTab,
  adminEmail,
  unreadCount,
  hostsCount,
}) => {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const result = await logoutAdminAction();
      if (!result.success) {
        setIsLoggingOut(false);
        return;
      }
      router.push('/admin/login');
      router.refresh();
    } catch {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-[#08080c]/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Branding */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-linear-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
            <ShieldCheck className="w-5 h-5 text-zinc-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white tracking-tight">
                SmartScan Stay
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Owner Admin
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 hidden sm:block font-mono">
              {adminEmail}
            </p>
          </div>
        </div>

        {/* Center: Tab Navigation */}
        <nav
          aria-label="Административна навигация"
          className="flex items-center gap-1.5 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800"
        >
          <button
            type="button"
            onClick={() => onSelectTab('overview')}
            aria-label="Преглед и Аналитика"
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>KPI & Аналитика</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('contacts')}
            aria-label="Запитвания от клиенти и AI Triaging"
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'contacts'
                ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Запитвания</span>
            {unreadCount > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === 'contacts'
                    ? 'bg-zinc-950 text-emerald-400'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}
              >
                {unreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('hosts')}
            aria-label="Клиентска директория на хазяите и обектите"
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'hosts'
                ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Хазяи & Обекти</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === 'hosts'
                  ? 'bg-zinc-950 text-emerald-400'
                  : 'bg-zinc-800 text-zinc-300'
              }`}
            >
              {hostsCount}
            </span>
          </button>
        </nav>

        {/* Right: Quick Links & Logout */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/dashboard"
            aria-label="Отвори таблото за хазяи"
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors cursor-pointer"
          >
            <span>Хазяин Табло</span>
            <ExternalLink className="w-3 h-3" />
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            aria-label="Изход от админ панела"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-red-300 bg-zinc-900/80 hover:bg-red-950/40 border border-zinc-800 hover:border-red-500/30 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoggingOut ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <LogOut className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">Изход</span>
          </button>
        </div>
      </div>
    </header>
  );
};
