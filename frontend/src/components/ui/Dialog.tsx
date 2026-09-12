'use client';

import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Modal dialog'}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity cursor-pointer"
        aria-hidden="true"
      />

      {/* Dialog content */}
      <div
        className={cn(
          'relative z-10 w-full max-w-lg rounded-2xl bg-zinc-950 border border-emerald-500/20 p-6 shadow-2xl shadow-emerald-950/40 text-zinc-100 transition-all transform scale-100',
          className
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Затвори модалния прозорец"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {title && (
          <h2 className="text-xl font-bold tracking-tight text-white mb-1">
            {title}
          </h2>
        )}

        {description && (
          <p className="text-sm text-zinc-400 mb-5">{description}</p>
        )}

        <div>{children}</div>
      </div>
    </div>
  );
};
