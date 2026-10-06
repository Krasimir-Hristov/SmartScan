'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export interface GlobalErrorViewProps {
  reset: () => void;
}

export const GlobalErrorView: React.FC<GlobalErrorViewProps> = ({ reset }) => {
  return (
    <html lang="en" className="dark h-full">
      <body className="min-h-full flex items-center justify-center bg-[#09090b] text-zinc-100 p-4 font-sans antialiased">
        <main
          role="alert"
          aria-label="Critical System Error"
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
                SmartScan Stay · 500
              </span>

              <h1 className="text-2xl font-bold tracking-tight text-white mb-3">
                Възникна временна грешка
              </h1>

              <p className="text-sm text-zinc-400 leading-relaxed mb-8">
                Не се притеснявайте, данните ви са в безопасност. Моля, опитайте да презаредите или се върнете към началото.
                <br />
                <span className="text-xs text-zinc-500 block mt-2">
                  Something went wrong. Please try refreshing or return home.
                </span>
              </p>

              <div className="w-full flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={() => reset()}
                  aria-label="Опитай отново / Try again"
                  className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-linear-to-r from-emerald-500 to-teal-600 text-zinc-950 font-semibold text-sm hover:from-emerald-400 hover:to-teal-500 active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                  <span>Презареди</span>
                </button>

                <Link
                  href="/"
                  aria-label="Към началната страница / Return to Home"
                  className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 font-medium text-sm transition-all cursor-pointer"
                >
                  <Home className="w-4 h-4" aria-hidden="true" />
                  <span>Начало</span>
                </Link>
              </div>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
};
