'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { LayoutDashboard, LogOut, Loader2, Sparkles } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

export interface NavbarAuthActionProps {
  onOpenAuth: () => void;
  isMobile?: boolean;
  onCloseMobile?: () => void;
}

export const NavbarAuthAction: React.FC<NavbarAuthActionProps> = ({
  onOpenAuth,
  isMobile = false,
  onCloseMobile,
}) => {
  const router = useRouter();
  const t = useTranslations('nav');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    try {
      const supabase = createClient();

      supabase.auth.getUser().then(({ data: { user } }) => {
        setCurrentUser(user);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setCurrentUser(session?.user ?? null);
      });

      return () => {
        subscription.unsubscribe();
      };
    } catch {
      // In case client env variables are missing during static rendering
    }
  }, []);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setCurrentUser(null);
      if (onCloseMobile) onCloseMobile();
    } catch {
      // Continue navigation
    } finally {
      router.push('/');
      router.refresh();
      setIsSigningOut(false);
    }
  };

  // ── Mobile Drawer Layout ────────────────────────────────────────────────────
  if (isMobile) {
    if (currentUser) {
      return (
        <div className="flex flex-col gap-2">
          <Link
            href="/dashboard"
            onClick={onCloseMobile}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 transition-all cursor-pointer"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>{t('dashboardFull')}</span>
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            aria-label={t('signOutAria')}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            {isSigningOut ? (
              <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
            ) : (
              <LogOut className="w-4 h-4 text-zinc-400" />
            )}
            <span>{isSigningOut ? t('signingOut') : t('signOut')}</span>
          </button>
        </div>
      );
    }

    return (
      <Button
        variant="primary"
        size="md"
        fullWidth
        onClick={() => {
          if (onCloseMobile) onCloseMobile();
          onOpenAuth();
        }}
        aria-label={t('signIn')}
      >
        <Sparkles className="w-4 h-4 mr-1 text-zinc-950" />
        {t('signIn')}
      </Button>
    );
  }

  // ── Desktop Layout ─────────────────────────────────────────────────────────
  if (currentUser) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard"
          aria-label={t('dashboardAria')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-500/30 shadow-sm transition-all cursor-pointer"
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>{t('dashboard')}</span>
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          aria-label={t('signOutAria')}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-900/90 hover:bg-red-950/40 border border-zinc-800 hover:border-red-500/30 transition-all cursor-pointer disabled:cursor-not-allowed"
        >
          {isSigningOut ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
          ) : (
            <LogOut className="w-3.5 h-3.5 text-zinc-400" />
          )}
          <span>{isSigningOut ? '...' : t('signOut')}</span>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-label={t('signIn')}
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
      <span>{t('signIn')}</span>
    </button>
  );
};
