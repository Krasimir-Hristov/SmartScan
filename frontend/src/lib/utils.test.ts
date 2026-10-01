import { cn, triggerHaptic } from './utils';
import { describe, it, expect, vi, afterEach } from 'vitest';

describe('utils', () => {
  describe('cn', () => {
    it('merges tailwind classes correctly', () => {
      expect(cn('bg-red-500', 'text-white')).toBe('bg-red-500 text-white');
      expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4'); // overrides padding
      expect(cn('text-sm', false && 'text-lg', 'font-bold')).toBe('text-sm font-bold');
    });

    it('ignores falsy values correctly', () => {
      expect(cn('class1', undefined, null, false, '', 'class2')).toBe('class1 class2');
    });
  });

  describe('triggerHaptic', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('calls navigator.vibrate if available', () => {
      const vibrateMock = vi.fn();
      
      // Setup window and navigator
      vi.stubGlobal('navigator', { vibrate: vibrateMock });
      
      triggerHaptic(100);
      expect(vibrateMock).toHaveBeenCalledWith(100);
    });

    it('does not throw if navigator.vibrate is missing', () => {
      vi.stubGlobal('navigator', {}); // no vibrate
      expect(() => triggerHaptic(50)).not.toThrow();
    });
  });
});
