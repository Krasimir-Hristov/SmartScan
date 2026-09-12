'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { Sparkles, Shield, QrCode, AlertCircle, Loader2 } from 'lucide-react';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDemo: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onOpenDemo,
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
        ? `${window.location.origin}/dashboard`
        : '/dashboard';

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
      title={t('title')}
      description={t('desc')}
    >
      <div className="flex flex-col gap-5 pt-2">
        {errorMessage && (
          <div className="flex items-center gap-2 rounded-xl bg-red-950/80 border border-red-500/30 p-3 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Primary Google Auth Action */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          aria-label={t('continueGoogle')}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl font-semibold text-sm text-zinc-950 bg-white hover:bg-zinc-100 active:scale-[0.98] transition-all cursor-pointer shadow-md disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
          ) : (
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
          )}
          <span>{isLoading ? t('connecting') : t('continueGoogle')}</span>
        </button>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-zinc-800 w-full" />
          <span className="bg-zinc-950 px-3 text-[11px] uppercase tracking-wider text-zinc-500 font-mono">
            {t('orExplore')}
          </span>
        </div>

        {/* Secondary Guest Demo Action */}
        <Button
          variant="secondary"
          size="md"
          fullWidth
          onClick={() => {
            onClose();
            onOpenDemo();
          }}
          aria-label={t('launchDemo')}
          className="border-emerald-500/20 hover:border-emerald-500/40 text-emerald-300 cursor-pointer"
        >
          <QrCode className="w-4 h-4 mr-1 text-emerald-400" />
          <span>{t('launchDemo')}</span>
        </Button>

        {/* Guarantee details */}
        <div className="pt-3 border-t border-zinc-900 flex flex-col gap-2 text-xs text-zinc-400 font-sans">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t('trialGuarantee')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t('secureAuth')}</span>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
