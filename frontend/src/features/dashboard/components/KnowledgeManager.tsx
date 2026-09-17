'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Sparkles,
  BookOpen,
  Plus,
  Trash2,
  Tag,
  Loader2,
  Flame,
  Car,
  Utensils,
  ShieldCheck,
  Check,
} from 'lucide-react';
import type { KnowledgeChunk } from '@/lib/types/databaseTypes';
import { triggerHaptic } from '@/lib/utils';
import {
  addKnowledgeChunkAction,
  deleteKnowledgeChunkAction,
  getSpaceKnowledgeChunksAction,
} from '../actions/spaceActions';

export interface KnowledgeManagerProps {
  spaceId: string;
  initialChunks?: KnowledgeChunk[];
}

export const KnowledgeManager: React.FC<KnowledgeManagerProps> = ({
  spaceId,
  initialChunks = [],
}) => {
  const t = useTranslations('dashboard');
  const [chunks, setChunks] = useState<KnowledgeChunk[]>(initialChunks);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<
    'rules' | 'appliances' | 'parking' | 'recommendations' | 'general'
  >('appliances');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  React.useEffect(() => {
    let isCancelled = false;
    // Always sync on mount and on every space switch: the initialChunks prop
    // is server-rendered for a single space only and goes stale after
    // additions, deletions or switching spaces.
    getSpaceKnowledgeChunksAction(spaceId).then((result) => {
      if (!isCancelled && result.success && result.data) {
        setChunks(result.data);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [spaceId]);

  const handleAddChunk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setFeedback({
        type: 'error',
        text: t('feedbackRequired'),
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const result = await addKnowledgeChunkAction({
        spaceId,
        title: title.trim() || t('noteDefaultTitle'),
        content: content.trim(),
        category,
      });

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
      } else {
        setFeedback({
          type: 'error',
          text: result.error || t('feedbackSaveError'),
        });
      }
    } catch {
      setFeedback({ type: 'error', text: t('feedbackServerError') });
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

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'appliances':
        return <Flame className='w-3.5 h-3.5 text-amber-400' />;
      case 'parking':
        return <Car className='w-3.5 h-3.5 text-blue-400' />;
      case 'recommendations':
        return <Utensils className='w-3.5 h-3.5 text-rose-400' />;
      case 'rules':
        return <ShieldCheck className='w-3.5 h-3.5 text-purple-400' />;
      default:
        return <Tag className='w-3.5 h-3.5 text-emerald-400' />;
    }
  };

  return (
    <div className='p-5 sm:p-7 rounded-3xl bg-[#121216] border border-white/8 flex flex-col gap-6 shadow-2xl'>
      {/* Header */}
      <div className='flex flex-col gap-1 pb-4 border-b border-white/8'>
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

      {/* Input Form */}
      <form onSubmit={handleAddChunk} className='flex flex-col gap-3.5'>
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
            <label
              htmlFor='knowledge-category'
              className='text-xs text-zinc-400'
            >
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
          <label htmlFor='knowledge-content' className='text-xs text-zinc-400'>
            {t('noteContentLabel')}
          </label>
          <textarea
            id='knowledge-content'
            required
            rows={4}
            placeholder={t('noteContentPlaceholder')}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className='w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs placeholder-zinc-600 focus:outline-none focus:border-emerald-500 resize-none leading-relaxed'
          />
        </div>

        <button
          type='submit'
          disabled={isSubmitting}
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

      {/* Saved Knowledge List */}
      <div className='flex flex-col gap-3 pt-4 border-t border-white/8'>
        <div className='flex items-center justify-between'>
          <span className='text-xs font-semibold uppercase tracking-wider text-zinc-400'>
            {t('savedCards', { count: chunks.length })}
          </span>
        </div>

        {chunks.length === 0 ? (
          <div className='p-6 rounded-2xl bg-zinc-900/40 border border-dashed border-white/10 text-center flex flex-col items-center gap-2 text-zinc-500 text-xs'>
            <BookOpen className='w-5 h-5 text-zinc-600' />
            <p>{t('noCards')}</p>
          </div>
        ) : (
          <div className='flex flex-col gap-2.5 max-h-360px overflow-y-auto pr-1'>
            {chunks.map((chunk) => (
              <div
                key={chunk.id}
                className='p-3.5 rounded-2xl bg-zinc-900/60 border border-white/8 hover:border-white/15 flex flex-col gap-1.5 transition-colors group'
              >
                <div className='flex items-center justify-between gap-2'>
                  <div className='flex items-center gap-2'>
                    {getCategoryIcon(chunk.category)}
                    <span className='text-xs font-semibold text-white'>
                      {chunk.title}
                    </span>
                  </div>
                  <button
                    type='button'
                    onClick={() => handleDeleteChunk(chunk.id)}
                    disabled={deletingId === chunk.id}
                    aria-label={t('deleteCard')}
                    className='opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer disabled:cursor-not-allowed'
                  >
                    {deletingId === chunk.id ? (
                      <Loader2 className='w-3.5 h-3.5 animate-spin' />
                    ) : (
                      <Trash2 className='w-3.5 h-3.5' />
                    )}
                  </button>
                </div>
                <p className='text-xs text-zinc-400 leading-relaxed'>
                  {chunk.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
