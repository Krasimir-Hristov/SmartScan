'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { X, Sparkles, Loader2, AlertTriangle } from 'lucide-react';
import type { Space } from '@/lib/types/databaseTypes';
import { triggerHaptic } from '@/lib/utils';
import { createSpaceAction } from '../actions/spaceActions';
import { SpaceCredentialsFields } from './space-editor/SpaceCredentialsFields';
import {
  createEmptySpaceFormValues,
  toCreateSpaceInput,
  type SpaceFormField,
  type SpaceFormValues,
} from './space-editor/spaceFormModel';
import { useModalFocus } from '../hooks/useModalFocus';

export interface SpaceCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSpaceCreated: (space: Space) => void;
}

export const SpaceCreateModal: React.FC<SpaceCreateModalProps> = ({
  isOpen,
  onClose,
  onSpaceCreated,
}) => {
  const t = useTranslations('dashboard');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [values, setValues] = useState<SpaceFormValues>(createEmptySpaceFormValues);
  const [copiedWifi, setCopiedWifi] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const resetForm = useCallback(() => {
    setValues(createEmptySpaceFormValues());
    setErrorMessage(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  useModalFocus(isOpen, dialogRef);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const handleFieldChange = <K extends SpaceFormField>(
    field: K,
    value: SpaceFormValues[K],
  ) => {
    setValues((previous) => ({ ...previous, [field]: value }));
  };

  const handleCopyWifiPassword = async () => {
    if (!values.wifiPassword) return;
    try {
      await navigator.clipboard.writeText(values.wifiPassword);
      setCopiedWifi(true);
      triggerHaptic(50);
      setTimeout(() => setCopiedWifi(false), 2000);
    } catch {
      // Clipboard fallback
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.name.trim()) {
      setErrorMessage(t('errorNameRequired'));
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await createSpaceAction(toCreateSpaceInput(values));

      if (result.success && result.data) {
        triggerHaptic(50);
        onSpaceCreated(result.data);
        resetForm();
        onClose();
      } else {
        setErrorMessage(result.error || t('errorGeneral'));
      }
    } catch {
      setErrorMessage(t('errorServer'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6'>
      <div
        className='absolute inset-0 bg-zinc-950/80 backdrop-blur-sm cursor-pointer'
        onClick={handleClose}
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role='dialog'
        aria-modal='true'
        aria-labelledby='create-space-title'
        className='relative w-full max-w-2xl max-h-[90vh] bg-[#121216] border border-white/10 rounded-3xl shadow-2xl overflow-y-auto custom-scrollbar flex flex-col focus:outline-none'
      >
        <div className='sticky top-0 z-10 flex items-center justify-between px-6 py-5 bg-[#121216]/95 backdrop-blur-md border-b border-white/5'>
          <div className='flex flex-col gap-1'>
            <h2 id='create-space-title' className='text-xl font-display font-bold text-white flex items-center gap-2'>
              <Sparkles className='w-5 h-5 text-emerald-400' />
              <span>{t('createSpace')}</span>
            </h2>
            <p className='text-xs text-zinc-400'>{t('createSpaceDesc')}</p>
          </div>
          <button
            onClick={handleClose}
            aria-label={t('close')}
            className='p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        <form onSubmit={handleSubmit} className='p-6 flex flex-col gap-8'>
          {errorMessage && (
            <div className='p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2'>
              <AlertTriangle className='w-4 h-4 shrink-0 mt-px' />
              <span>{errorMessage}</span>
            </div>
          )}

          <SpaceCredentialsFields
            values={values}
            onChange={handleFieldChange}
            copiedWifi={copiedWifi}
            onCopyWifiPassword={handleCopyWifiPassword}
          />

          {/* Modal Actions */}
          <div className='flex items-center justify-end gap-3 pt-4 border-t border-white/8 sticky bottom-0 bg-zinc-950/60 pb-2'>
            <button
              type='button'
              onClick={handleClose}
              disabled={isSubmitting}
              className='px-4 py-2.5 rounded-xl border border-white/10 text-zinc-300 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors disabled:cursor-not-allowed cursor-pointer'
            >
              {t('cancel')}
            </button>
            <button
              type='submit'
              disabled={isSubmitting}
              className='inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
            >
              {isSubmitting ? (
                <>
                  <Loader2 className='w-4 h-4 animate-spin' />
                  <span>{t('creating')}</span>
                </>
              ) : (
                <span>{t('createSpace')}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
