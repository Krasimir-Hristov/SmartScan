'use client';

import React from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Sparkles,
  Wand2,
} from 'lucide-react';
import type { ContactMessage } from '@/lib/types/databaseTypes';

export interface ContactAiTriageCardProps {
  message: ContactMessage;
  isTriaging: boolean;
  onRunTriage: () => void;
  onApplySuggestedReply: (suggestedText: string) => void;
}

const SENTIMENT_META: Record<
  string,
  { label: string; badgeClass: string; dotClass: string }
> = {
  positive: {
    label: 'Позитивен / B2B Интерес',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35',
    dotClass: 'bg-emerald-400',
  },
  neutral: {
    label: 'Информативно запитване',
    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/35',
    dotClass: 'bg-sky-400',
  },
  frustrated: {
    label: 'Затруднение / Нужда от помощ',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/35',
    dotClass: 'bg-amber-400',
  },
  urgent: {
    label: 'Спешен казус / Критичен',
    badgeClass: 'bg-red-500/15 text-red-300 border-red-500/35',
    dotClass: 'bg-red-400',
  },
};

export const ContactAiTriageCard: React.FC<ContactAiTriageCardProps> = ({
  message,
  isTriaging,
  onRunTriage,
  onApplySuggestedReply,
}) => {
  const hasAnalysis = Boolean(message.ai_summary || message.ai_suggested_reply);
  const sentimentKey = (message.ai_sentiment || 'neutral').toLowerCase();
  const sentimentInfo = SENTIMENT_META[sentimentKey] || SENTIMENT_META.neutral;

  return (
    <section
      aria-label="AI Triaging и Анализ на запитването"
      className="rounded-2xl border border-emerald-500/30 bg-linear-to-br from-emerald-950/30 via-zinc-900/90 to-zinc-950 p-5 shadow-lg"
    >
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
            <Bot className="w-4 h-4 text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                AI Triaging & Анализ
              </h3>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-zinc-900 text-zinc-400 border border-zinc-800">
                Gemini 2.5 Flash
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Автоматично резюмиране, определяне на сантимент и чернова на езика на клиента
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRunTriage}
          disabled={isTriaging}
          aria-label={hasAnalysis ? 'Обнови AI анализа' : 'Генерирай AI анализ'}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-all cursor-pointer shadow-md shadow-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isTriaging ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-950" />
          ) : hasAnalysis ? (
            <RefreshCw className="w-3.5 h-3.5 text-zinc-950" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-zinc-950" />
          )}
          <span>
            {isTriaging
              ? 'Gemini анализира...'
              : hasAnalysis
                ? 'Прегенерирай AI анализ'
                : '✨ Анализирай с Gemini Flash'}
          </span>
        </button>
      </div>

      {!hasAnalysis ? (
        <div className="rounded-xl border border-dashed border-emerald-500/25 bg-zinc-950/60 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Това запитване все още няма генериран AI анализ. Натисни бутона горе, за
              да получиш резюме, сантимент и готова чернова за отговор.
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Sentiment & Priority Badges + Summary */}
          <div className="rounded-xl bg-zinc-950/80 border border-zinc-800/90 p-4 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${sentimentInfo.badgeClass}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${sentimentInfo.dotClass}`} />
                Сантимент: {sentimentInfo.label}
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-900 text-zinc-300 border border-zinc-700">
                Приоритет: <strong className="uppercase">{message.priority}</strong>
              </span>
            </div>

            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                Резюме за собственика (ai_summary):
              </span>
              <p className="text-xs sm:text-sm text-zinc-100 font-medium leading-relaxed">
                {message.ai_summary}
              </p>
            </div>
          </div>

          {/* Suggested Draft Reply Preview */}
          {message.ai_suggested_reply && (
            <div className="rounded-xl bg-zinc-950/80 border border-emerald-500/20 p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Предложена чернова за отговор (ai_suggested_reply)
                </span>
                <button
                  type="button"
                  onClick={() => onApplySuggestedReply(message.ai_suggested_reply || '')}
                  aria-label="Зареди AI черновата в полето за отговор"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer"
                >
                  <Wand2 className="w-3 h-3" />
                  <span>Използвай черновата в редактора ↓</span>
                </button>
              </div>
              <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/80 max-h-40 overflow-y-auto">
                {message.ai_suggested_reply}
              </pre>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
