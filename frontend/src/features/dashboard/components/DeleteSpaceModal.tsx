'use client';

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Loader2, X, Trash2 } from 'lucide-react';
import { deleteSpaceAction } from '../actions/spaceActions';

export interface DeleteSpaceModalProps {
  isOpen: boolean;
  spaceId: string;
  spaceName: string;
  onClose: () => void;
  onSpaceDeleted?: (spaceId: string) => void;
}

const emptySubscribe = () => () => {};

export const DeleteSpaceModal: React.FC<DeleteSpaceModalProps> = ({
  isOpen,
  spaceId,
  spaceName,
  onClose,
  onSpaceDeleted,
}) => {
  const t = useTranslations('dashboard');
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const [typedName, setTypedName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Escape closes the modal only while no deletion is in flight.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isDeleting) onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen || !isClient) return null;

  const isMatch =
    typedName.trim().toLowerCase() === spaceName.trim().toLowerCase();

  const handleDelete = async () => {
    if (!isMatch || isDeleting) return;

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const result = await deleteSpaceAction(spaceId);
      if (!result.success) {
        setErrorMessage(result.error || t('deleteSpaceModalErrorServer'));
        setIsDeleting(false);
        return;
      }

      onClose();
      if (onSpaceDeleted) {
        onSpaceDeleted(spaceId);
      }
    } catch {
      setErrorMessage(t('deleteSpaceModalErrorServer'));
      setIsDeleting(false);
    }
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('deleteSpaceModalTitle')}
      onClick={() => {
        if (!isDeleting) onClose();
      }}
      className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-zinc-950 border border-red-500/30 p-6 sm:p-8 shadow-2xl shadow-red-950/40 text-zinc-100 flex flex-col gap-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          aria-label={t('cancel')}
          className="absolute top-5 right-5 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Warning Header */}
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-lg sm:text-xl font-bold text-white font-display">
              {t('deleteSpaceModalTitle')}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              {t('deleteSpaceModalWarning')}
            </p>
          </div>
        </div>

        {/* Instructions & Space Name Input (GitHub-Style) */}
        <div className="flex flex-col gap-3 rounded-xl bg-red-950/20 border border-red-500/20 p-4">
          <label
            htmlFor="delete-confirm-space-name"
            className="text-xs font-semibold text-zinc-300 leading-snug"
          >
            {t('deleteSpaceModalConfirmPrompt')}
          </label>
          <div className="px-3 py-2 rounded-lg bg-zinc-900/90 border border-zinc-700/60 font-mono text-xs text-amber-300 select-all break-all">
            {spaceName}
          </div>
          <input
            id="delete-confirm-space-name"
            type="text"
            value={typedName}
            onChange={(e) => {
              setTypedName(e.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
            placeholder={t('deleteSpaceModalInputPlaceholder')}
            disabled={isDeleting}
            autoComplete="off"
            autoFocus
            aria-label={t('deleteSpaceModalConfirmPrompt')}
            className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all font-mono"
          />
        </div>

        {/* Error Feedback */}
        {errorMessage && (
          <div className="text-xs text-red-400 bg-red-950/50 border border-red-800/50 rounded-lg p-3">
            {errorMessage}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            aria-label={t('cancel')}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!isMatch || isDeleting}
            aria-label={t('deleteSpaceModalConfirmButton')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-lg shadow-red-600/30 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-red-600"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('deleteSpaceModalDeleting')}</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>{t('deleteSpaceModalConfirmButton')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
