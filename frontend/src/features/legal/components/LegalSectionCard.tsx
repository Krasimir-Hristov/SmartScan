'use client';

import React from 'react';
import { ShieldCheck, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LegalClause } from '../types/legalTypes';

export interface LegalSectionCardProps {
  clause: LegalClause;
}

export const LegalSectionCard: React.FC<LegalSectionCardProps> = ({
  clause,
}) => {
  return (
    <article
      id={clause.id}
      className="scroll-mt-26 rounded-2xl bg-[#121216] border border-white/5 p-6 sm:p-8 shadow-xl shadow-black/20 transition-all hover:border-emerald-500/20"
    >
      {/* Clause Header with Number Badge */}
      <header className="flex items-baseline gap-3 mb-4 pb-3 border-b border-zinc-900">
        <span className="font-mono text-sm font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-lg shrink-0">
          {clause.number}
        </span>
        <h2 className="text-lg sm:text-xl font-bold text-white font-display tracking-tight">
          {clause.title}
        </h2>
      </header>

      {/* Body Paragraphs */}
      <div className="flex flex-col gap-3.5 text-zinc-300 text-sm sm:text-base font-sans leading-relaxed">
        {clause.paragraphs.map((para, idx) => (
          <p key={idx}>{para}</p>
        ))}
      </div>

      {/* Bullet Points */}
      {clause.bulletPoints && clause.bulletPoints.length > 0 && (
        <ul className="mt-4 pt-3 border-t border-zinc-900/60 flex flex-col gap-2.5">
          {clause.bulletPoints.map((point, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-300"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Callout Card */}
      {clause.callout && (
        <div
          className={cn(
            'mt-5 p-4 rounded-xl border flex items-start gap-3 text-xs sm:text-sm leading-relaxed',
            clause.callout.type === 'shield' &&
              'bg-emerald-950/20 border-emerald-500/30 text-emerald-200',
            clause.callout.type === 'warning' &&
              'bg-amber-950/20 border-amber-500/30 text-amber-200',
            clause.callout.type === 'info' &&
              'bg-blue-950/20 border-blue-500/30 text-blue-200'
          )}
        >
          {clause.callout.type === 'shield' && (
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          )}
          {clause.callout.type === 'warning' && (
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          )}
          {clause.callout.type === 'info' && (
            <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          )}
          <div className="flex flex-col gap-1">
            {clause.callout.title && (
              <span className="font-bold uppercase tracking-wider font-display text-[11px]">
                {clause.callout.title}
              </span>
            )}
            <p className="font-sans text-xs text-zinc-300">
              {clause.callout.text}
            </p>
          </div>
        </div>
      )}
    </article>
  );
};
