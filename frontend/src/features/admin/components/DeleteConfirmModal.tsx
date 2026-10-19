'use client';

import React from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';

export interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  itemTitle?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  itemTitle,
  confirmLabel = 'Изтрий безвъзвратно',
  cancelLabel = 'Отказ',
  isLoading = false,
}) => {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => {
        if (!isLoading) onClose();
      }}
      className="max-w-md bg-[#0a0a0f] border-red-500/25 shadow-2xl shadow-red-950/40 p-6 rounded-2xl"
    >
      <div className="flex items-start gap-4 mb-4">
        <div className="h-10 w-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0 mt-0.5">
          <AlertTriangle className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">
            {title}
          </h3>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      {itemTitle && (
        <div className="rounded-xl bg-zinc-950/80 border border-zinc-800/90 p-3.5 mb-5 text-xs text-zinc-300 font-medium break-words">
          <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
            Елемент за изтриване:
          </span>
          {itemTitle}
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          disabled={isLoading}
          onClick={onClose}
          aria-label={cancelLabel}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        >
          {cancelLabel}
        </button>

        <button
          type="button"
          disabled={isLoading}
          onClick={onConfirm}
          aria-label={confirmLabel}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition-colors shadow-lg shadow-red-600/20 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
          ) : (
            <Trash2 className="w-3.5 h-3.5 text-white" />
          )}
          <span>{isLoading ? 'Изтриване...' : confirmLabel}</span>
        </button>
      </div>
    </Dialog>
  );
};
