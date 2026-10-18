'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  loginAdminWithPasswordAction,
  loginAsTestAdminAction,
} from '../actions/adminAuthActions';

export interface AdminLoginCardProps {
  isTestLoginEnabled: boolean;
}

export const AdminLoginCard: React.FC<AdminLoginCardProps> = ({
  isTestLoginEnabled,
}) => {
  const router = useRouter();
  const [email, setEmail] = useState(isTestLoginEnabled ? 'admin' : '');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTestLoading, setIsTestLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleQuickTestLogin = async () => {
    setIsTestLoading(true);
    setErrorMessage(null);
    try {
      const result = await loginAsTestAdminAction();
      if (!result.success) {
        setErrorMessage(result.error || 'Неуспешен вход с тестовия акаунт.');
        setIsTestLoading(false);
        return;
      }
      router.push('/admin');
      router.refresh();
    } catch {
      setErrorMessage('Възникна неочаквана грешка при бързия вход.');
      setIsTestLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await loginAdminWithPasswordAction(email, password);
      if (!result.success) {
        setErrorMessage(result.error || 'Невалидни данни за вход.');
        setIsSubmitting(false);
        return;
      }
      router.push('/admin');
      router.refresh();
    } catch {
      setErrorMessage('Системна грешка при проверка на данните.');
      setIsSubmitting(false);
    }
  };

  return (
    <main className='min-h-dvh bg-[#07070a] text-zinc-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden'>
      {/* Ambient Background Glow */}
      <div
        className='pointer-events-none absolute -top-36 left-1/2 -translate-x-1/2 w-140 h-85 rounded-full bg-emerald-500/12 blur-[120px]'
        aria-hidden='true'
      />

      <div className='w-full max-w-md relative z-10'>
        <div className='mb-6'>
          <Link
            href='/'
            aria-label='Обратно към началната страница'
            className='inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-emerald-400 transition-colors cursor-pointer'
          >
            <ArrowLeft className='w-3.5 h-3.5' />
            <span>Обратно към SmartScan Stay</span>
          </Link>
        </div>

        <section
          aria-label='Вход в Административния Панел'
          className='rounded-3xl border border-emerald-500/25 bg-linear-to-b from-zinc-900/90 via-[#0c0c12] to-[#08080c] p-7 sm:p-9 shadow-2xl shadow-black/80'
        >
          {/* Header */}
          <div className='flex items-center justify-between mb-6'>
            <div className='flex items-center gap-3'>
              <div className='h-11 w-11 rounded-2xl bg-linear-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20'>
                <ShieldCheck className='w-6 h-6 text-zinc-950' />
              </div>
              <div>
                <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'>
                  Owner Control Plane
                </span>
                <h1 className='text-xl font-bold text-white tracking-tight mt-1'>
                  SmartScan Админ Панел
                </h1>
              </div>
            </div>
          </div>

          <p className='text-xs text-zinc-400 leading-relaxed mb-6'>
            Централизирано управление на запитвания, AI Triaging (Gemini Flash),
            клиентска директория на хазяите и KPI аналитика.
          </p>

          {errorMessage && (
            <div
              role='alert'
              className='mb-5 flex items-start gap-2.5 rounded-xl bg-red-950/70 border border-red-500/35 p-3.5 text-xs text-red-200'
            >
              <AlertCircle className='w-4 h-4 text-red-400 shrink-0 mt-0.5' />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1-Click Easy Test Admin Login */}
          {isTestLoginEnabled && (
            <div className='mb-6 rounded-2xl border border-emerald-500/30 bg-linear-to-br from-emerald-500/12 via-teal-500/5 to-transparent p-4'>
              <div className='flex items-center justify-between mb-2'>
                <span className='inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300'>
                  <Sparkles className='w-3.5 h-3.5 text-emerald-400' />
                  Тестов Админ Акаунт (Бърз достъп)
                </span>
                <span className='text-[10px] font-mono text-emerald-400 bg-zinc-900/90 px-2 py-0.5 rounded-md border border-emerald-500/30'>
                  admin / admin
                </span>
              </div>
              <p className='text-[11px] text-zinc-400 mb-3 leading-relaxed'>
                Автоматично инициализира тестовия администраторски профил в
                базата и отваря контролния панел с един клик.
              </p>
              <button
                type='button'
                onClick={handleQuickTestLogin}
                disabled={isTestLoading || isSubmitting}
                aria-label='Бърз вход с тестов админ акаунт'
                className='w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 px-4 bg-linear-to-r from-emerald-400 to-teal-500 text-zinc-950 font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer shadow-lg shadow-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60'
              >
                {isTestLoading ? (
                  <Loader2 className='w-4 h-4 animate-spin text-zinc-950' />
                ) : (
                  <Zap className='w-4 h-4 fill-zinc-950 text-zinc-950' />
                )}
                <span>
                  {isTestLoading
                    ? 'Влизане в Админ Панела...'
                    : '⚡ Вход с Тестов Админ (1-Клик)'}
                </span>
              </button>
            </div>
          )}

          <div className='relative flex py-2 items-center mb-5'>
            <div className='grow border-t border-zinc-800/80' />
            <span className='shrink mx-3 text-[10px] uppercase tracking-widest text-zinc-500 font-semibold'>
              или вход с парола
            </span>
            <div className='grow border-t border-zinc-800/80' />
          </div>

          {/* Standard Credentials Form */}
          <form onSubmit={handlePasswordSubmit} className='space-y-4'>
            <div>
              <label
                htmlFor='admin-email'
                className='block text-xs font-medium text-zinc-300 mb-1.5'
              >
                Администраторски имейл
              </label>
              <div className='relative'>
                <Mail className='w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2' />
                <input
                  id='admin-email'
                  type='text'
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder='admin'
                  className='w-full rounded-xl bg-zinc-950/90 border border-zinc-800 focus:border-emerald-500/60 focus:outline-none pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-600 transition-colors'
                />
              </div>
            </div>

            <div>
              <label
                htmlFor='admin-password'
                className='block text-xs font-medium text-zinc-300 mb-1.5'
              >
                Парола
              </label>
              <div className='relative'>
                <Lock className='w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2' />
                <input
                  id='admin-password'
                  type='password'
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder='••••••••••••'
                  className='w-full rounded-xl bg-zinc-950/90 border border-zinc-800 focus:border-emerald-500/60 focus:outline-none pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-600 transition-colors'
                />
              </div>
            </div>

            <button
              type='submit'
              disabled={isSubmitting || isTestLoading}
              aria-label='Вход с имейл и парола'
              className='w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 px-4 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-sm transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60'
            >
              {isSubmitting ? (
                <Loader2 className='w-4 h-4 animate-spin text-zinc-950' />
              ) : (
                <KeyRound className='w-4 h-4 text-zinc-950' />
              )}
              <span>
                {isSubmitting ? 'Проверка...' : 'Вход в Контролния Панел'}
              </span>
            </button>
          </form>

          <div className='mt-6 pt-4 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500'>
            <span>Защитено с RBAC & DAL проверка</span>
            <Link
              href='/dashboard'
              className='text-zinc-400 hover:text-emerald-400 transition-colors cursor-pointer'
            >
              Към Хазяин Табло →
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
};
