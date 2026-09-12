'use client';

import React from 'react';
import { Home, QrCode, Sparkles } from 'lucide-react';
import type { MetricItem } from '../types/dashboard.types';

export const DashboardMetrics: React.FC = () => {
  const metrics: MetricItem[] = [
    {
      id: 'active-spaces',
      label: 'Активни пространства',
      value: '1',
      subtext: 'Вила 1904 Светилище',
      trend: 'Онлайн 24/7',
    },
    {
      id: 'qr-scans',
      label: 'QR Сканирания днес',
      value: '28',
      subtext: 'Всички стаи и трапезария',
      trend: '+14% спрямо вчера',
    },
    {
      id: 'ai-resolution',
      label: 'AI Авто-разрешаване',
      value: '100%',
      subtext: '34 въпроса отговорени без обаждане',
      trend: '0 пропуснати обаждания',
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
