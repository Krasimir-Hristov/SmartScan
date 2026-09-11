'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { triggerHaptic } from '@/lib/utils';
import {
  Wifi,
  Check,
  Copy,
  Send,
  Sparkles,
  Clock,
  Waves,
} from 'lucide-react';

export interface MobileMockupProps {
  onOpenDemo: () => void;
}

export const MobileMockup: React.FC<MobileMockupProps> = ({ onOpenDemo }) => {
  const t = useTranslations('showcase');
  const [copiedWifi, setCopiedWifi] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([
    {
      sender: 'guest',
      text: t('chatGuestQuestion'),
      time: '19:42',
    },
    {
      sender: 'ai',
      text: t('chatAiResponse'),
      time: '19:42',
    },
  ]);

  const handleCopyWifi = () => {
    triggerHaptic(60);
    try {
      navigator.clipboard.writeText('Sanctuary_5G_Guest_2026');
      setCopiedWifi(true);
      setTimeout(() => setCopiedWifi(false), 2200);
    } catch {
      setCopiedWifi(true);
      setTimeout(() => setCopiedWifi(false), 2200);
    }
  };

  const handleSendSample = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    const userText = chatMessage;
    setChatMessage('');

    setChatHistory((prev) => [
      ...prev,
      { sender: 'guest', text: userText, time: 'Now' },
    ]);

    setTimeout(() => {
      setChatHistory((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: t('chatAiResponse'),
          time: 'Now',
        },
      ]);
      triggerHaptic(40);
    }, 600);
  };

  return (
    <div className="flex flex-col justify-between rounded-3xl bg-zinc-950/80 border border-emerald-500/20 p-6 sm:p-8 shadow-2xl shadow-emerald-950/20 hover:border-emerald-500/40 transition-all">
      <div>
        {/* Header Label */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <span className="font-mono text-xs font-bold tracking-wider uppercase text-emerald-400">
            {t('mobileTag')}
          </span>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 text-[11px] font-medium font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{t('mobileAiBadge')}</span>
          </div>
        </div>

        {/* Smartphone Inner Frame */}
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 sm:p-5 shadow-inner">
          {/* Villa Mini Header */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h4 className="font-display text-sm font-bold text-white">Villa 1904 Sanctuary</h4>
                <p className="text-[11px] text-zinc-400 font-sans">{t('mobileSubtitle')}</p>
              </div>
            </div>
            <span className="text-[11px] font-mono font-medium text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/20">
              {t('mobileOnline')}
            </span>
          </div>

          {/* 1-Tap Quick Action Pills */}
          <div className="py-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopyWifi}
              aria-label="1-Tap Copy Wi-Fi Password"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer active:scale-95"
            >
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t('mobileWifi')}</span>
              {copiedWifi ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-zinc-400" />
              )}
            </button>

            <div className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-800/80 text-zinc-300 border border-zinc-700/60">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('mobileCheckout')}</span>
            </div>

            <div className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-800/80 text-zinc-300 border border-zinc-700/60">
              <Waves className="w-3.5 h-3.5 text-teal-400" />
              <span>{t('mobilePoolRules')}</span>
            </div>
          </div>

          {/* Interactive Simulated Chat Feed */}
          <div className="flex flex-col gap-3 py-2 max-h-52 overflow-y-auto pr-1">
            {chatHistory.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col ${
                  msg.sender === 'guest' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`rounded-2xl px-3.5 py-2.5 text-xs max-w-[85%] leading-relaxed font-sans ${
                    msg.sender === 'guest'
                      ? 'bg-zinc-800 text-zinc-100 rounded-br-xs'
                      : 'bg-emerald-950/80 text-emerald-100 border border-emerald-500/30 rounded-bl-xs'
                  }`}
                >
                  {msg.sender === 'ai' && (
                    <div className="flex items-center gap-1 text-[10px] font-mono font-semibold text-emerald-400 uppercase tracking-wider mb-1">
                      <Sparkles className="w-3 h-3" />
                      <span>AI Concierge</span>
                    </div>
                  )}
                  {msg.text}
                </div>
                <span className="text-[10px] text-zinc-500 mt-0.5 px-1 font-mono">{msg.time}</span>
              </div>
            ))}
          </div>

          {/* Simulated Chat Input Box */}
          <form onSubmit={handleSendSample} className="mt-3 relative flex items-center">
            <input
              type="text"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              placeholder={t('chatInputPlaceholder')}
              aria-label={t('chatInputPlaceholder')}
              className="w-full rounded-xl bg-zinc-950 border border-zinc-700/80 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-emerald-500 pr-10 font-sans"
            />
            <button
              type="submit"
              aria-label="Send test question"
              className="absolute right-1.5 p-1.5 rounded-lg bg-emerald-500 text-zinc-950 hover:bg-emerald-400 transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="mt-6 pt-6 border-t border-zinc-900 flex items-center justify-between">
        <span className="text-xs text-zinc-500 font-mono">{t('mobileFooter')}</span>
        <button
          type="button"
          onClick={onOpenDemo}
          aria-label={t('mobileAction')}
          className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
        >
          {t('mobileAction')}
        </button>
      </div>
    </div>
  );
};
