'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Loader2, Mic, Square, AlertCircle } from 'lucide-react';
import type { CreateKnowledgeInput } from '../types/dashboardTypes';
import { STARTER_TOPICS, type StarterTopicConfig } from './starterTopics';

export interface KnowledgeFormProps {
  spaceId: string;
  isSubmitting: boolean;
  title: string;
  setTitle: (title: string) => void;
  content: string;
  setContent: (content: string | ((prev: string) => string)) => void;
  onSubmit: (data: CreateKnowledgeInput) => Promise<boolean>;
  onValidationError: (msg: string) => void;
  isRecording?: boolean;
  isTranscribing?: boolean;
  durationSeconds?: number;
  voiceError?: string | null;
  onToggleVoice?: () => void;
}

export const KnowledgeForm: React.FC<KnowledgeFormProps> = ({
  spaceId,
  isSubmitting,
  title,
  setTitle,
  content,
  setContent,
  onSubmit,
  onValidationError,
  isRecording = false,
  isTranscribing = false,
  durationSeconds = 0,
  voiceError = null,
  onToggleVoice,
}) => {
  const t = useTranslations('dashboard');

  const [category, setCategory] = useState<
    'rules' | 'appliances' | 'parking' | 'recommendations' | 'general'
  >('appliances');
  const [activePlaceholder, setActivePlaceholder] = useState<string | null>(null);

  const handleSelectTopic = (topic: StarterTopicConfig) => {
    setTitle(t(topic.titleKey));
    setCategory(topic.category);
    setActivePlaceholder(t(topic.placeholderKey));
  };

  // Keyboard shortcut: Ctrl+M / Cmd+M toggles voice recording
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        if (onToggleVoice) {
          onToggleVoice();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleVoice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRecording && onToggleVoice) {
      onToggleVoice();
    }
    if (!content.trim()) {
      onValidationError(t('feedbackRequired'));
      return;
    }

    await onSubmit({
      spaceId,
      title: title.trim() || t('noteDefaultTitle'),
      content: content.trim(),
      category,
    });
  };

  return (
    <form onSubmit={handleSubmit} className='flex flex-col gap-3.5'>
      {/* 1-Click Topic Starter Badges for Hosts */}
      <div className='flex flex-col gap-1.5'>
        <span className='text-[11px] text-zinc-400 font-medium'>
          {t('starterTopicsTitle')}
        </span>
        <div className='flex flex-wrap gap-1.5'>
          {STARTER_TOPICS.map((topic) => (
            <button
              key={topic.id}
              type='button'
              onClick={() => handleSelectTopic(topic)}
              aria-label={t(topic.titleKey)}
              className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900/90 hover:bg-emerald-500/15 border border-white/10 hover:border-emerald-500/30 text-[11px] text-zinc-300 hover:text-emerald-400 transition-all cursor-pointer active:scale-95'
            >
              <span className='text-emerald-400 font-bold'>+</span>
              <span>{t(topic.chipKey)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
        <div className='flex flex-col gap-1.5'>
          <label htmlFor='knowledge-title' className='text-xs text-zinc-400'>
            {t('noteTitleLabel')}
          </label>
          <input
            id='knowledge-title'
            type='text'
            placeholder={t('noteTitlePlaceholder')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className='w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs placeholder-zinc-600 focus:outline-none focus:border-emerald-500'
          />
        </div>

        <div className='flex flex-col gap-1.5'>
          <label htmlFor='knowledge-category' className='text-xs text-zinc-400'>
            {t('categoryLabel')}
          </label>
          <select
            id='knowledge-category'
            value={category}
            onChange={(e) =>
              setCategory(
                e.target.value as
                  | 'rules'
                  | 'appliances'
                  | 'parking'
                  | 'recommendations'
                  | 'general',
              )
            }
            className='w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500 cursor-pointer'
          >
            <option value='appliances'>{t('catAppliances')}</option>
            <option value='parking'>{t('catParking')}</option>
            <option value='rules'>{t('catRules')}</option>
            <option value='recommendations'>{t('catRecommendations')}</option>
            <option value='general'>{t('catGeneral')}</option>
          </select>
        </div>
      </div>

      <div className='flex flex-col gap-1.5'>
        <div className='flex items-center justify-between'>
          <label htmlFor='knowledge-content' className='text-xs text-zinc-400'>
            {t('noteContentLabel')}
          </label>
          {onToggleVoice && (
            <span className='text-[11px] text-zinc-500 hidden sm:inline-block'>
              Ctrl+M {t('dictationShortcutNote') || 'за глас'}
            </span>
          )}
        </div>

        {voiceError && (
          <div className='flex items-start gap-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs animate-fadeIn'>
            <AlertCircle className='w-4 h-4 shrink-0 mt-0.5' />
            <span className='flex-1 leading-snug'>{voiceError}</span>
          </div>
        )}

        {isRecording && (
          <div className='flex items-center justify-between gap-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs animate-pulse'>
            <div className='flex items-center gap-2'>
              <span className='w-2 h-2 rounded-full bg-red-500 animate-ping' />
              <span className='font-medium'>
                {t('voiceRecordingNotice')} ({Math.floor(durationSeconds / 60)}:
                {(durationSeconds % 60).toString().padStart(2, '0')} / 3:00)
              </span>
            </div>
            {onToggleVoice && (
              <button
                type='button'
                onClick={onToggleVoice}
                className='px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 font-semibold text-[11px] transition-all cursor-pointer'
              >
                {t('voiceStopPrompt')}
              </button>
            )}
          </div>
        )}

        {isTranscribing && (
          <div className='flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs'>
            <Loader2 className='w-4 h-4 animate-spin shrink-0' />
            <span>{t('voiceProcessing')}</span>
          </div>
        )}

        {/* Textarea with integrated Antigravity-style circular microphone button */}
        <div className='relative'>
          <textarea
            id='knowledge-content'
            required
            rows={4}
            placeholder={activePlaceholder || t('noteContentPlaceholder')}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className='w-full px-3.5 py-2.5 pb-11 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs placeholder-zinc-600 focus:outline-none focus:border-emerald-500 resize-none leading-relaxed'
          />

          {/* Antigravity-style circular microphone button */}
          {onToggleVoice && (
            <div className='absolute right-2.5 bottom-2.5 flex items-center gap-1.5'>
              <button
                type='button'
                onClick={onToggleVoice}
                disabled={isTranscribing}
                title={
                  isRecording
                    ? t('voiceStopBtn')
                    : isTranscribing
                    ? t('voiceProcessing')
                    : 'Record Audio (Ctrl+M) — Диктуване с микрофон'
                }
                aria-label={
                  isRecording ? t('voiceStopBtn') : t('voiceRecordBtn')
                }
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  isRecording
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse hover:bg-red-500/30'
                    : isTranscribing
                    ? 'bg-zinc-800 text-zinc-400 border border-white/10 cursor-wait'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-white/10 hover:border-white/20'
                }`}
              >
                {isTranscribing ? (
                  <Loader2 className='w-3.5 h-3.5 animate-spin' />
                ) : isRecording ? (
                  <Square className='w-3 h-3 fill-current' />
                ) : (
                  <Mic className='w-4 h-4' />
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <button
        type='submit'
        disabled={isSubmitting || isTranscribing}
        aria-label={t('addCard')}
        className='inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer self-start'
      >
        {isSubmitting ? (
          <>
            <Loader2 className='w-3.5 h-3.5 animate-spin' />
            <span>{t('adding')}</span>
          </>
        ) : (
          <>
            <Plus className='w-3.5 h-3.5' />
            <span>{t('addCard')}</span>
          </>
        )}
      </button>
    </form>
  );
};
