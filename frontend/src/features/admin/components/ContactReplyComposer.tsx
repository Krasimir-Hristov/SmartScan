'use client';

import React, { useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  MailCheck,
  Send,
  Wand2,
} from 'lucide-react';
import type { ContactMessage } from '@/lib/types/databaseTypes';

export interface ContactReplyComposerProps {
  message: ContactMessage;
  draftReply: string;
  onDraftChange: (nextValue: string) => void;
  isSending: boolean;
  onSendReply: () => void;
}

export const ContactReplyComposer: React.FC<ContactReplyComposerProps> = ({
  message,
  draftReply,
  onDraftChange,
  isSending,
  onSendReply,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyReply = async () => {
    if (!draftReply.trim()) return;
    try {
      await navigator.clipboard.writeText(draftReply);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API fallback ignored
    }
  };

  const mailtoHref = `mailto:${encodeURIComponent(
    message.email
  )}?subject=${encodeURIComponent(
    `Re: SmartScan Stay — ${message.subject}`
  )}&body=${encodeURIComponent(draftReply)}`;

  return (
    <section
      aria-label="Редактор за отговор до клиента"
      className="rounded-2xl border border-zinc-800 bg-zinc-900/75 p-5 space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MailCheck className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">
            Директен отговор към {message.name} ({message.email})
          </h3>
        </div>

        {message.replied_at && (
          <span className="text-[11px] text-emerald-400 font-medium">
            ✓ Отговорено на{' '}
            {new Date(message.replied_at).toLocaleString('bg-BG', {
              dateStyle: 'short',
              timeStyle: 'short',
            })}
          </span>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label
            htmlFor="admin-reply-textarea"
            className="text-xs text-zinc-400 font-medium"
          >
            Текст на отговора:
          </label>
          {message.ai_suggested_reply && draftReply !== message.ai_suggested_reply && (
            <button
              type="button"
              onClick={() => onDraftChange(message.ai_suggested_reply || '')}
              aria-label="Зареди предложената от AI чернова"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer"
            >
              <Wand2 className="w-3 h-3" />
              <span>Зареди AI черновата</span>
            </button>
          )}
        </div>

        <textarea
          id="admin-reply-textarea"
          rows={6}
          value={draftReply}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder="Напиши отговор или натисни „Анализирай с Gemini Flash“, за да генерираш автоматична чернова на езика на клиента..."
          className="w-full rounded-xl bg-zinc-950/90 border border-zinc-800 focus:border-emerald-500/60 focus:outline-none p-3.5 text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-600 leading-relaxed resize-y"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyReply}
            disabled={!draftReply.trim()}
            aria-label="Копирай текста на отговора"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-zinc-800/90 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copied ? 'Копирано!' : 'Копирай'}</span>
          </button>

          <a
            href={mailtoHref}
            aria-label="Отвори в имейл клиент"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-zinc-800/90 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Отвори в Имейл Клиент</span>
          </a>
        </div>

        <button
          type="button"
          onClick={onSendReply}
          disabled={isSending || draftReply.trim().length < 5}
          aria-label="Запиши отговора и маркирай като Replied"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-linear-to-r from-emerald-400 to-teal-500 text-zinc-950 hover:brightness-110 transition-all cursor-pointer shadow-lg shadow-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-950" />
          ) : (
            <Send className="w-3.5 h-3.5 text-zinc-950" />
          )}
          <span>
            {isSending
              ? 'Записване...'
              : 'Изпрати отговор & Маркирай Replied'}
          </span>
        </button>
      </div>
    </section>
  );
};
