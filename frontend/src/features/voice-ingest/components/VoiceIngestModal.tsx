'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Mic, Square, Loader2, AlertCircle, Sparkles, RotateCcw } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { VoiceIngestHeader } from './VoiceIngestHeader';
import type { IngestTextResponse } from '../types/voiceIngestTypes';
import { triggerHaptic } from '@/lib/utils';

export interface VoiceIngestModalProps {
  isOpen: boolean;
  spaceId: string;
  onClose: () => void;
  onSuccess: (savedCount: number) => void;
}

const LOCALE_TO_SPEECH_LANG: Record<string, string> = {
  bg: 'bg-BG',
  en: 'en-US',
  de: 'de-DE',
  ro: 'ro-RO',
  el: 'el-GR',
  ru: 'ru-RU',
  tr: 'tr-TR',
  es: 'es-ES',
  it: 'it-IT',
  fr: 'fr-FR',
};

export const VoiceIngestModal: React.FC<VoiceIngestModalProps> = ({
  isOpen,
  spaceId,
  onClose,
  onSuccess,
}) => {
  const t = useTranslations('voiceIngest');
  const locale = useLocale();
  const speechLang = LOCALE_TO_SPEECH_LANG[locale] || 'bg-BG';

  const {
    isListening,
    transcript,
    interimTranscript,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript,
    setTranscript,
  } = useSpeechRecognition();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
    stopListening();
    onClose();
  }, [stopListening, onClose]);

  // Keyboard accessibility: Escape closes if not saving
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSaving, handleClose]);

  const handleToggleMic = () => {
    setErrorMessage(null);
    triggerHaptic(40);
    if (isListening) {
      stopListening();
    } else {
      startListening(speechLang);
    }
  };

  const handleSave = async () => {
    const fullText = transcript.trim();
    if (!fullText) {
      setErrorMessage(t('noTextToSave'));
      return;
    }

    stopListening();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/py/knowledge/ingest-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          space_id: spaceId,
          raw_text: fullText,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as { detail?: string };
        const detail = errorData.detail || t('networkError');
        setErrorMessage(detail);
        setIsSaving(false);
        return;
      }

      const data = (await response.json()) as IngestTextResponse;
      triggerHaptic(80);
      onSuccess(data.cards_count || 1);
      onClose();
    } catch {
      setErrorMessage(t('networkError'));
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const activeError = errorMessage || speechError;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-modal-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-xl bg-[#121216] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]"
      >
        {/* Header */}
        <VoiceIngestHeader
          onClose={handleClose}
          disabled={isSaving}
          t={t}
        />

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Error Banner */}
          {activeError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{activeError}</span>
            </div>
          )}

          {/* Prompt & Microphone Toggle */}
          <div className="text-center space-y-4">
            <p className="text-zinc-300 text-xs max-w-md mx-auto leading-relaxed">
              {t('recordingInstruction')}
            </p>

            <div className="flex flex-col items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleToggleMic}
                disabled={isSaving}
                aria-label={isListening ? t('stopRecordAria') : t('startRecordAria')}
                className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                  isListening
                    ? 'bg-red-500 text-white shadow-[0_0_30px_rgba(239,68,68,0.5)] animate-pulse'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:scale-105'
                }`}
              >
                {isListening ? (
                  <Square className="w-7 h-7 fill-current" />
                ) : (
                  <Mic className="w-8 h-8" />
                )}
              </button>

              <div className="flex items-center gap-2 text-xs">
                {isListening ? (
                  <span className="text-emerald-400 font-medium flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    {t('listening')}
                  </span>
                ) : (
                  <span className="text-zinc-400 text-[11px]">
                    {transcript ? t('clickMicToContinue') : t('clickMicToStart')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Live Dictation & Editable Area */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <label htmlFor="voice-notes-area" className="font-medium text-zinc-300 text-xs">
                {t('notesLabel')}
              </label>
              {transcript && (
                <button
                  type="button"
                  onClick={() => resetTranscript()}
                  disabled={isSaving || isListening}
                  className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RotateCcw className="w-3 h-3" />
                  {t('clearText')}
                </button>
              )}
            </div>

            <div className="relative">
              <textarea
                id="voice-notes-area"
                rows={5}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder={t('notesPlaceholder')}
                disabled={isSaving}
                className="w-full p-3.5 bg-black/40 border border-white/10 rounded-xl text-white text-xs leading-relaxed placeholder-zinc-600 focus:outline-none focus:border-emerald-500/80 resize-none font-normal"
              />

              {interimTranscript && (
                <div className="absolute bottom-3 left-3 right-3 text-xs italic text-emerald-400/90 pointer-events-none truncate">
                  ... {interimTranscript}
                </div>
              )}
            </div>

            <p className="text-[11px] text-zinc-500">
              {t('helperNote')}
            </p>
          </div>
        </div>

        {/* Footer: Simple Save Button */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-white/10 bg-black/20">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="px-4 py-2 text-zinc-400 hover:text-white text-xs font-medium rounded-xl hover:bg-white/5 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('cancelBtn')}
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !transcript.trim()}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-linear-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-semibold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {t('saving')}
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                {t('saveBtn')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
