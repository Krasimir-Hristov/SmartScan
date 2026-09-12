'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { QrCode, LogOut, ArrowLeft, Loader2, User } from 'lucide-react';
import type { DashboardUser } from '../types/dashboard.types';

export interface DashboardNavbarProps {
  user: DashboardUser;
}

export const DashboardNavbar: React.FC<DashboardNavbarProps> = ({ user }) => {
  const router = useRouter();
  const t = useTranslations('dashboard');
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Proceed to home navigation
    } finally {
      router.push('/');
      router.refresh();
    }
  };

  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    t('defaultHostName');

  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;

  return (
    <header className='sticky top-0 z-40 w-full border-b border-emerald-950/40 bg-zinc-950/80 backdrop-blur-xl'>
      <div className='mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8'>
        {/* Brand & Badge */}
        <div className='flex items-center gap-3'>
          <Link
            href='/dashboard'
            aria-label='SmartScan Stay Dashboard'
            className='flex items-center gap-2.5 group cursor-pointer'
          >
            <div className='relative flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-emerald-400 to-teal-600 shadow-md shadow-emerald-500/20'>
              <QrCode className='h-5 w-5 text-zinc-950' />
              <span className='absolute -top-1 -right-1 flex h-2.5 w-2.5'>
                <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75' />
                <span className='relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-300' />
              </span>
            </div>
            <div className='flex flex-col'>
              <span className='text-lg font-bold tracking-tight text-white font-display'>
                SmartScan
              </span>
              <span className='text-[10px] font-medium tracking-wider uppercase text-emerald-500/80 -mt-1 font-mono'>
                AI Concierge
              </span>
            </div>
          </Link>

          <span className='hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono'>
            {t('hostBadge')}
          </span>
        </div>

        {/* User Profile & Actions */}
        <div className='flex items-center gap-3 sm:gap-4'>
          <Link
            href='/'
            aria-label={t('backToSiteAria')}
            className='hidden md:inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer'
          >
            <ArrowLeft className='w-3.5 h-3.5' />
            <span>{t('backToSite')}</span>
          </Link>

          {/* User Info Capsule */}
          <div className='flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-white/10'>
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={displayName}
                className='w-6 h-6 rounded-full object-cover border border-emerald-500/40'
              />
            ) : (
              <div className='w-6 h-6 rounded-full bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-emerald-400'>
                <User className='w-3.5 h-3.5' />
              </div>
            )}
            <div className='flex flex-col'>
              <span className='text-xs font-semibold text-zinc-200 max-w-120px sm:max-w-160px truncate'>
                {displayName}
              </span>
              <span className='text-[10px] text-zinc-500 hidden sm:inline truncate max-w-160px'>
                {user.email}
              </span>
            </div>
          </div>

          {/* Log Out Button */}
          <button
            type='button'
            onClick={handleSignOut}
            disabled={isSigningOut}
            aria-label={t('signOutAria')}
            className='inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-900/90 hover:bg-red-950/40 border border-zinc-800 hover:border-red-500/30 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60'
          >
            {isSigningOut ? (
              <Loader2 className='w-4 h-4 animate-spin text-zinc-400' />
            ) : (
              <LogOut className='w-4 h-4 text-zinc-400 group-hover:text-red-400' />
            )}
            <span className='hidden sm:inline'>
              {isSigningOut ? t('signingOut') : t('signOut')}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
