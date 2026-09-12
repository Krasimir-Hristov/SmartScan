'use client';

import React from 'react';
import { QrCode, ExternalLink, Wifi, Globe, ShieldCheck } from 'lucide-react';
import type { PropertySummary } from '../types/dashboard.types';

export interface PropertyCardProps {
  property?: PropertySummary;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property = {
    id: 'prop-1',
    name: 'Вила 1904 Светилище',
    location: 'Миконос, Гърция',
    slug: 'sanctuary-demo',
    status: 'active',
    languagesCount: 50,
    wifiName: 'Sanctuary_5G',
    todayScans: 28,
  },
}) => {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-linear-to-b from-zinc-900/90 via-zinc-950/90 to-zinc-950 border border-emerald-500/25 p-6 sm:p-8 shadow-xl shadow-emerald-950/20">
      {/* Ambient background glow */}
      <div
        className="pointer-events-none absolute -top-24 -left-24 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-white/5">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-400 to-teal-600 text-zinc-950 shadow-md shadow-emerald-500/25">
            <QrCode className="h-7 w-7" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-display text-xl font-bold tracking-tight text-white">
                {property.name}
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Активен
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-sans">
              {property.location} · <span className="font-mono text-emerald-400">/stay/{property.slug}</span>
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.open(`/stay/${property.slug}`, '_blank')}
            aria-label="Отвори мобилния наръчник за гости"
            className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 transition-all cursor-pointer shadow-md shadow-emerald-500/20 font-sans"
          >
            <span>Гост изглед</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Property Details Grid */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 text-xs">
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-zinc-900/60 border border-white/5">
          <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="flex flex-col">
            <span className="text-zinc-500 text-[10px]">Wi-Fi мрежа</span>
            <span className="font-semibold text-zinc-200 font-mono">{property.wifiName}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-zinc-900/60 border border-white/5">
          <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="flex flex-col">
            <span className="text-zinc-500 text-[10px]">AI Полиглот</span>
            <span className="font-semibold text-zinc-200">{property.languagesCount}+ езика активни</span>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-zinc-900/60 border border-white/5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="flex flex-col">
            <span className="text-zinc-500 text-[10px]">Акрилен плакет</span>
            <span className="font-semibold text-zinc-200">A5/A6 300 DPI готов</span>
          </div>
        </div>
      </div>
    </div>
  );
};
