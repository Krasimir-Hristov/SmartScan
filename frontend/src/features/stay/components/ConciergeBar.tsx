'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Sparkles, Flame, Trash2, Car, UtensilsCrossed, Send, Bot, User, RotateCcw } from 'lucide-react';
import { useHaptic } from '../hooks/useHaptic';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
}

export const ConciergeBar: React.FC = () => {
  const t = useTranslations('stay');
  const { triggerHaptic } = useHaptic();

  const [inputQuery, setInputQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const chips = [
    {
      id: 'heating',
      label: t('chipHeating'),
      icon: Flame,
      answer: t('demoAnswerHeating'),
    },
    {
      id: 'trash',
      label: t('chipTrash'),
      icon: Trash2,
      answer: t('demoAnswerTrash'),
    },
    {
      id: 'parking',
      label: t('chipParking'),
      icon: Car,
      answer: t('demoAnswerParking'),
    },
    {
      id: 'dining',
      label: t('chipDining'),
      icon: UtensilsCrossed,
      answer: t('demoAnswerDining'),
    },
  ];

  const msgCounterRef = React.useRef(0);
  const nextId = (prefix: string): string => {
    msgCounterRef.current += 1;
    return `${prefix}-${msgCounterRef.current}`;
  };

  const handleChipClick = (label: string, answer: string) => {
    triggerHaptic(50);
    const userMsg: ChatMessage = {
      id: nextId('user'),
      sender: 'user',
      text: label,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      const aiMsg: ChatMessage = {
        id: nextId('ai'),
        sender: 'ai',
        text: answer,
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
      triggerHaptic(50);
    }, 450);
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = inputQuery.trim();
    if (!query) return;

    triggerHaptic(50);
    const userMsg: ChatMessage = {
      id: nextId('user'),
      sender: 'user',
      text: query,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsTyping(true);

    setTimeout(() => {
      // Find matching chip answer or default fallback
      const lower = query.toLowerCase();
      let answer = t('demoAnswerDefault');
      if (lower.includes('heat') || lower.includes('парн') || lower.includes('warm') || lower.includes('thermostat')) {
        answer = t('demoAnswerHeating');
      } else if (lower.includes('trash') || lower.includes('боклук') || lower.includes('müll') || lower.includes('poubelle')) {
        answer = t('demoAnswerTrash');
      } else if (lower.includes('park') || lower.includes('паркинг') || lower.includes('auto') || lower.includes('car')) {
        answer = t('demoAnswerParking');
      } else if (lower.includes('food') || lower.includes('ресторант') || lower.includes('механ') || lower.includes('dine') || lower.includes('eat')) {
        answer = t('demoAnswerDining');
      }

      const aiMsg: ChatMessage = {
        id: nextId('ai'),
        sender: 'ai',
        text: answer,
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
      triggerHaptic(50);
    }, 550);
  };

  const handleClear = () => {
    triggerHaptic(30);
    setMessages([]);
    setIsTyping(false);
  };

  return (
    <section
      aria-labelledby="concierge-heading"
      className="relative overflow-hidden rounded-2xl bg-[#121216] border border-emerald-500/30 p-4 sm:p-5 shadow-2xl flex flex-col gap-4"
    >
      {/* Subtle top glow */}
      <div
        className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-20 bg-emerald-500/15 blur-2xl"
        aria-hidden="true"
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-xs shadow-emerald-500/30">
            <Bot className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex flex-col">
            <span id="concierge-heading" className="text-xs font-bold text-white font-display tracking-tight">
              {t('conciergeTitle')}
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">
              {t('conciergeSubtitle')}
            </span>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{t('clearChat')}</span>
          </button>
        )}
      </div>

      {/* Quick Prompt Chips */}
      <div className="flex flex-wrap gap-1.5">
        {chips.map((chip) => {
          const Icon = chip.icon;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => handleChipClick(chip.label, chip.answer)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-950/80 border border-white/[0.08] hover:border-emerald-500/40 text-zinc-300 hover:text-white text-xs font-medium transition-all duration-150 cursor-pointer active:scale-95"
            >
              <Icon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">{chip.label}</span>
            </button>
          );
        })}
      </div>

      {/* Chat Messages Log */}
      {messages.length > 0 && (
        <div className="flex flex-col gap-2.5 max-h-64 overflow-y-auto pr-1 py-1">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 text-xs ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.sender === 'ai' && (
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mt-0.5">
                  <Sparkles className="w-3 h-3" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-xl px-3.5 py-2.5 leading-relaxed whitespace-pre-line ${
                  msg.sender === 'user'
                    ? 'bg-emerald-600 text-white font-medium rounded-br-xs shadow-sm'
                    : 'bg-zinc-950/90 border border-white/[0.08] text-zinc-200 rounded-bl-xs'
                }`}
              >
                {msg.text}
              </div>
              {msg.sender === 'user' && (
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 border border-white/10 mt-0.5">
                  <User className="w-3 h-3" />
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Sparkles className="w-3 h-3 animate-spin" />
              </div>
              <span className="italic text-[11px] text-emerald-400 animate-pulse font-mono">
                AI is typing...
              </span>
            </div>
          )}
        </div>
      )}

      {/* Input Field Bar */}
      <form onSubmit={handleSend} className="relative flex items-center">
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder={t('askPlaceholder')}
          className="w-full pl-3.5 pr-11 py-2.5 rounded-xl bg-zinc-950/90 border border-white/[0.08] focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/50 text-white text-base sm:text-xs placeholder:text-zinc-500 outline-none transition-all"
        />
        <button
          type="submit"
          disabled={!inputQuery.trim()}
          aria-label={t('sendAria')}
          className="absolute right-1.5 p-1.5 rounded-lg bg-emerald-500 text-zinc-950 hover:bg-emerald-400 disabled:opacity-30 disabled:hover:bg-emerald-500 transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          <Send className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      </form>
    </section>
  );
};
