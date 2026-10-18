'use client';

import React from 'react';
import { Loader2, Search, Sparkles } from 'lucide-react';
import type {
  ContactMessagePriority,
  ContactMessageStatus,
} from '@/lib/types/databaseTypes';

export interface FilterOption<T> {
  value: T;
  label: string;
}

const STATUS_FILTERS: FilterOption<ContactMessageStatus | 'all'>[] = [
  { value: 'all', label: 'Всички' },
  { value: 'unread', label: 'Непрочетени' },
  { value: 'read', label: 'Прочетени' },
  { value: 'replied', label: 'Отговорени' },
  { value: 'archived', label: 'Архивирани' },
];

const PRIORITY_OPTIONS: FilterOption<ContactMessagePriority | 'all'>[] = [
  { value: 'all', label: 'Всички приоритети' },
  { value: 'urgent', label: '🔴 Спешен (Urgent)' },
  { value: 'high', label: '🟠 Висок (High)' },
  { value: 'normal', label: '🔵 Нормален (Normal)' },
  { value: 'low', label: '⚪ Нисък (Low)' },
];

export interface ContactFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: ContactMessageStatus | 'all';
  onStatusFilterChange: (status: ContactMessageStatus | 'all') => void;
  priorityFilter: ContactMessagePriority | 'all';
  onPriorityFilterChange: (priority: ContactMessagePriority | 'all') => void;
  isSeeding: boolean;
  onSeedSamples: () => void;
}

export const ContactFilterBar: React.FC<ContactFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  isSeeding,
  onSeedSamples,
}) => {
  return (
    <section
      aria-label="Филтри и търсене на запитвания"
      className="rounded-2xl border border-zinc-800 bg-zinc-900/75 p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3"
    >
      <div className="relative flex-1">
        <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Търси по име, имейл, телефон или съдържание..."
          aria-label="Търсене в клиентските запитвания"
          className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-emerald-500/60 focus:outline-none text-xs text-zinc-200 placeholder:text-zinc-600"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
          {STATUS_FILTERS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => onStatusFilterChange(tab.value)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === tab.value
                  ? 'bg-emerald-500/20 text-emerald-300 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <select
          value={priorityFilter}
          onChange={(e) =>
            onPriorityFilterChange(e.target.value as ContactMessagePriority | 'all')
          }
          aria-label="Филтър по приоритет"
          className="rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500/60 cursor-pointer"
        >
          {PRIORITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onSeedSamples}
          disabled={isSeeding}
          aria-label="Добави примерни запитвания за тест на AI Triaging"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSeeding ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          <span>+ Демо запитвания</span>
        </button>
      </div>
    </section>
  );
};
