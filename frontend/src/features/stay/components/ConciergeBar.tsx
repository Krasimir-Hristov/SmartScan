'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Sparkles,
  Send,
  Square,
  Bot,
  User,
  RotateCcw,
  AlertCircle,
  Globe,
} from 'lucide-react';
import { useConciergeChat } from '../hooks/useConciergeChat';
import type { SpaceStayData } from '../types/stayTypes';

export interface ConciergeBarProps {
  spaceId: string;
  stayData?: SpaceStayData;
}

export const ConciergeBar: React.FC<ConciergeBarProps> = ({ spaceId }) => {
  const t = useTranslations('stay');
  const locale = useLocale();
  const [inputQuery, setInputQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isStreaming,
    error,
    sendMessage,
    stopGeneration,
    clearChat,
  } = useConciergeChat({
    spaceId,
    locale,
    connectionErrorMessage: t('chatConnectionError'),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = inputQuery.trim();
    if (!query || isStreaming) return;
    setInputQuery('');
    sendMessage(query);
  };

  return (
    <section
      aria-labelledby='concierge-heading'
      className='relative overflow-hidden rounded-2xl bg-[#121216] border border-emerald-500/30 p-4 sm:p-5 shadow-2xl flex flex-col gap-4'
    >
      {/* Subtle top ambient glow */}
      <div
        className='pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-20 bg-emerald-500/15 blur-2xl'
        aria-hidden='true'
      />

      {/* Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2.5'>
          <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-xs shadow-emerald-500/30'>
            <Bot className='w-4 h-4 text-emerald-400' />
          </div>
          <div className='flex flex-col'>
            <span
              id='concierge-heading'
              className='text-xs font-bold text-white font-display tracking-tight'
            >
              {t('conciergeTitle')}
            </span>
            <span className='text-[10px] text-zinc-400 font-mono'>
              {t('conciergeSubtitle')}
            </span>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            type='button'
            onClick={clearChat}
            aria-label={t('clearChat')}
            className='flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 transition-colors cursor-pointer'
          >
            <RotateCcw className='w-3 h-3' />
            <span>{t('clearChat')}</span>
          </button>
        )}
      </div>

      {/* Multilingual Polyglot CTA Banner */}
      <div className='flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[11px] leading-snug'>
        <Globe className='w-3.5 h-3.5 shrink-0 text-emerald-400 animate-pulse' />
        <span>{t('polyglotCtaBanner')}</span>
      </div>

      {/* Welcome Call to Action Prompt */}
      {messages.length === 0 && (
        <div className='flex flex-col gap-1.5 p-3.5 rounded-xl bg-linear-to-b from-white/4 to-transparent border border-white/5'>
          <div className='flex items-center gap-2 text-emerald-400'>
            <Sparkles className='w-4 h-4 shrink-0' />
            <span className='text-xs font-semibold text-white'>
              {t('ctaPromptTitle')}
            </span>
          </div>
          <p className='text-[11px] text-zinc-400 leading-relaxed'>
            {t('ctaPromptDesc')}
          </p>
        </div>
      )}

      {/* Optional Error Alert Banner */}
      {error && (
        <div className='flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 px-3.5 py-2 text-rose-400 text-xs'>
          <AlertCircle className='w-4 h-4 shrink-0 text-rose-400' />
          <span className='leading-snug'>{error}</span>
        </div>
      )}

      {/* Chat Messages Log */}
      {messages.length > 0 && (
        <div
          role='log'
          aria-live='polite'
          aria-relevant='additions'
          aria-busy={isStreaming}
          className='flex flex-col gap-2.5 max-h-64 overflow-y-auto pr-1 py-1 scroll-smooth'
        >
          {messages.map((msg) => {
            if (msg.role === 'assistant' && !msg.content && msg.isStreaming) {
              return null;
            }
            return (
              <div
                key={msg.id}
                className={`flex gap-2 text-xs ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className='flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mt-0.5'>
                    <Sparkles className='w-3 h-3' />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 leading-relaxed whitespace-pre-line ${
                    msg.role === 'user'
                      ? 'bg-emerald-600 text-white font-medium rounded-br-xs shadow-sm'
                      : 'bg-zinc-950/90 border border-white/8 text-zinc-200 rounded-bl-xs'
                  }`}
                >
                  {msg.content}
                  {msg.role === 'assistant' && msg.isStreaming && (
                    <span
                      className='inline-block w-1.5 h-3.5 bg-emerald-400 ml-1 animate-pulse align-middle rounded-xs'
                      aria-hidden='true'
                    />
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className='flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 border border-white/10 mt-0.5'>
                    <User className='w-3 h-3' />
                  </div>
                )}
              </div>
            );
          })}

          {isStreaming &&
            messages.length > 0 &&
            messages[messages.length - 1].role === 'assistant' &&
            !messages[messages.length - 1].content && (
              <div className='flex items-center gap-2 text-xs text-zinc-400'>
                <div className='flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'>
                  <Sparkles className='w-3 h-3 animate-spin' />
                </div>
                <span className='italic text-[11px] text-emerald-400 animate-pulse font-mono'>
                  {t('aiTyping')}
                </span>
              </div>
            )}

          <div ref={messagesEndRef} aria-hidden='true' />
        </div>
      )}

      {/* Input Field Bar */}
      <form onSubmit={handleSend} className='relative flex items-center'>
        <input
          type='text'
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder={t('askPlaceholder')}
          aria-label={t('askPlaceholder')}
          disabled={isStreaming}
          className='w-full pl-3.5 pr-11 py-2.5 rounded-xl bg-zinc-950/90 border border-white/8 focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/50 text-white text-base sm:text-xs placeholder:text-zinc-500 outline-none transition-all disabled:opacity-60'
        />
        {isStreaming ? (
          <button
            type='button'
            onClick={stopGeneration}
            aria-label={t('stopAria')}
            className='absolute right-1.5 p-1.5 rounded-lg bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-white transition-colors cursor-pointer'
          >
            <Square className='w-3.5 h-3.5 fill-current' />
          </button>
        ) : (
          <button
            type='submit'
            disabled={!inputQuery.trim()}
            aria-label={t('sendAria')}
            className='absolute right-1.5 p-1.5 rounded-lg bg-emerald-500 text-zinc-950 hover:bg-emerald-400 disabled:opacity-30 disabled:hover:bg-emerald-500 transition-colors cursor-pointer disabled:cursor-not-allowed'
          >
            <Send className='w-3.5 h-3.5 stroke-[2.5]' />
          </button>
        )}
      </form>
    </section>
  );
};
