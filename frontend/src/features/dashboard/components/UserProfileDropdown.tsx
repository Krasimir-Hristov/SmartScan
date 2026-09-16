'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import {
  User,
  CreditCard,
  Settings,
  LogOut,
  Trash2,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { DeleteAccountModal } from './DeleteAccountModal';
import type { DashboardUser } from '../types/dashboardTypes';

export interface UserProfileDropdownProps {
  user: DashboardUser;
}

export const UserProfileDropdown: React.FC<UserProfileDropdownProps> = ({
  user,
}) => {
  const router = useRouter();
  const t = useTranslations('dashboard');
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    t('defaultHostName');

  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const userEmail = user.email || '';

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Proceed with redirection
    } finally {
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={t('profileTitle')}
        className="flex items-center gap-2 p-1 sm:px-3 sm:py-1.5 rounded-full sm:rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 transition-all cursor-pointer select-none"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-8 h-8 sm:w-7 sm:h-7 rounded-full object-cover border border-emerald-500/40"
          />
        ) : (
          <div className="w-8 h-8 sm:w-7 sm:h-7 rounded-full bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <User className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          </div>
        )}

        {/* Display Name on Desktop */}
        <span className="hidden sm:inline-block text-xs font-semibold text-zinc-200 max-w-120px truncate">
          {displayName}
        </span>

        {/* Subtle Chevron on Desktop */}
        <ChevronDown
          className={`hidden sm:inline-block w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-emerald-400' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu Panel */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          aria-label={t('profileTitle')}
          className="absolute right-0 mt-2 w-72 rounded-2xl bg-zinc-950/95 border border-white/10 shadow-2xl shadow-black/80 z-50 backdrop-blur-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-2 flex flex-col gap-1"
        >
          {/* Header Info */}
          <div className="px-3 py-3 rounded-xl bg-white/5 flex items-center gap-3">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-10 h-10 rounded-full object-cover border border-emerald-500/40 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <User className="w-5 h-5" />
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-white truncate">
                {displayName}
              </span>
              <span className="text-[11px] text-zinc-400 truncate">
                {userEmail}
              </span>
            </div>
          </div>

          <div className="h-px bg-white/10 my-1" />

          {/* Prepared Slots: Billing & Settings */}
          <div
            role="menuitem"
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:bg-white/5 transition-colors cursor-default"
          >
            <div className="flex items-center gap-2.5">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span>{t('billingLabel')}</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              {t('billingBadgeSoon')}
            </span>
          </div>

          <div
            role="menuitem"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-zinc-400 opacity-60 cursor-not-allowed"
          >
            <Settings className="w-4 h-4 text-zinc-500" />
            <span>{t('settingsLabel')}</span>
          </div>

          <div className="h-px bg-white/10 my-1" />

          {/* Sign Out Action */}
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            disabled={isSigningOut}
            aria-label={t('signOutAria')}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer w-full text-left disabled:opacity-50"
          >
            {isSigningOut ? (
              <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
            ) : (
              <LogOut className="w-4 h-4 text-zinc-400" />
            )}
            <span>{isSigningOut ? t('signingOut') : t('signOut')}</span>
          </button>

          {/* Delete Account (GitHub-style Danger action) */}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              setIsDeleteModalOpen(true);
            }}
            aria-label={t('deleteAccountLabel')}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer w-full text-left"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
            <span>{t('deleteAccountLabel')}</span>
          </button>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {isDeleteModalOpen && (
        <DeleteAccountModal
          isOpen={isDeleteModalOpen}
          userEmail={userEmail}
          onClose={() => setIsDeleteModalOpen(false)}
        />
      )}
    </div>
  );
};
