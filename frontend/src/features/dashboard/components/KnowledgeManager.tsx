'use client';

import React, { useState, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Sparkles, Check, Mic, Square, Loader2 } from 'lucide-react';
import type { KnowledgeChunk } from '@/lib/types/databaseTypes';
import { triggerHaptic } from '@/lib/utils';
import { useVoiceRecorder } from '@/features/voice-ingest';
import {
  addKnowledgeChunkAction,
  deleteKnowledgeChunkAction,
  getSpaceKnowledgeChunksAction,
} from '../actions/spaceActions';
import type { CreateKnowledgeInput } from '../types/dashboardTypes';
import { KnowledgeChunkList } from './KnowledgeChunkList';
import { KnowledgeForm } from './KnowledgeForm';

export interface KnowledgeManagerProps {
  spaceId: string;
  initialChunks?: KnowledgeChunk[];
}

export const KnowledgeManager: React.FC<KnowledgeManagerProps> = ({
  spaceId,
  initialChunks = [],
}) => {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const [chunks, setChunks] = useState<KnowledgeChunk[]>(initialChunks);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const {
    isRecording,
    isTranscribing,
    durationSeconds,
    error: voiceError,
    startRecording,
    stopRecording,
  } = useVoiceRecorder({
    language: locale,
    onTranscript: (text) => {
      setContent((prev) => (prev ? `${prev.trim()}\n${text}` : text));
      setTitle((prev) => prev || t('noteDefaultTitle'));
      triggerHaptic(50);
    },
    onError: () => {
      triggerHaptic(100);
    },
  });

  const handleToggleVoice = useCallback(() => {
    triggerHaptic(40);
    if (isRecording) {
      void stopRecording();
    } else {
      void startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  React.useEffect(() => {
    let isCancelled = false;
    // Always sync on mount and on every space switch
    getSpaceKnowledgeChunksAction(spaceId).then((result) => {
      if (!isCancelled && result.success && result.data) {
        setChunks(result.data);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [spaceId]);

  const handleAddChunk = async (input: CreateKnowledgeInput): Promise<boolean> => {
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const result = await addKnowledgeChunkAction(input);

      if (result.success && result.data) {
        setChunks((prev) => [result.data as KnowledgeChunk, ...prev]);
        setTitle('');
        setContent('');
        setFeedback({
          type: 'success',
          text: t('feedbackSuccess'),
        });
        triggerHaptic(50);
        setTimeout(() => setFeedback(null), 3000);
        return true;
      } else {
        setFeedback({
          type: 'error',
          text: result.error || t('feedbackSaveError'),
        });
        return false;
      }
    } catch {
      setFeedback({ type: 'error', text: t('feedbackServerError') });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteChunk = async (chunkId: string) => {
    setDeletingId(chunkId);
    setFeedback(null);
    try {
      const result = await deleteKnowledgeChunkAction(chunkId, spaceId);
      if (result.success) {
        setChunks((prev) => prev.filter((c) => c.id !== chunkId));
        triggerHaptic(40);
      } else {
        setFeedback({
          type: 'error',
          text: result.error || t('feedbackSaveError'),
        });
      }
    } catch {
      setFeedback({
        type: 'error',
        text: t('feedbackServerError'),
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className='p-5 sm:p-7 rounded-3xl bg-[#121216] border border-white/8 flex flex-col gap-6 shadow-2xl'>
      {/* Header with prominent voice button ("микрофончето там отгоре") */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/8'>
        <div className='flex flex-col gap-1'>
          <div className='flex items-center gap-2'>
            <div className='w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400'>
              <Sparkles className='w-4 h-4' />
            </div>
            <h2 className='font-display text-lg font-bold text-white'>
              {t('knowledgeTitle')}
            </h2>
          </div>
          <p className='text-xs text-zinc-400'>{t('knowledgeSub')}</p>
        </div>

        {/* Top voice button */}
        <button
          type='button'
          onClick={handleToggleVoice}
          disabled={isTranscribing}
          aria-label={isRecording ? t('voiceStopBtn') : t('voiceRecordBtn')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 self-start sm:self-auto ${
            isRecording
              ? 'bg-red-500/20 text-red-400 border border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse hover:bg-red-500/30'
              : isTranscribing
              ? 'bg-zinc-800 text-zinc-400 border border-white/10 cursor-wait'
              : 'bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400'
          }`}
        >
          {isTranscribing ? (
            <>
              <Loader2 className='w-3.5 h-3.5 animate-spin' />
              <span>{t('voiceProcessing')}</span>
            </>
          ) : isRecording ? (
            <>
              <Square className='w-3 h-3 fill-current' />
              <span>
                {t('voiceStopBtn')} ({Math.floor(durationSeconds / 60)}:
                {(durationSeconds % 60).toString().padStart(2, '0')})
              </span>
            </>
          ) : (
            <>
              <Mic className='w-3.5 h-3.5' />
              <span>{t('voiceRecordBtn')}</span>
            </>
          )}
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}
        >
          {feedback.type === 'success' && (
            <Check className='w-4 h-4 shrink-0' />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Input Form with integrated speech dictation */}
      <KnowledgeForm
        spaceId={spaceId}
        isSubmitting={isSubmitting}
        title={title}
        setTitle={setTitle}
        content={content}
        setContent={setContent}
        onSubmit={handleAddChunk}
        onValidationError={(msg) => setFeedback({ type: 'error', text: msg })}
        isRecording={isRecording}
        isTranscribing={isTranscribing}
        durationSeconds={durationSeconds}
        voiceError={voiceError}
        onToggleVoice={handleToggleVoice}
      />

      {/* Saved Knowledge List */}
      <div className='flex flex-col gap-3 pt-4 border-t border-white/8'>
        <div className='flex items-center justify-between'>
          <span className='text-xs font-semibold uppercase tracking-wider text-zinc-400'>
            {t('savedCards', { count: chunks.length })}
          </span>
        </div>

        <KnowledgeChunkList
          chunks={chunks}
          deletingId={deletingId}
          onDeleteChunk={handleDeleteChunk}
        />
      </div>
    </div>
  );
};
