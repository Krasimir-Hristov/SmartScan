'use client';

import React from 'react';
import {
  ArrowUpRight,
  Building2,
  CreditCard,
  Inbox,
  MessageSquare,
  QrCode,
  Sparkles,
  Users,
} from 'lucide-react';
import type { ContactMessage } from '@/lib/types/databaseTypes';
import type {
  AdminHostDirectoryItem,
  AdminKpiMetrics,
  AdminTabId,
} from '../types/adminTypes';

export interface AdminKpiGridProps {
  kpis: AdminKpiMetrics;
  recentContacts: ContactMessage[];
  recentHosts: AdminHostDirectoryItem[];
  onNavigateTab: (tab: AdminTabId) => void;
  onSelectContact: (contactId: string) => void;
}

export const AdminKpiGrid: React.FC<AdminKpiGridProps> = ({
  kpis,
  recentContacts,
  recentHosts,
  onNavigateTab,
  onSelectContact,
}) => {
  return (
    <div className="space-y-8">
      {/* Top 4 Primary KPI Cards */}
      <section
        aria-label="Основни показатели за ефективност"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* Card 1: MRR & Subscriptions */}
        <article className="rounded-2xl border border-emerald-500/25 bg-linear-to-br from-emerald-950/35 via-zinc-900/90 to-zinc-950 p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Месечен Приход (MRR)
            </span>
            <div className="h-9 w-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">
            €{kpis.estimatedMrrEur.toFixed(2)}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
            <span className="text-emerald-300 font-semibold">
              {kpis.activePaidSpaces} активни
            </span>
            <span>•</span>
            <span>{kpis.trialSpaces} в Trial (€9.99/мес)</span>
          </div>
        </article>

        {/* Card 2: Hosts & Spaces */}
        <article className="rounded-2xl border border-zinc-800 bg-zinc-900/75 p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Хазяи & Пространства
            </span>
            <div className="h-9 w-9 rounded-xl bg-teal-500/10 border border-teal-500/25 flex items-center justify-center">
              <Users className="w-4 h-4 text-teal-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">
            {kpis.totalHosts}{' '}
            <span className="text-base font-normal text-zinc-400">
              хазяи / {kpis.totalSpaces} обекта
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-zinc-400">
            <span>{kpis.pausedOrCanceledSpaces} паузирани / отказани</span>
            <button
              type="button"
              onClick={() => onNavigateTab('hosts')}
              aria-label="Преглед на всички хазяи"
              className="text-emerald-400 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
            >
              Директория <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </article>

        {/* Card 3: QR Scans & AI Concierge */}
        <article className="rounded-2xl border border-zinc-800 bg-zinc-900/75 p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              AI Консиерж & RAG Знания
            </span>
            <div className="h-9 w-9 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center">
              <QrCode className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">
            {kpis.totalKnowledgeChunks}{' '}
            <span className="text-base font-normal text-zinc-400">
              векторни карти
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
            <span>{kpis.totalQrScans} QR сканирания</span>
            <span>•</span>
            <span className="text-cyan-300 font-medium">
              {kpis.autoResolvedRatePercent}% AI решение
            </span>
          </div>
        </article>

        {/* Card 4: Contact Inquiries & AI Triage */}
        <article className="rounded-2xl border border-zinc-800 bg-zinc-900/75 p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Запитвания & AI Triage
            </span>
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center">
              <Inbox className="w-4 h-4 text-amber-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">
            {kpis.unreadInquiries}{' '}
            <span className="text-base font-normal text-zinc-400">
              непрочетени от {kpis.totalInquiries}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-zinc-400">
            <span className={kpis.urgentInquiries > 0 ? 'text-red-400 font-semibold' : ''}>
              {kpis.urgentInquiries} спешни • {kpis.repliedInquiries} отговорени
            </span>
            <button
              type="button"
              onClick={() => onNavigateTab('contacts')}
              aria-label="Отвори кутията със запитвания"
              className="text-emerald-400 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
            >
              Отвори <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </article>
      </section>

      {/* Bottom Two-Column Quick Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Contact Inquiries with AI Summaries */}
        <section
          aria-label="Последни запитвания от клиенти"
          className="rounded-2xl border border-zinc-800/90 bg-zinc-900/60 p-6 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold text-white">
                  Последни клиентски запитвания (AI Triaging)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('contacts')}
                aria-label="Виж всички запитвания"
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
              >
                Всички ({kpis.totalInquiries}) →
              </button>
            </div>

            {recentContacts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-center text-xs text-zinc-500">
                Все още няма получени запитвания. В таб „Запитвания“ можеш да заредиш
                примерни съобщения за тест на AI анализатора с 1 клик.
              </div>
            ) : (
              <div className="space-y-3">
                {recentContacts.slice(0, 4).map((msg) => (
                  <button
                    key={msg.id}
                    type="button"
                    onClick={() => {
                      onSelectContact(msg.id);
                      onNavigateTab('contacts');
                    }}
                    aria-label={`Отвори запитване от ${msg.name}`}
                    className="w-full text-left rounded-xl border border-zinc-800/90 hover:border-emerald-500/40 bg-zinc-950/70 p-3.5 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold text-white group-hover:text-emerald-300 transition-colors">
                        {msg.name}{' '}
                        <span className="font-normal text-zinc-500">({msg.email})</span>
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          msg.priority === 'urgent'
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : msg.status === 'unread'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {msg.status}
                      </span>
                    </div>
                    {msg.ai_summary ? (
                      <p className="text-xs text-emerald-300/90 flex items-start gap-1.5 line-clamp-2">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{msg.ai_summary}</span>
                      </p>
                    ) : (
                      <p className="text-xs text-zinc-400 line-clamp-1">{msg.message}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Recent Hosts & Properties */}
        <section
          aria-label="Последно регистрирани хазяи"
          className="rounded-2xl border border-zinc-800/90 bg-zinc-900/60 p-6 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-teal-400" />
                <h2 className="text-sm font-bold text-white">
                  Последно регистрирани хазяи & обекти
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('hosts')}
                aria-label="Виж всички хазяи"
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
              >
                Всички ({kpis.totalHosts}) →
              </button>
            </div>

            {recentHosts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-center text-xs text-zinc-500">
                Няма открити хазяи в базата данни.
              </div>
            ) : (
              <div className="space-y-3">
                {recentHosts.slice(0, 4).map((host) => (
                  <div
                    key={host.id}
                    className="rounded-xl border border-zinc-800/90 bg-zinc-950/70 p-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white truncate">
                          {host.fullName || host.email}
                        </span>
                        {host.isPlatformAdmin && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 truncate font-mono mt-0.5">
                        {host.email}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-800 text-zinc-200">
                        {host.spaces.length} обекта
                      </span>
                      <p className="text-[10px] text-zinc-500 mt-1">
                        {host.isTrialOpen ? '🟢 Активен Trial' : 'Стандарт'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
