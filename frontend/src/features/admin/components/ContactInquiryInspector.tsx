'use client';

import React from 'react';
import {
  Archive,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  Trash2,
  User,
} from 'lucide-react';
import type {
  ContactMessage,
  ContactMessagePriority,
  ContactMessageStatus,
} from '@/lib/types/databaseTypes';

export interface ContactInquiryInspectorProps {
  message: ContactMessage;
  isUpdatingStatus: boolean;
  onStatusChange: (status: ContactMessageStatus, priority?: ContactMessagePriority) => void;
  onRequestDelete: (item: ContactMessage) => void;
}

export const ContactInquiryInspector: React.FC<ContactInquiryInspectorProps> = ({
  message,
  isUpdatingStatus,
  onStatusChange,
  onRequestDelete,
}) => {
  return (
    <section
      aria-label="Детайли на клиентското запитване"
      className="rounded-2xl border border-zinc-800 bg-zinc-900/75 p-5 space-y-4"
    >
      {/* Header Info */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-400" />
            <h2 className="text-base font-bold text-white">{message.name}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-zinc-400 font-mono">
            <span className="flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-zinc-500" />
              {message.email}
            </span>
            {message.phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-zinc-500" />
                {message.phone}
              </span>
            )}
            <span className="flex items-center gap-1 text-zinc-500 font-sans">
              <Clock className="w-3.5 h-3.5" />
              {new Date(message.created_at).toLocaleString('bg-BG', {
                dateStyle: 'medium',
                timeStyle: 'short',
                timeZone: 'Europe/Sofia',
              })}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {message.status !== 'read' && (
            <button
              type="button"
              onClick={() => onStatusChange('read')}
              disabled={isUpdatingStatus}
              aria-label="Маркирай като прочетено"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Прочетено</span>
            </button>
          )}

          {message.status !== 'archived' && (
            <button
              type="button"
              onClick={() => onStatusChange('archived')}
              disabled={isUpdatingStatus}
              aria-label="Архивирай запитването"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Архивирай</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onRequestDelete(message)}
            disabled={isUpdatingStatus}
            aria-label="Изтрий запитването"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Изтрий</span>
          </button>
        </div>
      </div>

      {/* Subject and Message Body */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
          Тема: {message.subject}
        </div>
        <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-4 text-xs sm:text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">
          {message.message}
        </div>
      </div>

      {/* Priority and Status Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-zinc-500 font-medium">Статус:</span>
          <select
            value={message.status}
            onChange={(e) =>
              onStatusChange(e.target.value as ContactMessageStatus)
            }
            disabled={isUpdatingStatus}
            aria-label="Промяна на статус"
            className="rounded-lg bg-zinc-950 border border-zinc-800 px-2.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="unread">Непрочетено (unread)</option>
            <option value="read">Прочетено (read)</option>
            <option value="replied">Отговорено (replied)</option>
            <option value="archived">Архивирано (archived)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-zinc-500 font-medium">Приоритет:</span>
          <select
            value={message.priority}
            onChange={(e) =>
              onStatusChange(message.status, e.target.value as ContactMessagePriority)
            }
            disabled={isUpdatingStatus}
            aria-label="Промяна на приоритет"
            className="rounded-lg bg-zinc-950 border border-zinc-800 px-2.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="low">⚪ Нисък (low)</option>
            <option value="normal">🔵 Нормален (normal)</option>
            <option value="high">🟠 Висок (high)</option>
            <option value="urgent">🔴 Спешен (urgent)</option>
          </select>
        </div>
      </div>
    </section>
  );
};
