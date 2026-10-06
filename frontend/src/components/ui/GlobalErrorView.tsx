'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export interface GlobalErrorViewProps {
  reset: () => void;
}

const MESSAGES: Record<
  string,
  {
    title: string;
    desc: string;
    retry: string;
    retryAria: string;
    home: string;
    homeAria: string;
    badge: string;
    roleAria: string;
  }
> = {
  bg: {
    title: 'Възникна временна грешка',
    desc: 'Не се притеснявайте, данните ви са в безопасност. Моля, опитайте да презаредите или се върнете към началото.',
    retry: 'Презареди',
    retryAria: 'Презареди страницата',
    home: 'Начало',
    homeAria: 'Към началната страница',
    badge: 'SmartScan Stay · 500',
    roleAria: 'Критична системна грешка',
  },
  en: {
    title: 'Something went wrong',
    desc: "Don't worry, your data is safe. Please try refreshing the page or return to the home screen.",
    retry: 'Try again',
    retryAria: 'Try refreshing page',
    home: 'Home',
    homeAria: 'Back to Home',
    badge: 'SmartScan Stay · 500',
    roleAria: 'Critical System Error',
  },
};

const getClientLocale = (): string => {
  if (typeof document === 'undefined') return 'bg';
  const match = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
  const detected = match ? decodeURIComponent(match[1]).toLowerCase() : 'bg';
  return detected === 'en' ? 'en' : 'bg';
};

const subscribe = () => () => {};
const getSnapshot = () => getClientLocale();
const getServerSnapshot = () => 'bg';

export const GlobalErrorView: React.FC<GlobalErrorViewProps> = ({ reset }) => {
  const locale = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const copy = MESSAGES[locale] ?? MESSAGES.bg;

  return (
    <html lang={locale} className="dark h-full">
      <body className="min-h-full flex items-center justify-center bg-[#09090b] text-zinc-100 p-4 font-sans antialiased">
        <main
          role="alert"
          aria-label={copy.roleAria}
          className="w-full max-w-md mx-auto text-center"
        >
          <div className="rounded-3xl p-8 bg-zinc-900/80 border border-white/10 backdrop-blur-xl shadow-2xl relative overflow-hidden">
            {/* Ambient emerald backlight glow */}
            <div
              className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none"
              aria-hidden="true"
            />

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 shadow-inner">
                <AlertTriangle className="w-8 h-8" aria-hidden="true" />
              </div>

              <span className="text-xs uppercase font-mono tracking-widest text-emerald-400/80 mb-2">
                {copy.badge}
              </span>

              <h1 className="text-2xl font-bold tracking-tight text-white mb-3">
                {copy.title}
              </h1>

              <p className="text-sm text-zinc-400 leading-relaxed mb-8">
                {copy.desc}
              </p>

              <div className="w-full flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={() => reset()}
                  aria-label={copy.retryAria}
                  className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-linear-to-r from-emerald-500 to-teal-600 text-zinc-950 font-semibold text-sm hover:from-emerald-400 hover:to-teal-500 active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                  <span>{copy.retry}</span>
                </button>

                <Link
                  href="/"
                  aria-label={copy.homeAria}
                  className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 font-medium text-sm transition-all cursor-pointer"
                >
                  <Home className="w-4 h-4" aria-hidden="true" />
                  <span>{copy.home}</span>
                </Link>
              </div>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
};
