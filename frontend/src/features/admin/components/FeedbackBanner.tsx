'use client';

import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export interface FeedbackBannerProps {
  banner: {
    type: 'success' | 'error';
    text: string;
  } | null;
  onClose: () => void;
}

export const FeedbackBanner: React.FC<FeedbackBannerProps> = ({ banner, onClose }) => {
  if (!banner) return null;

  return (
    <aside
      role="status"
      aria-live="polite"
      className={`rounded-xl border p-3 flex items-center justify-between gap-3 text-xs font-semibold ${
        banner.type === 'success'
          ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
          : 'border-rose-500/40 bg-rose-950/40 text-rose-300'
      }`}
    >
      <div className="flex items-center gap-2">
        {banner.type === 'success' ? (
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
        ) : (
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
        )}
        <span>{banner.text}</span>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Затвори известието"
        className="text-zinc-400 hover:text-white cursor-pointer px-1.5 py-0.5 rounded-md hover:bg-white/10"
      >
        ✕
      </button>
    </aside>
  );
};
