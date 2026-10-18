'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ContactMessage } from '@/lib/types/databaseTypes';
import { AdminContactsView } from './components/AdminContactsView';
import { AdminHostsView } from './components/AdminHostsView';
import { AdminKpiGrid } from './components/AdminKpiGrid';
import { AdminNavbar } from './components/AdminNavbar';
import type { AdminDashboardSnapshot, AdminTabId } from './types/adminTypes';

export interface AdminDashboardPageProps {
  initialSnapshot: AdminDashboardSnapshot;
  defaultTab?: AdminTabId;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  initialSnapshot,
  defaultTab = 'overview',
}) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTabId>(defaultTab);
  const [messageOverrides, setMessageOverrides] = useState<
    Record<string, ContactMessage>
  >({});
  const [deletedMessageIds, setDeletedMessageIds] = useState<Set<string>>(
    () => new Set()
  );
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    initialSnapshot.contacts[0]?.id ?? null
  );

  const contacts = useMemo(
    () =>
      initialSnapshot.contacts
        .filter((item) => !deletedMessageIds.has(item.id))
        .map((item) => messageOverrides[item.id] ?? item),
    [initialSnapshot.contacts, messageOverrides, deletedMessageIds]
  );

  const handleMessageUpdated = (updated: ContactMessage) => {
    setMessageOverrides((prev) => ({
      ...prev,
      [updated.id]: updated,
    }));
  };

  const handleMessageDeleted = (deletedId: string) => {
    setDeletedMessageIds((prev) => new Set([...prev, deletedId]));
    if (selectedContactId === deletedId) {
      setSelectedContactId(null);
    }
  };

  const unreadCount = contacts.filter((c) => c.status === 'unread').length;
  const clientHostsCount = initialSnapshot.hosts.filter(
    (h) => !h.isTestAdmin
  ).length;

  return (
    <div className="min-h-dvh bg-[#07070b] text-zinc-100 flex flex-col">
      <AdminNavbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        adminEmail={initialSnapshot.adminEmail}
        unreadCount={unreadCount}
        hostsCount={clientHostsCount}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <AdminKpiGrid
            kpis={{
              ...initialSnapshot.kpis,
              totalInquiries: contacts.length,
              unreadInquiries: unreadCount,
              repliedInquiries: contacts.filter((c) => c.status === 'replied')
                .length,
              urgentInquiries: contacts.filter(
                (c) => c.priority === 'urgent' || c.ai_sentiment === 'urgent'
              ).length,
            }}
            recentContacts={contacts}
            recentHosts={initialSnapshot.hosts}
            onNavigateTab={setActiveTab}
            onSelectContact={(id) => setSelectedContactId(id)}
          />
        )}

        {activeTab === 'contacts' && (
          <AdminContactsView
            contacts={contacts}
            selectedContactId={selectedContactId}
            onSelectContactId={setSelectedContactId}
            onMessageUpdated={handleMessageUpdated}
            onMessageDeleted={handleMessageDeleted}
            onRefreshRequested={() => router.refresh()}
          />
        )}

        {activeTab === 'hosts' && (
          <AdminHostsView
            hosts={initialSnapshot.hosts}
            onRefreshRequested={() => router.refresh()}
          />
        )}
      </main>
    </div>
  );
};
