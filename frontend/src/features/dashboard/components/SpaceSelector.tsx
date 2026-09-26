'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import {
  Home,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import type { Space, StaySettings } from '@/lib/types/databaseTypes';

export interface SpaceSelectorProps {
  spaces: Space[];
  selectedSpaceId: string | null;
  onSelectSpace: (spaceId: string) => void;
  onOpenCreateModal?: () => void;
}

export const SpaceSelector: React.FC<SpaceSelectorProps> = ({
  spaces,
  selectedSpaceId,
  onSelectSpace,
}) => {
  const t = useTranslations('dashboard');

  const getStatusBadge = (status: string | null | undefined) => {
    const current = status || 'trialing';
    switch (current) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{t('billing.activeLabel')}</span>
          </span>
        );
      case 'trialing':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>{t('billing.trialingLabel')}</span>
          </span>
        );
      case 'past_due':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/30 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span>{t('billing.pastDueLabel')}</span>
          </span>
        );
      case 'canceled':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-500/15 text-zinc-400 border border-zinc-500/30 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            <span>{t('billing.canceledLabel')}</span>
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          {t('yourSpaces', { count: spaces.length })}
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
        {spaces.map((space) => {
          const isSelected = space.id === selectedSpaceId;
          const settings = (space.stay_settings || {}) as StaySettings;
          const address = settings.taxiAddress || t('addressNotProvided');

          return (
            <div
              key={space.id}
              role="button"
              tabIndex={0}
              aria-label={t('manageAria', { name: space.name })}
              onClick={() => onSelectSpace(space.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectSpace(space.id);
                }
              }}
              className={`group relative p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 text-left focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                isSelected
                  ? 'bg-zinc-900/90 border-emerald-500/80 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/30'
                  : 'bg-zinc-900/40 border-white/8 hover:border-emerald-500/40 hover:bg-zinc-900/70 hover:shadow-lg hover:shadow-black/40'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-zinc-800 text-zinc-400 group-hover:bg-emerald-500/10 group-hover:text-emerald-400'
                    }`}
                  >
                    <Home className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display text-sm font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-1">
                      {space.name}
                    </h3>
                    <p className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5 line-clamp-1">
                      <MapPin className="w-3 h-3 text-emerald-500/70 shrink-0" />
                      <span>{address}</span>
                    </p>
                  </div>
                </div>

                {isSelected ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{t('statusActive')}</span>
                  </span>
                ) : (
                  getStatusBadge(space.subscription_status)
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] text-zinc-500 gap-2">
                <span className="font-mono text-zinc-400 text-[11px] truncate">
                  /stay/{space.slug}
                </span>

                {/* Open Space Editor */}
                <span className="text-emerald-400 group-hover:text-emerald-300 font-semibold flex items-center gap-0.5 transition-colors text-[11px] shrink-0">
                  <span>{t('manage')}</span>
                  <span className="group-hover:translate-x-0.5 transition-transform">
                    &rarr;
                  </span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
