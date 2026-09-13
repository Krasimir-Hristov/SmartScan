'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Hook for copying text to system clipboard with visual state timing.
 */
export function useClipboard(timeout = 2000) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear pending timer on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      if (typeof window !== 'undefined' && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(text);

          // Reset existing timer if rapidly clicked again
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }

          setCopied(true);
          timeoutRef.current = setTimeout(() => {
            setCopied(false);
            timeoutRef.current = null;
          }, timeout);

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
