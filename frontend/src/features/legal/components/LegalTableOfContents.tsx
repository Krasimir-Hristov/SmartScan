'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { ListOrdered } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LegalClause } from '../types/legalTypes';

export interface LegalTableOfContentsProps {
  clauses: LegalClause[];
  activeId: string;
  onSelectClause: (id: string) => void;
}

export const LegalTableOfContents: React.FC<LegalTableOfContentsProps> = ({
  clauses,
  activeId,
  onSelectClause,
}) => {
  const tLegal = useTranslations('legal');

  return (
    <aside
      className="hidden lg:block w-72 shrink-0"
      aria-label="Table of Contents"
    >
      <div className="sticky top-26 rounded-2xl bg-[#121216]/80 border border-white/5 p-4 backdrop-blur-md shadow-xl shadow-black/30">
        <div className="flex items-center gap-2 pb-3 mb-3 border-b border-zinc-800 text-xs font-bold text-zinc-300 font-display uppercase tracking-wider">
          <ListOrdered className="w-4 h-4 text-emerald-400" />
          <span>{tLegal('tableOfContents')}</span>
        </div>

        <nav className="flex flex-col gap-1 max-h-[calc(100vh-12rem)] overflow-y-auto pr-1">
          {clauses.map((clause) => {
            const isActive = activeId === clause.id;
            return (
              <button
                key={clause.id}
                type="button"
                onClick={() => onSelectClause(clause.id)}
                aria-current={isActive ? 'true' : undefined}
                className={cn(
                  'group flex items-start gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs transition-all cursor-pointer',
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-300 font-bold border border-emerald-500/25'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                )}
              >
                <span
                  className={cn(
                    'font-mono text-[11px] font-semibold shrink-0 transition-colors',
                    isActive
                      ? 'text-emerald-400'
                      : 'text-zinc-500 group-hover:text-zinc-400'
                  )}
                >
                  {clause.number}.
                </span>
                <span className="line-clamp-2 leading-tight">
                  {clause.title}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};
