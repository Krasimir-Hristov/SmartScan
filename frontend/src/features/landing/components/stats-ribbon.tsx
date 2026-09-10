'use client';

import React from 'react';
import type { MetricItem } from '../types/landing.types';

const metrics: MetricItem[] = [
  {
    value: '86.4%',
    label: 'Auto-Resolution',
    sublabel: 'Zero host intervention needed',
  },
  {
    value: '< 1.2s',
    label: 'Response Velocity',
    sublabel: 'Sub-second streaming answers',
  },
  {
    value: '50+',
    label: 'Native Languages',
    sublabel: 'Auto-detected for guests',
  },
  {
    value: '60 Sec',
    label: 'Setup Timing',
    sublabel: 'Voice notes to published guide',
  },
];

export const StatsRibbon: React.FC = () => {
  return (
    <section className="py-10 border-y border-zinc-900 bg-zinc-950/60" aria-label="Key Performance Metrics">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="flex flex-col items-center text-center p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 hover:border-emerald-500/30 transition-colors"
            >
              <span className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-emerald-400 to-teal-300 tracking-tight">
                {metric.value}
              </span>
              <span className="mt-2 text-sm sm:text-base font-semibold text-zinc-100">
                {metric.label}
              </span>
              <span className="mt-0.5 text-xs text-zinc-400">
                {metric.sublabel}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
