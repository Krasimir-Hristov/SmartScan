'use client';

import React from 'react';
import { Mic, X } from 'lucide-react';

export interface VoiceIngestHeaderProps {
  onClose: () => void;
  disabled: boolean;
  t: (key: string) => string;
}

export const VoiceIngestHeader: React.FC<VoiceIngestHeaderProps> = ({
  onClose,
  disabled,
  t,
}) => {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/20">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.15)]">
          <Mic className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h2
            id="voice-modal-title"
            className="text-white font-semibold text-base font-space-grotesk"
          >
            {t('modalTitle')}
          </h2>
          <p className="text-zinc-400 text-xs">{t('modalSubtitle')}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        disabled={disabled}
        aria-label={t('closeAria')}
        className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
};
