'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { DashboardNavbar } from './components/DashboardNavbar';
import { SpaceSelector } from './components/SpaceSelector';
import { SpaceEditor } from './components/SpaceEditor';
import { SpaceCreateModal } from './components/SpaceCreateModal';
import { KnowledgeManager } from './components/KnowledgeManager';
import { SpaceSwitcher } from './components/SpaceSwitcher';
import type { DashboardUser } from './types/dashboardTypes';
import type { Space, KnowledgeChunk } from '@/lib/types/databaseTypes';
import { Sparkles, Plus, Home, ArrowLeft, ExternalLink } from 'lucide-react';

export interface DashboardPageProps {
  user: DashboardUser;
  initialSpaces?: Space[];
  initialKnowledgeChunks?: KnowledgeChunk[];
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  user,
  initialSpaces = [],
  initialKnowledgeChunks = [],
}) => {
  const t = useTranslations('dashboard');
  const [spaces, setSpaces] = useState<Space[]>(initialSpaces);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    t('defaultHostName');

  const selectedSpace = selectedSpaceId
    ? spaces.find((s) => s.id === selectedSpaceId) || null
    : null;

  const handleSpaceCreated = (newSpace: Space) => {
    setSpaces((prev) => [newSpace, ...prev]);
    setSelectedSpaceId(newSpace.id);
  };

  const handleSpaceUpdated = (updatedSpace: Space) => {
    setSpaces((prev) =>
      prev.map((s) => (s.id === updatedSpace.id ? updatedSpace : s))
    );
  };

  const handleSpaceDeleted = (deletedSpaceId: string) => {
    setSpaces((prev) => prev.filter((s) => s.id !== deletedSpaceId));
    setSelectedSpaceId(null);
  };

  return (
    <div className="min-h-dvh bg-[#09090b] text-zinc-100 flex flex-col antialiased selection:bg-emerald-500 selection:text-zinc-950 font-sans">
      {/* Dashboard Sticky Navbar */}
      <DashboardNavbar user={user} />

      {/* Main Content Area */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10 flex flex-col gap-6 sm:gap-8">
        {selectedSpace ? (
          /* =========================================================================
             VIEW 2: Active Space Management Workspace (Editor + Knowledge Base)
             ========================================================================= */
          <div className="flex flex-col gap-6">
            {/* Top Bar with Back Button, 1-Click SpaceSwitcher, and Guest Link */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-white/10">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedSpaceId(null)}
                  aria-label={t('allSpacesAria')}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{t('allSpaces')}</span>
                </button>

                <div className="h-4 w-px bg-white/10 hidden sm:block" />

                {/* 1-Click Fast Space Switcher */}
                <SpaceSwitcher
                  spaces={spaces}
                  currentSpace={selectedSpace}
                  onSelectSpace={(id) => setSelectedSpaceId(id)}
                  onCreateNew={() => setIsCreateModalOpen(true)}
                />

                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {t('currentActiveSpace')}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href={`/stay/${selectedSpace.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t('openGuideTab', { name: selectedSpace.name })}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  <span>{t('guestPreview')}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                </Link>
              </div>
            </div>

            {/* 2-Column Workspace */}
            <section
              aria-label={t('manageSpaceAria', { name: selectedSpace.name })}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
            >
              {/* Left Column: Core Credentials Form */}
              <div className="lg:col-span-7">
                <SpaceEditor
                  key={selectedSpace.id}
                  space={selectedSpace}
                  onSpaceUpdated={handleSpaceUpdated}
                  onSpaceDeleted={handleSpaceDeleted}
                />
              </div>

              {/* Right Column: AI Knowledge Base Ingestion */}
              <div className="lg:col-span-5">
                <KnowledgeManager
                  key={selectedSpace.id}
                  spaceId={selectedSpace.id}
                  initialChunks={
                    selectedSpace.id === initialSpaces[0]?.id
                      ? initialKnowledgeChunks
                      : []
                  }
                />
              </div>
            </section>
          </div>
        ) : (
          /* =========================================================================
             VIEW 1: Clean Spaces Hub / Grid View (Immediate access without vanity metrics)
             ========================================================================= */
          <>
            {/* Welcome Header */}
            <section aria-label="Welcome Banner" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-mono">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>SmartScan Stay v1.0</span>
                  </span>
                </div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
                  {t('welcome', { name: displayName })}
                </h1>
                <p className="text-xs sm:text-sm text-zinc-400">
                  {t('welcomeSub')}
                </p>
              </div>

              <div className="flex items-center gap-3 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  aria-label={t('addNewSpace')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t('addNewSpace')}</span>
                </button>
              </div>
            </section>

            {/* Spaces Grid (Directly visible immediately) */}
            {spaces.length > 0 ? (
              <section aria-label={t('spacesListAria')} className="mt-2">
                <SpaceSelector
                  spaces={spaces}
                  selectedSpaceId={null}
                  onSelectSpace={(id) => setSelectedSpaceId(id)}
                  onOpenCreateModal={() => setIsCreateModalOpen(true)}
                />
              </section>
            ) : (
              <section
                aria-label={t('noSpacesAria')}
                className="p-12 rounded-3xl bg-[#121216] border border-dashed border-white/10 flex flex-col items-center justify-center text-center gap-4 mt-2"
              >
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Home className="w-8 h-8" />
                </div>
                <div className="max-w-md flex flex-col gap-1.5">
                  <h2 className="font-display text-lg font-bold text-white">
                    {t('emptyTitle')}
                  </h2>
                  <p className="text-xs text-zinc-400">
                    {t('emptyDesc')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  aria-label={t('createFirstSpace')}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-sm font-bold transition-all shadow-lg shadow-emerald-500/20 cursor-pointer mt-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t('createFirstSpace')}</span>
                </button>
              </section>
            )}
          </>
        )}
      </main>

      {/* Modal for Creating New Space */}
      <SpaceCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSpaceCreated={handleSpaceCreated}
      />

      {/* Dashboard Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-6 text-center text-xs text-zinc-500">
        {t('footerNote')}
      </footer>
    </div>
  );
};
