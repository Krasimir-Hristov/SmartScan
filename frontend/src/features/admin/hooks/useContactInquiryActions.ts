'use client';

import { useState } from 'react';
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

export interface UseContactInquiryActionsProps {
  selectedContactId?: string | null;
  onSelectContactId: (id: string | null) => void;
  onRefreshRequested: () => void;
  onMessageUpdated: (updated: ContactMessage) => void;
  onMessageDeleted?: (deletedId: string) => void;
  onTriageSuggestedReply?: (messageId: string, suggestedReply: string) => void;
}

export function useContactInquiryActions({
  selectedContactId,
  onSelectContactId,
  onRefreshRequested,
  onMessageUpdated,
  onMessageDeleted,
  onTriageSuggestedReply,
}: UseContactInquiryActionsProps) {
  const [isRunningTriage, setIsRunningTriage] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [messageToDelete, setMessageToDelete] = useState<ContactMessage | null>(null);

  const handleRunTriage = async (targetMessage: ContactMessage | null) => {
    if (!targetMessage) return;
    const targetId = targetMessage.id;
    setIsRunningTriage(true);
    setFeedbackBanner(null);

    try {
      const res = await runContactAiTriageAction(targetId);
      if (res.success && res.updatedMessage) {
        onMessageUpdated(res.updatedMessage);
        if (res.updatedMessage.ai_suggested_reply && onTriageSuggestedReply) {
          onTriageSuggestedReply(targetId, res.updatedMessage.ai_suggested_reply);
        }
        const bannerText =
          res.source === 'ai'
            ? '✓ Gemini 2.5 Flash успешно класифицира запитването и генерира отговор.'
            : '✓ Запитването беше класифицирано чрез вградените евристични шаблони (fallback).';

        setFeedbackBanner({
          type: 'success',
          text: bannerText,
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
    targetMessage: ContactMessage | null,
    status: ContactMessageStatus,
    priority?: ContactMessagePriority
  ) => {
    if (!targetMessage) return;
    setIsUpdatingStatus(true);
    setFeedbackBanner(null);

    try {
      const res = await updateContactStatusAction(targetMessage.id, status, priority);
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

  const handleSendReply = async (
    targetMessage: ContactMessage | null,
    replyText: string
  ) => {
    if (!targetMessage || !replyText.trim()) return;
    setIsSendingReply(true);
    setFeedbackBanner(null);

    try {
      const res = await sendContactReplyAction(targetMessage.id, replyText);
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

  return {
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
  };
}
