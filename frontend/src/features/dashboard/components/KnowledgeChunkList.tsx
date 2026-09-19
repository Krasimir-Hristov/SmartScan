'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import {
  BookOpen,
  Trash2,
  Tag,
  Loader2,
  Flame,
  Car,
  Utensils,
  ShieldCheck,
} from 'lucide-react';
import type { KnowledgeChunk } from '@/lib/types/databaseTypes';

export interface KnowledgeChunkListProps {
  chunks: KnowledgeChunk[];
  deletingId: string | null;
  onDeleteChunk: (chunkId: string) => Promise<void>;
}

export const KnowledgeChunkList: React.FC<KnowledgeChunkListProps> = ({
  chunks,
  deletingId,
  onDeleteChunk,
}) => {
  const t = useTranslations('dashboard');

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'appliances':
        return <Flame className="w-3.5 h-3.5 text-amber-400" />;
      case 'parking':
        return <Car className="w-3.5 h-3.5 text-blue-400" />;
      case 'recommendations':
        return <Utensils className="w-3.5 h-3.5 text-rose-400" />;
      case 'rules':
        return <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Tag className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  if (chunks.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-zinc-900/40 border border-dashed border-white/10 text-center flex flex-col items-center gap-2 text-zinc-500 text-xs">
        <BookOpen className="w-5 h-5 text-zinc-600" />
        <p>{t('noCards')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 max-h-[360px] overflow-y-auto pr-1">
      {chunks.map((chunk) => (
        <div
          key={chunk.id}
          className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/8 hover:border-white/15 flex flex-col gap-1.5 transition-colors group"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {getCategoryIcon(chunk.category)}
              <span className="text-xs font-semibold text-white">
                {chunk.title}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onDeleteChunk(chunk.id)}
              disabled={deletingId === chunk.id}
              aria-label={t('deleteCard')}
              className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              {deletingId === chunk.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            {chunk.content}
          </p>
        </div>
      ))}
    </div>
  );
};
