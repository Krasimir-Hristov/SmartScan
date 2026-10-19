'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  CalendarPlus,
  ExternalLink,
  Loader2,
  Power,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  extendHostTrialAction,
  toggleSpaceActiveAdminAction,
} from '../actions/adminHostActions';
import type { AdminHostDirectoryItem } from '../types/adminTypes';

export interface AdminHostsViewProps {
  hosts: AdminHostDirectoryItem[];
  onRefreshRequested: () => void;
}

export const AdminHostsView: React.FC<AdminHostsViewProps> = ({
  hosts,
  onRefreshRequested,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingHostId, setLoadingHostId] = useState<string | null>(null);
  const [loadingSpaceId, setLoadingSpaceId] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const filteredHosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return hosts;
    return hosts.filter(
      (h) =>
        h.email.toLowerCase().includes(q) ||
        (h.fullName || '').toLowerCase().includes(q) ||
        (h.stripeCustomerId || '').toLowerCase().includes(q) ||
        h.spaces.some(
          (s) =>
            s.name.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q)
        )
    );
  }, [hosts, searchQuery]);

  const handleExtendTrial = async (hostId: string, email: string) => {
    setLoadingHostId(hostId);
    setStatusNotice(null);
    try {
      const res = await extendHostTrialAction(hostId, 7);
      if (res.success) {
        setStatusNotice(`✓ Пробният период на ${email} беше удължен със +7 дни.`);
        onRefreshRequested();
      } else {
        setStatusNotice(`Грешка: ${res.error || 'Неуспешно удължаване на пробния период.'}`);
      }
    } catch {
      setStatusNotice('Системна грешка при удължаване на пробния период.');
    } finally {
      setLoadingHostId(null);
    }
  };

  const handleToggleSpace = async (spaceId: string, currentActive: boolean) => {
    setLoadingSpaceId(spaceId);
    setStatusNotice(null);
    try {
      const res = await toggleSpaceActiveAdminAction(spaceId, !currentActive);
      if (res.success) {
        setStatusNotice(
          `✓ Статусът на обекта беше променен на ${!currentActive ? 'Активен' : 'Паузиран'}.`
        );
        onRefreshRequested();
      } else {
        setStatusNotice(`Грешка: ${res.error || 'Неуспешна промяна на обекта.'}`);
      }
    } catch {
      setStatusNotice('Системна грешка при промяна на обекта.');
    } finally {
      setLoadingSpaceId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Search & Summary Bar */}
      <section
        aria-label="Търсене в директорията на хазяите"
        className="rounded-2xl border border-zinc-800 bg-zinc-900/75 p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4"
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Търсене по имейл на хазяин, име или slug на обект"
            placeholder="Търси по имейл на хазяин, име, Stripe ID или обект..."
            className="w-full rounded-xl bg-zinc-950 border border-zinc-800 focus:border-emerald-500/60 focus:outline-none pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder:text-zinc-500"
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-zinc-400 shrink-0">
          <Users className="w-4 h-4 text-emerald-400" />
          <span>
            Показани <strong className="text-white">{filteredHosts.filter((h) => !h.isTestAdmin).length}</strong> клиентски хазяи
            {filteredHosts.some((h) => h.isTestAdmin) && (
              <span className="text-zinc-500 font-mono text-[11px] ml-1">
                (+1 тестов админ профил)
              </span>
            )}
          </span>
        </div>
      </section>

      {statusNotice && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/60 px-4 py-2.5 text-xs font-medium text-emerald-200">
          {statusNotice}
        </div>
      )}

      {filteredHosts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 p-12 text-center text-xs text-zinc-500">
          Няма намерени хазяи или обекти по зададеното търсене.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredHosts.map((host) => (
            <article
              key={host.id}
              className={`rounded-2xl border p-5 space-y-4 ${
                host.isTestAdmin
                  ? 'border-emerald-500/30 bg-emerald-950/10'
                  : 'border-zinc-800/90 bg-zinc-900/65'
              }`}
            >
              {/* Host Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-800/80 pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-white">
                      {host.fullName || host.email}
                    </h3>
                    {host.isTestAdmin ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        <ShieldCheck className="w-3 h-3 text-amber-400" />
                        Тестов Админ (Owner)
                      </span>
                    ) : host.isPlatformAdmin ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/35">
                        <ShieldCheck className="w-3 h-3" />
                        Platform Admin
                      </span>
                    ) : null}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        host.isTrialOpen
                          ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {host.isTrialOpen
                        ? `Активен Trial до ${new Date(
                            host.trialEndsAt || ''
                          ).toLocaleDateString('bg-BG', { timeZone: 'Europe/Sofia' })}`
                        : 'Изтекъл / Стандартен Trial'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-zinc-400 font-mono">
                    <span>{host.email}</span>
                    {host.stripeCustomerId && (
                      <>
                        <span>•</span>
                        <span className="text-zinc-500">
                          Stripe: {host.stripeCustomerId}
                        </span>
                      </>
                    )}
                    <span>•</span>
                    <span className="font-sans text-zinc-500">
                      Регистриран:{' '}
                      {new Date(host.createdAt).toLocaleDateString('bg-BG', {
                        timeZone: 'Europe/Sofia',
                      })}
                    </span>
                  </div>
                </div>

                {/* Host Actions */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={loadingHostId === host.id}
                    onClick={() => handleExtendTrial(host.id, host.email)}
                    aria-label={`Удължи пробния период на ${host.email} със 7 дни`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loadingHostId === host.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CalendarPlus className="w-3.5 h-3.5" />
                    )}
                    <span>+7 дни Trial</span>
                  </button>
                </div>
              </div>

              {/* Host Spaces List */}
              {host.spaces.length === 0 ? (
                <p className="text-xs text-zinc-500 italic">
                  Този хазяин все още няма създадени обекти (spaces).
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {host.spaces.map((space) => (
                    <div
                      key={space.id}
                      className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3.5 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="text-xs font-bold text-white truncate">
                            {space.name}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              space.subscriptionStatus === 'active'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : space.subscriptionStatus === 'trialing'
                                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                  : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {space.subscriptionStatus}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-zinc-400">
                          <Link
                            href={`/stay/${space.slug}`}
                            target="_blank"
                            aria-label={`Отвори гост изгледа за ${space.name}`}
                            className="inline-flex items-center gap-1 text-emerald-400 hover:underline font-mono cursor-pointer"
                          >
                            <span>/stay/{space.slug}</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-teal-400" />
                            {space.knowledgeCount} карти
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={loadingSpaceId === space.id}
                        onClick={() => handleToggleSpace(space.id, space.isActive)}
                        aria-label={
                          space.isActive ? 'Паузирай обекта' : 'Активирай обекта'
                        }
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                          space.isActive
                            ? 'bg-zinc-900 hover:bg-red-950/50 text-zinc-300 hover:text-red-300 border-zinc-800'
                            : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        {loadingSpaceId === space.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Power className="w-3 h-3" />
                        )}
                        <span>{space.isActive ? 'Активен' : 'Паузиран'}</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
