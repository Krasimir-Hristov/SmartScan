'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Home, ChevronDown, Check, Plus } from 'lucide-react';
import type { Space } from '@/lib/types/databaseTypes';

export interface SpaceSwitcherProps {
  spaces: Space[];
  currentSpace: Space;
  onSelectSpace: (spaceId: string) => void;
  onCreateNew: () => void;
}

export const SpaceSwitcher: React.FC<SpaceSwitcherProps> = ({
  spaces,
  currentSpace,
  onSelectSpace,
  onCreateNew,
}) => {
  const t = useTranslations('dashboard');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Switcher Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={t('switchSpace')}
        className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 hover:border-emerald-500/40 text-white transition-all cursor-pointer select-none group"
      >
        <Home className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
        <span className="font-display font-bold text-sm sm:text-base max-w-160px sm:max-w-220px truncate">
          {currentSpace.name}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-emerald-400' : ''
          }`}
        />
      </button>

      {/* Switcher Menu */}
      {isOpen && (
        <div
          role="listbox"
          aria-label={t('switchSpace')}
          className="absolute left-0 mt-2 w-64 rounded-2xl bg-zinc-950/95 border border-white/10 shadow-2xl shadow-black/80 z-50 backdrop-blur-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-2 flex flex-col gap-1"
        >
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono">
            {t('switchSpace')}
          </div>

          <div className="flex flex-col gap-0.5 max-h-60 overflow-y-auto">
            {spaces.map((space) => {
              const isSelected = space.id === currentSpace.id;
              return (
                <button
                  key={space.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onSelectSpace(space.id);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer w-full text-left ${
                    isSelected
                      ? 'bg-emerald-500/15 text-emerald-300 font-semibold'
                      : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="truncate pr-2">{space.name}</span>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="h-px bg-white/10 my-1" />

          {/* Add New Space Quick Option */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onCreateNew();
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors cursor-pointer w-full text-left"
          >
            <Plus className="w-4 h-4" />
            <span>{t('createNewSpaceOption')}</span>
          </button>
        </div>
      )}
    </div>
  );
};
