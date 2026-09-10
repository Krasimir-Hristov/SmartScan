'use client';

import React from 'react';
import { locales } from '@/lib/i18n/config';
import { QrCode, Globe } from 'lucide-react';

export const LandingFooter: React.FC = () => {
  return (
    <footer className="border-t border-zinc-900 bg-zinc-950 py-12 text-zinc-400">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* 10 Tourism Markets Polyglot Bar */}
        <div className="pb-8 border-b border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
            <Globe className="w-4 h-4 text-emerald-400" />
            <span>Supported Tourism Markets:</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {locales.map((l) => (
              <span
                key={l.code}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300"
              >
                <span>{l.flag}</span>
                <span className="uppercase font-medium">{l.code}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Main Footer Row */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <QrCode className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">SmartScan Stay</p>
              <p className="text-xs text-zinc-400">
                Next-Gen AI Guest Concierge for Luxury Vacation Rentals
              </p>
            </div>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-400">
            <a href="#overview" className="hover:text-emerald-400 transition-colors cursor-pointer">
              Overview
            </a>
            <a href="#how-it-works" className="hover:text-emerald-400 transition-colors cursor-pointer">
              How It Works
            </a>
            <a href="#pricing" className="hover:text-emerald-400 transition-colors cursor-pointer">
              Pricing
            </a>
            <a href="#reviews" className="hover:text-emerald-400 transition-colors cursor-pointer">
              Reviews
            </a>
            <span className="text-zinc-700">|</span>
            <a href="#privacy" className="hover:text-white transition-colors cursor-pointer">
              Privacy Policy
            </a>
            <a href="#terms" className="hover:text-white transition-colors cursor-pointer">
              Terms of Service
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-6 border-t border-zinc-900/60 text-center text-xs text-zinc-400">
          © {new Date().getFullYear()} SmartScan Stay. All rights reserved. Zero-Empty-States Hospitality Standard.
        </div>
      </div>
    </footer>
  );
};
