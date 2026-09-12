'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog } from '@/components/ui/Dialog';
import { createClient } from '@/lib/supabase/client';
import { AlertCircle, Loader2, QrCode, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
}) => {
  const t = useTranslations('auth');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const redirectUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback?next=/dashboard`
        : '/auth/callback?next=/dashboard';

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
      }
    } catch {
      setErrorMessage(t('error'));
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-md p-0 overflow-hidden bg-[#09090d] border border-emerald-500/25 shadow-2xl shadow-emerald-950/60 rounded-2xl"
    >
      <div className="relative p-7 sm:p-9 flex flex-col justify-between bg-linear-to-b from-zinc-950/95 via-[#0c0c11] to-[#09090d]">
        {/* Ambient atmospheric emerald glow behind modal */}
        <div
          className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 rounded-full bg-emerald-500/15 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-emerald-600/10 blur-3xl"
          aria-hidden="true"
        />

        {/* Header & Branding */}
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-400 to-teal-600 shadow-lg shadow-emerald-500/25">
              <QrCode className="h-5.5 w-5.5 text-zinc-950" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-300" />
              </span>
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              {t('welcomeBadge')}
            </span>
          </div>

          <div>
            <h3 className="font-display text-2xl font-bold tracking-tight text-white">
              {t('title')}
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed mt-2 font-sans">
              {t('desc')}
            </p>
          </div>
        </div>

        {/* Action Center */}
        <div className="relative z-10 flex flex-col gap-4 my-7">
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-xl bg-red-950/80 border border-red-500/30 p-3 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Primary Google Auth Button */}
          <motion.button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.985 }}
            aria-label={t('continueGoogle')}
            className="relative w-full flex items-center justify-center gap-3 py-3.5 px-5 rounded-xl font-semibold text-sm text-zinc-950 bg-white hover:bg-zinc-100 transition-all cursor-pointer shadow-lg shadow-black/40 border border-white/80 disabled:cursor-not-allowed disabled:opacity-70 group"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
            ) : (
              <svg className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105" viewBox="0 0 24 24" aria-hidden="true">
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
            )}
            <span className="font-semibold tracking-tight">
              {isLoading ? t('connecting') : t('continueGoogle')}
            </span>
          </motion.button>
        </div>

        {/* Footer Security Badge */}
        <div className="relative z-10 flex items-center gap-2 pt-3 border-t border-white/5 text-xs text-zinc-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{t('securityNote')}</span>
        </div>
      </div>
    </Dialog>
  );
};

