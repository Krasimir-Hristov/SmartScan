'use client';

import React, { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Inbox } from 'lucide-react';
import type {
  ContactMessage,
  ContactMessagePriority,
  ContactMessageStatus,
} from '@/lib/types/databaseTypes';
import {
  deleteContactMessageAction,
  runContactAiTriageAction,
  seedSampleContactInquiriesAction,
  sendContactReplyAction,
  updateContactStatusAction,
} from '../actions/adminContactActions';
import { ContactFilterBar } from './ContactFilterBar';
import { ContactInquiryListItem } from './ContactInquiryListItem';
import { ContactInquiryInspector } from './ContactInquiryInspector';
import { ContactAiTriageCard } from './ContactAiTriageCard';
import { ContactReplyComposer } from './ContactReplyComposer';
import { DeleteConfirmModal } from './DeleteConfirmModal';

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

  const [isRunningTriage, setIsRunningTriage] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [draftReply, setDraftReply] = useState('');
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [messageToDelete, setMessageToDelete] = useState<ContactMessage | null>(null);

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

  const handleRunTriage = async () => {
    if (!activeMessage) return;
    setIsRunningTriage(true);
    setFeedbackBanner(null);

    try {
      const res = await runContactAiTriageAction(activeMessage.id);
      if (res.success && res.updatedMessage) {
        onMessageUpdated(res.updatedMessage);
        if (res.updatedMessage.ai_suggested_reply) {
          setDraftReply(res.updatedMessage.ai_suggested_reply);
        }
        setFeedbackBanner({
          type: 'success',
          text: '✓ Gemini 2.5 Flash успешно класифицира запитването и генерира отговор.',
        });
      } else {
        setFeedbackBanner({
          type: 'error',
          text: res.error || 'Неуспешен AI триаж на запитването.',
        });
      }
    } catch {
      setFeedbackBanner({
        type: 'error',
        text: 'Системна грешка при изпълнение на AI триажа.',
      });
    } finally {
      setIsRunningTriage(false);
    }
  };

  const handleStatusChange = async (
    status: ContactMessageStatus,
    priority?: ContactMessagePriority
  ) => {
    if (!activeMessage) return;
    setIsUpdatingStatus(true);
    setFeedbackBanner(null);

    try {
      const res = await updateContactStatusAction(activeMessage.id, status, priority);
      if (res.success && res.updatedMessage) {
        onMessageUpdated(res.updatedMessage);
        setFeedbackBanner({
          type: 'success',
          text: `✓ Статусът беше обновен на „${status}“.`,
        });
      } else {
        setFeedbackBanner({
          type: 'error',
          text: res.error || 'Неуспешна промяна на статуса.',
        });
      }
    } catch {
      setFeedbackBanner({
        type: 'error',
        text: 'Системна грешка при обновяване на статуса.',
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSendReply = async () => {
    if (!activeMessage || !draftReply.trim()) return;
    setIsSendingReply(true);
    setFeedbackBanner(null);

    try {
      const res = await sendContactReplyAction(activeMessage.id, draftReply);
      if (res.success && res.updatedMessage) {
        onMessageUpdated(res.updatedMessage);
        setFeedbackBanner({
          type: 'success',
          text: '✓ Отговорът беше запазен в историята и статусът бе маркиран като „Отговорено“.',
        });
      } else {
        setFeedbackBanner({
          type: 'error',
          text: res.error || 'Грешка при запис на отговора.',
        });
      }
    } catch {
      setFeedbackBanner({
        type: 'error',
        text: 'Системна грешка при изпращане на отговора.',
      });
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleSeedSamples = async () => {
    setIsSeeding(true);
    setFeedbackBanner(null);
    try {
      const res = await seedSampleContactInquiriesAction();
      if (res.success) {
        setFeedbackBanner({
          type: 'success',
          text: '✓ Добавени са 3 реалистични многоезични запитвания (BG, DE, EN).',
        });
        onRefreshRequested();
      } else {
        setFeedbackBanner({
          type: 'error',
          text: res.error || 'Неуспешно добавяне на примерни данни.',
        });
      }
    } catch {
      setFeedbackBanner({
        type: 'error',
        text: 'Системна грешка при зареждане на примерни запитвания.',
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!messageToDelete) return;
    const targetId = messageToDelete.id;
    setIsDeleting(true);

    try {
      const res = await deleteContactMessageAction(targetId);
      if (res.success) {
        setMessageToDelete(null);
        if (onMessageDeleted) {
          onMessageDeleted(targetId);
        } else {
          onRefreshRequested();
        }
        if (selectedContactId === targetId) {
          onSelectContactId(null);
        }
        setFeedbackBanner({
          type: 'success',
          text: '✓ Запитването беше изтрито успешно.',
        });
      } else {
        setFeedbackBanner({
          type: 'error',
          text: res.error || 'Неуспешно изтриване на запитването.',
        });
      }
    } catch {
      setFeedbackBanner({
        type: 'error',
        text: 'Системна грешка при изтриване на съобщението.',
      });
    } finally {
      setIsDeleting(false);
    }
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

      {/* Feedback Banner */}
      {feedbackBanner && (
        <aside
          role="status"
          aria-live="polite"
          className={`rounded-xl border p-3 flex items-center justify-between gap-3 text-xs font-semibold ${
            feedbackBanner.type === 'success'
              ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
              : 'border-rose-500/40 bg-rose-950/40 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackBanner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{feedbackBanner.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="text-zinc-400 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </aside>
      )}

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
                onStatusChange={handleStatusChange}
                onRequestDelete={(target) => setMessageToDelete(target)}
              />

              <ContactAiTriageCard
                message={activeMessage}
                isTriaging={isRunningTriage}
                onRunTriage={handleRunTriage}
                onApplySuggestedReply={(suggestedText) => setDraftReply(suggestedText)}
              />

              <ContactReplyComposer
                message={activeMessage}
                draftReply={draftReply}
                onDraftChange={setDraftReply}
                isSending={isSendingReply}
                onSendReply={handleSendReply}
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
