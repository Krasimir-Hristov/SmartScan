'use client';

import { useState, useCallback } from 'react';

/**
 * Hook for copying text to system clipboard with visual state timing.
 */
export function useClipboard(timeout = 2000) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      if (typeof window !== 'undefined' && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), timeout);
          return true;
        } catch {
          return false;
        }
      }
      return false;
    },
    [timeout]
  );

  return { copied, copy };
}
