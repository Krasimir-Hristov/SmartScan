'use client';

import React from 'react';
import { Trash2 } from 'lucide-react';
import type { ContactMessage } from '@/lib/types/databaseTypes';

export interface ContactInquiryListItemProps {
  item: ContactMessage;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onRequestDelete: (item: ContactMessage) => void;
}

export const ContactInquiryListItem: React.FC<ContactInquiryListItemProps> = ({
  item,
  isSelected,
  onSelect,
  onRequestDelete,
}) => {
  return (
    <div
      className={`group relative rounded-2xl border transition-all ${
        isSelected
          ? 'border-emerald-500/60 bg-emerald-950/20 shadow-lg shadow-emerald-950/30'
          : 'border-zinc-800/90 bg-zinc-900/60 hover:border-zinc-700'
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect(item.id)}
        aria-label={`Избери запитване от ${item.name}`}
        className="w-full text-left p-4 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-2xl"
      >
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-xs sm:text-sm font-bold text-white truncate">
            {item.name}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {item.priority === 'urgent' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-500/20 text-red-300 border border-red-500/40 shadow-xs">
                Urgent
              </span>
            )}
            {item.priority === 'high' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                High
              </span>
            )}
            {item.priority === 'normal' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium uppercase bg-blue-500/15 text-blue-300 border border-blue-500/30">
                Normal
              </span>
            )}
            {item.priority === 'low' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium uppercase bg-zinc-800 text-zinc-400 border border-zinc-700">
                Low
              </span>
            )}
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                item.status === 'unread'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/35'
                  : item.status === 'replied'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/35'
                    : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {item.status}
            </span>
          </div>
        </div>

        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
          {item.ai_summary || item.message}
        </p>

        <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500">
          <span className="truncate">{item.email}</span>
          <span>
            {new Date(item.created_at).toLocaleDateString('bg-BG', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Europe/Sofia',
            })}
          </span>
        </div>
      </button>

      {/* Sibling Delete Button */}
      <div className="absolute right-3 bottom-2 flex items-center">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRequestDelete(item);
          }}
          aria-label={`Изтрий запитването от ${item.name}`}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
