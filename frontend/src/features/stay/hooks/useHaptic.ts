'use client';

import { useCallback } from 'react';

/**
 * Hook to trigger tactile haptic vibrations on supported mobile devices.
 * Uses navigator.vibrate(durationMs).
 */
export function useHaptic() {
  const triggerHaptic = useCallback((durationMs = 50): void => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(durationMs);
      } catch {
        // Silently ignore if disabled or unsupported by browser
      }
    }
  }, []);

  return { triggerHaptic };
}
