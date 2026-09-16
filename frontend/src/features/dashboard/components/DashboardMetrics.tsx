'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Home, QrCode, Sparkles } from 'lucide-react';
import type { MetricItem } from '../types/dashboardTypes';

export interface DashboardMetricsProps {
  activeSpacesCount?: number;
}

export const DashboardMetrics: React.FC<DashboardMetricsProps> = ({
  activeSpacesCount = 1,
}) => {
  const t = useTranslations('dashboard');

  const metrics: MetricItem[] = [
    {
      id: 'active-spaces',
      label: t('activeSpaces'),
      value: String(activeSpacesCount),
      subtext: t('activeSpacesSub'),
      trend: t('activeSpacesTrend'),
    },
    {
      id: 'qr-scans',
      label: t('qrScansToday'),
      value: '28',
      subtext: t('qrScansTodaySub'),
      trend: t('qrScansTodayTrend'),
    },
    {
      id: 'ai-resolution',
      label: t('aiAutoResolution'),
      value: '100%',
      subtext: t('aiAutoResolutionSub'),
      trend: t('aiAutoResolutionTrend'),
    },
  ];

  const getIcon = (id: string) => {
    switch (id) {
      case 'active-spaces':
        return <Home className="w-4 h-4 text-emerald-400" />;
      case 'qr-scans':
        return <QrCode className="w-4 h-4 text-emerald-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {metrics.map((metric) => (
        <div
          key={metric.id}
          className="relative overflow-hidden rounded-2xl bg-linear-to-b from-zinc-900/80 to-zinc-950/90 border border-emerald-500/20 p-5 shadow-lg shadow-emerald-950/20"
        >
          {/* Ambient glow */}
          <div
            className="pointer-events-none absolute -top-8 -right-8 w-24 h-24 rounded-full bg-emerald-500/10 blur-xl"
            aria-hidden="true"
          />

          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-400">
              {metric.label}
            </span>
            <div className="p-2 rounded-xl bg-zinc-900 border border-white/10">
              {getIcon(metric.id)}
            </div>
          </div>

          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-display text-3xl font-bold tracking-tight text-white">
              {metric.value}
            </span>
            {metric.trend && (
              <span className="text-[11px] font-semibold text-emerald-400 font-mono">
                {metric.trend}
              </span>
            )}
          </div>

          <p className="text-xs text-zinc-400">
            {metric.subtext}
          </p>
        </div>
      ))}
    </div>
  );
};
