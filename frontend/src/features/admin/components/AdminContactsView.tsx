'use client';

import React, { useMemo, useState } from 'react';
import { Inbox } from 'lucide-react';
import type {
  ContactMessage,
  ContactMessagePriority,
  ContactMessageStatus,
} from '@/lib/types/databaseTypes';
import { useContactInquiryActions } from '../hooks/useContactInquiryActions';
import { ContactFilterBar } from './ContactFilterBar';
import { ContactInquiryListItem } from './ContactInquiryListItem';
import { ContactInquiryInspector } from './ContactInquiryInspector';
import { ContactAiTriageCard } from './ContactAiTriageCard';
import { ContactReplyComposer } from './ContactReplyComposer';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { FeedbackBanner } from './FeedbackBanner';

export interface AdminContactsViewProps {
  contacts: ContactMessage[];
  selectedContactId?: string | null;
  onSelectContactId: (id: string | null) => void;
  onRefreshRequested: () => void;
  onMessageUpdated: (updated: ContactMessage) => void;
  onMessageDeleted?: (deletedId: string) => void;
}

export const AdminContactsView: React.FC<AdminContactsViewProps> = ({
  contacts,
  selectedContactId,
  onSelectContactId,
  onRefreshRequested,
  onMessageUpdated,
  onMessageDeleted,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContactMessageStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<ContactMessagePriority | 'all'>('all');

  // Scope drafts per inquiry ID so drafts are preserved when switching between inquiries
  const [draftsByMessageId, setDraftsByMessageId] = useState<Record<string, string>>({});

  const {
    isRunningTriage,
    isUpdatingStatus,
    isSendingReply,
    isSeeding,
    isDeleting,
    feedbackBanner,
    setFeedbackBanner,
    messageToDelete,
    setMessageToDelete,
    handleRunTriage,
    handleStatusChange,
    handleSendReply,
    handleSeedSamples,
    handleConfirmDelete,
  } = useContactInquiryActions({
    selectedContactId,
    onSelectContactId,
    onRefreshRequested,
    onMessageUpdated,
    onMessageDeleted,
    onTriageSuggestedReply: (messageId, reply) => {
      setDraftsByMessageId((prev) => ({ ...prev, [messageId]: reply }));
    },
  });

  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && c.priority !== priorityFilter) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        c.message.toLowerCase().includes(q) ||
        (c.ai_summary || '').toLowerCase().includes(q)
      );
    });
  }, [contacts, statusFilter, priorityFilter, searchQuery]);

  const activeMessage = useMemo(() => {
    if (selectedContactId) {
      const match = contacts.find((c) => c.id === selectedContactId);
      if (match) return match;
    }
    return filteredContacts[0] || null;
  }, [contacts, selectedContactId, filteredContacts]);

  const activeDraft = activeMessage
    ? draftsByMessageId[activeMessage.id] ?? activeMessage.ai_suggested_reply ?? ''
    : '';

  const handleDraftChange = (nextText: string) => {
    if (!activeMessage) return;
    setDraftsByMessageId((prev) => ({ ...prev, [activeMessage.id]: nextText }));
  };

  return (
    <div className="space-y-5">
      {/* Search and Filters Bar */}
      <ContactFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        priorityFilter={priorityFilter}
        onPriorityFilterChange={setPriorityFilter}
        isSeeding={isSeeding}
        onSeedSamples={handleSeedSamples}
      />

      {/* Accessible Feedback Banner */}
      <FeedbackBanner
        banner={feedbackBanner}
        onClose={() => setFeedbackBanner(null)}
      />

      {/* Master-Detail Split Layout */}
      {filteredContacts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 p-12 text-center space-y-3">
          <Inbox className="w-8 h-8 text-zinc-600 mx-auto" />
          <h3 className="text-sm font-semibold text-zinc-200">
            Няма намерени запитвания за избраните филтри
          </h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            Натисни бутона „+ Демо запитвания“ горе вдясно, за да заредиш 3 реални многоезични казуса (BG, DE, EN) и да изпробваш AI Triaging модула веднага.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Inquiry List (5 cols) */}
          <div className="lg:col-span-5 space-y-2.5 max-h-190 overflow-y-auto pr-1">
            {filteredContacts.map((item) => (
              <ContactInquiryListItem
                key={item.id}
                item={item}
                isSelected={activeMessage?.id === item.id}
                onSelect={(id) => {
                  onSelectContactId(id);
                  setFeedbackBanner(null);
                }}
                onRequestDelete={(target) => setMessageToDelete(target)}
              />
            ))}
          </div>

          {/* Right Column: Inspector + AI Triage + Reply Composer (7 cols) */}
          {activeMessage ? (
            <div className="lg:col-span-7 space-y-4">
              <ContactInquiryInspector
                message={activeMessage}
                isUpdatingStatus={isUpdatingStatus}
                onStatusChange={(status, priority) =>
                  handleStatusChange(activeMessage, status, priority)
                }
                onRequestDelete={(target) => setMessageToDelete(target)}
              />

              <ContactAiTriageCard
                message={activeMessage}
                isTriaging={isRunningTriage}
                onRunTriage={() => handleRunTriage(activeMessage)}
                onApplySuggestedReply={handleDraftChange}
              />

              <ContactReplyComposer
                message={activeMessage}
                draftReply={activeDraft}
                onDraftChange={handleDraftChange}
                isSending={isSendingReply}
                onSendReply={() => handleSendReply(activeMessage, activeDraft)}
              />
            </div>
          ) : (
            <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-12 text-center text-xs text-zinc-500">
              Избери запитване от списъка вляво.
            </div>
          )}
        </div>
      )}

      {/* Styled Delete Confirmation Dialog */}
      <DeleteConfirmModal
        isOpen={Boolean(messageToDelete)}
        title="Изтриване на клиентско запитване"
        description="Сигурни ли сте, че искате да изтриете това запитване? Действието е необратимо."
        itemTitle={
          messageToDelete
            ? `${messageToDelete.name} (${messageToDelete.subject})`
            : undefined
        }
        isLoading={isDeleting}
        onClose={() => setMessageToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
