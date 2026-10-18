'use client';

import React, { useMemo, useState } from 'react';
import {
  Archive,
  CheckCircle,
  Clock,
  Inbox,
  Loader2,
  Mail,
  Phone,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
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
import { ContactAiTriageCard } from './ContactAiTriageCard';
import { ContactReplyComposer } from './ContactReplyComposer';
import { DeleteConfirmModal } from './DeleteConfirmModal';

export interface AdminContactsViewProps {
  contacts: ContactMessage[];
  selectedContactId: string | null;
  onSelectContactId: (id: string) => void;
  onMessageUpdated: (updated: ContactMessage) => void;
  onMessageDeleted?: (deletedId: string) => void;
  onRefreshRequested: () => void;
}

const STATUS_OPTIONS: Array<{
  value: ContactMessageStatus | 'all';
  label: string;
}> = [
  { value: 'all', label: 'Всички' },
  { value: 'unread', label: 'Непрочетени' },
  { value: 'read', label: 'Прочетени' },
  { value: 'replied', label: 'Отговорени' },
  { value: 'archived', label: 'Архивирани' },
];

const PRIORITY_OPTIONS: Array<{
  value: ContactMessagePriority | 'all';
  label: string;
}> = [
  { value: 'all', label: 'Всички приоритети' },
  { value: 'urgent', label: '🔴 Спешни (Urgent)' },
  { value: 'high', label: '🟠 Висок (High)' },
  { value: 'normal', label: '🔵 Нормален (Normal)' },
  { value: 'low', label: '⚪ Нисък (Low)' },
];

export const AdminContactsView: React.FC<AdminContactsViewProps> = ({
  contacts,
  selectedContactId,
  onSelectContactId,
  onMessageUpdated,
  onMessageDeleted,
  onRefreshRequested,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    ContactMessageStatus | 'all'
  >('all');
  const [priorityFilter, setPriorityFilter] = useState<
    ContactMessagePriority | 'all'
  >('all');
  const [isTriaging, setIsTriaging] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<{
    id: string;
    name: string;
    subject: string;
  } | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  const filteredContacts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return contacts.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && c.priority !== priorityFilter)
        return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        c.message.toLowerCase().includes(q) ||
        (c.ai_summary || '').toLowerCase().includes(q)
      );
    });
  }, [contacts, searchQuery, statusFilter, priorityFilter]);

  const activeMessage = useMemo(() => {
    if (filteredContacts.length === 0) return null;
    if (selectedContactId) {
      const found = filteredContacts.find((c) => c.id === selectedContactId);
      if (found) return found;
    }
    return filteredContacts[0];
  }, [filteredContacts, selectedContactId]);

  const currentDraft = activeMessage
    ? (replyDrafts[activeMessage.id] ??
      activeMessage.admin_reply ??
      activeMessage.ai_suggested_reply ??
      '')
    : '';

  const setCurrentDraft = (val: string) => {
    if (!activeMessage) return;
    setReplyDrafts((prev) => ({ ...prev, [activeMessage.id]: val }));
  };

  const handleRunTriage = async () => {
    if (!activeMessage) return;
    setIsTriaging(true);
    setFeedbackBanner(null);
    const res = await runContactAiTriageAction(activeMessage.id);
    setIsTriaging(false);
    if (res.success && res.updatedMessage) {
      onMessageUpdated(res.updatedMessage);
      if (res.updatedMessage.ai_suggested_reply) {
        setReplyDrafts((prev) => ({
          ...prev,
          [activeMessage.id]: res.updatedMessage?.ai_suggested_reply || '',
        }));
      }
      setFeedbackBanner('✨ AI анализът и черновата за отговор са готови!');
    }
  };

  const handleStatusChange = async (
    nextStatus: ContactMessageStatus,
    nextPriority?: ContactMessagePriority,
  ) => {
    if (!activeMessage) return;
    setIsUpdatingStatus(true);
    const res = await updateContactStatusAction(
      activeMessage.id,
      nextStatus,
      nextPriority,
    );
    setIsUpdatingStatus(false);
    if (res.success && res.updatedMessage) {
      onMessageUpdated(res.updatedMessage);
    }
  };

  const handleSendReply = async () => {
    if (!activeMessage) return;
    setIsSendingReply(true);
    setFeedbackBanner(null);
    const res = await sendContactReplyAction(activeMessage.id, currentDraft);
    setIsSendingReply(false);
    if (res.success && res.updatedMessage) {
      onMessageUpdated(res.updatedMessage);
      setFeedbackBanner(
        '✓ Отговорът е записан и запитването е маркирано като Replied.',
      );
    }
  };

  const handleSeedSamples = async () => {
    setIsSeeding(true);
    const res = await seedSampleContactInquiriesAction();
    setIsSeeding(false);
    if (res.success) {
      onRefreshRequested();
    }
  };

  const handlePromptDelete = (msg: {
    id: string;
    name: string;
    subject: string;
  }) => {
    setContactToDelete(msg);
  };

  const handleConfirmDelete = async () => {
    if (!contactToDelete) return;
    setIsDeleting(true);
    const messageId = contactToDelete.id;
    const res = await deleteContactMessageAction(messageId);
    setIsDeleting(false);
    setContactToDelete(null);
    if (res.success) {
      if (onMessageDeleted) {
        onMessageDeleted(messageId);
      } else {
        onRefreshRequested();
      }
      setFeedbackBanner('✓ Запитването беше изтрито успешно.');
    }
  };

  return (
    <div className='space-y-5'>
      {/* Filter & Search Bar */}
      <section
        aria-label='Филтриране и търсене на запитвания'
        className='rounded-2xl border border-zinc-800 bg-zinc-900/75 p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3'
      >
        <div className='relative flex-1'>
          <Search className='w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2' />
          <input
            type='search'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label='Търсене по име, имейл, телефон или резюме'
            placeholder='Търси по име, имейл, телефон или AI резюме...'
            className='w-full rounded-xl bg-zinc-950 border border-zinc-800 focus:border-emerald-500/60 focus:outline-none pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder:text-zinc-500'
          />
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          <div className='flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800'>
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type='button'
                onClick={() => setStatusFilter(opt.value)}
                aria-label={`Филтър статус: ${opt.label}`}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  statusFilter === opt.value
                    ? 'bg-emerald-500 text-zinc-950 font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <select
            value={priorityFilter}
            onChange={(e) =>
              setPriorityFilter(
                e.target.value as ContactMessagePriority | 'all',
              )
            }
            aria-label='Филтър по приоритет'
            className='rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500/60 cursor-pointer'
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <button
            type='button'
            onClick={handleSeedSamples}
            disabled={isSeeding}
            aria-label='Добави примерни запитвания за тест на AI Triaging'
            className='inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50'
          >
            {isSeeding ? (
              <Loader2 className='w-3.5 h-3.5 animate-spin' />
            ) : (
              <Sparkles className='w-3.5 h-3.5' />
            )}
            <span>+ Демо запитвания</span>
          </button>
        </div>
      </section>

      {/* Master-Detail Split Layout */}
      {filteredContacts.length === 0 ? (
        <div className='rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 p-12 text-center space-y-3'>
          <Inbox className='w-8 h-8 text-zinc-600 mx-auto' />
          <h3 className='text-sm font-semibold text-zinc-200'>
            Няма намерени запитвания за избраните филтри
          </h3>
          <p className='text-xs text-zinc-500 max-w-md mx-auto'>
            Натисни бутона „+ Демо запитвания“ горе вдясно, за да заредиш 3
            реални многоезични казуса (BG, DE, EN) и да изпробваш AI Triaging
            модула веднага.
          </p>
        </div>
      ) : (
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-6 items-start'>
          {/* Left Column: Inquiry List (5 cols) */}
          <div className='lg:col-span-5 space-y-2.5 max-h-190 overflow-y-auto pr-1'>
            {filteredContacts.map((item) => {
              const isSelected = activeMessage?.id === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectContactId(item.id);
                    setFeedbackBanner(null);
                  }}
                  role='button'
                  tabIndex={0}
                  aria-label={`Запитване от ${item.name}`}
                  className={`w-full text-left rounded-2xl border p-4 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-emerald-500/60 bg-emerald-950/20 shadow-lg shadow-emerald-950/30'
                      : 'border-zinc-800/90 bg-zinc-900/60 hover:border-zinc-700'
                  }`}
                >
                  <div className='flex items-center justify-between gap-2 mb-1.5'>
                    <span className='text-xs sm:text-sm font-bold text-white truncate'>
                      {item.name}
                    </span>
                    <div className='flex items-center gap-1.5 shrink-0'>
                      {item.priority === 'urgent' && (
                        <span className='px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-500/20 text-red-300 border border-red-500/40 shadow-xs'>
                          Urgent
                        </span>
                      )}
                      {item.priority === 'high' && (
                        <span className='px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40'>
                          High
                        </span>
                      )}
                      {item.priority === 'normal' && (
                        <span className='px-2 py-0.5 rounded-full text-[10px] font-medium uppercase bg-blue-500/15 text-blue-300 border border-blue-500/30'>
                          Normal
                        </span>
                      )}
                      {item.priority === 'low' && (
                        <span className='px-2 py-0.5 rounded-full text-[10px] font-medium uppercase bg-zinc-800 text-zinc-400 border border-zinc-700'>
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

                  <div className='flex items-center gap-2 text-[11px] text-zinc-400 mb-2'>
                    <span className='truncate'>{item.email}</span>
                    <span>•</span>
                    <span className='uppercase font-mono text-[10px] text-zinc-500'>
                      {item.subject}
                    </span>
                  </div>

                  {item.ai_summary ? (
                    <div className='rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2 text-xs text-emerald-200 flex items-start gap-1.5 mb-2'>
                      <Sparkles className='w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5' />
                      <span className='line-clamp-2'>{item.ai_summary}</span>
                    </div>
                  ) : (
                    <p className='text-xs text-zinc-400 line-clamp-2 mb-2'>
                      {item.message}
                    </p>
                  )}

                  <div className='flex items-center justify-end pt-1 border-t border-zinc-800/60'>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePromptDelete({
                          id: item.id,
                          name: item.name,
                          subject: item.subject,
                        });
                      }}
                      role='button'
                      tabIndex={0}
                      aria-label={`Изтрий запитване от ${item.name}`}
                      className='inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-red-400 p-1 transition-colors cursor-pointer'
                    >
                      <Trash2 className='w-3 h-3' />
                      <span>Изтрий</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Inspector + AI Triaging + Reply Composer (7 cols) */}
          {activeMessage && (
            <div className='lg:col-span-7 space-y-5'>
              {feedbackBanner && (
                <div className='rounded-xl border border-emerald-500/40 bg-emerald-950/60 px-4 py-2.5 text-xs font-medium text-emerald-200'>
                  {feedbackBanner}
                </div>
              )}

              {/* Original Inquiry Card */}
              <article className='rounded-2xl border border-zinc-800 bg-zinc-900/75 p-5 space-y-4'>
                <div className='flex flex-wrap items-start justify-between gap-3 border-b border-zinc-800/80 pb-4'>
                  <div>
                    <h2 className='text-base font-bold text-white'>
                      {activeMessage.name}
                    </h2>
                    <div className='flex flex-wrap items-center gap-3 mt-1 text-xs text-zinc-400'>
                      <span className='inline-flex items-center gap-1'>
                        <Mail className='w-3.5 h-3.5 text-emerald-400' />
                        {activeMessage.email}
                      </span>
                      {activeMessage.phone && (
                        <a
                          href={`tel:${activeMessage.phone}`}
                          className='inline-flex items-center gap-1 text-emerald-300 hover:underline cursor-pointer'
                        >
                          <Phone className='w-3.5 h-3.5' />
                          {activeMessage.phone}
                        </a>
                      )}
                      <span className='inline-flex items-center gap-1 text-zinc-500'>
                        <Clock className='w-3.5 h-3.5' />
                        {new Date(activeMessage.created_at).toLocaleString(
                          'bg-BG',
                          {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          },
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Quick Status & Priority Controls */}
                  <div className='flex flex-wrap items-center gap-2'>
                    <select
                      disabled={isUpdatingStatus}
                      value={activeMessage.priority}
                      onChange={(e) =>
                        handleStatusChange(
                          activeMessage.status,
                          e.target.value as ContactMessagePriority,
                        )
                      }
                      aria-label='Промени приоритета на запитването'
                      className='rounded-xl bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-200 cursor-pointer'
                    >
                      <option value='low'>Приоритет: Low</option>
                      <option value='normal'>Приоритет: Normal</option>
                      <option value='high'>Приоритет: High</option>
                      <option value='urgent'>Приоритет: Urgent</option>
                    </select>

                    {activeMessage.status !== 'read' && (
                      <button
                        type='button'
                        disabled={isUpdatingStatus}
                        onClick={() => handleStatusChange('read')}
                        aria-label='Маркирай като прочетено'
                        className='inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 cursor-pointer'
                      >
                        <CheckCircle className='w-3.5 h-3.5 text-emerald-400' />
                        <span>Прочетено</span>
                      </button>
                    )}

                    {activeMessage.status !== 'archived' && (
                      <button
                        type='button'
                        disabled={isUpdatingStatus || isDeleting}
                        onClick={() => handleStatusChange('archived')}
                        aria-label='Архивирай запитването'
                        className='inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer disabled:opacity-50'
                      >
                        <Archive className='w-3.5 h-3.5' />
                        <span>Архивирай</span>
                      </button>
                    )}

                    <button
                      type='button'
                      disabled={isUpdatingStatus || isDeleting}
                      onClick={() =>
                        handlePromptDelete({
                          id: activeMessage.id,
                          name: activeMessage.name,
                          subject: activeMessage.subject,
                        })
                      }
                      aria-label='Изтрий запитването'
                      className='inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-500/30 transition-colors cursor-pointer disabled:opacity-50'
                    >
                      {isDeleting ? (
                        <Loader2 className='w-3.5 h-3.5 animate-spin text-red-300' />
                      ) : (
                        <Trash2 className='w-3.5 h-3.5 text-red-400' />
                      )}
                      <span>Изтрий</span>
                    </button>
                  </div>
                </div>

                <div>
                  <span className='text-[10px] font-bold uppercase tracking-wider text-zinc-500'>
                    Оригинално запитване (Тема: {activeMessage.subject}):
                  </span>
                  <p className='mt-1.5 text-sm text-zinc-100 whitespace-pre-wrap leading-relaxed bg-zinc-950/70 p-4 rounded-xl border border-zinc-800/80'>
                    {activeMessage.message}
                  </p>
                </div>
              </article>

              {/* AI Triaging Card */}
              <ContactAiTriageCard
                message={activeMessage}
                isTriaging={isTriaging}
                onRunTriage={handleRunTriage}
                onApplySuggestedReply={(text) => setCurrentDraft(text)}
              />

              {/* Direct Reply Composer */}
              <ContactReplyComposer
                message={activeMessage}
                draftReply={currentDraft}
                onDraftChange={setCurrentDraft}
                isSending={isSendingReply}
                onSendReply={handleSendReply}
              />
            </div>
          )}
        </div>
      )}

      {/* Styled Delete Confirmation Dialog */}
      <DeleteConfirmModal
        isOpen={Boolean(contactToDelete)}
        onClose={() => setContactToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Изтриване на запитване"
        description="Сигурни ли сте, че искате да изтриете това запитване? Действието е безвъзвратно и записът ще бъде премахнат от базата данни."
        itemTitle={
          contactToDelete
            ? `${contactToDelete.name} (${contactToDelete.subject})`
            : undefined
        }
        confirmLabel="Да, изтрий запитването"
        cancelLabel="Отказ"
        isLoading={isDeleting}
      />
    </div>
  );
};
