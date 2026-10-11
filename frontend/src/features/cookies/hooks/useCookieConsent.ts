'use client';

import { useSyncExternalStore, useCallback, useState, useEffect } from 'react';
import {
  COOKIE_CONSENT_KEY,
  COOKIE_CONSENT_MAX_AGE_DAYS,
  type CookieConsentChoice,
  type CookieConsentData,
} from '../types/cookieTypes';

const OPEN_COOKIE_EVENT = 'smartscan:open-cookie-settings';
const CONSENT_CHANGE_EVENT = 'smartscan:cookie-consent-change';

export function triggerCookieSettings(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(OPEN_COOKIE_EVENT));
  }
}

function notifyConsentChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT));
  }
}

function getStoredConsent(): CookieConsentChoice {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsentData;
    const maxAgeMs = COOKIE_CONSENT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
    if (Date.now() - parsed.timestamp > maxAgeMs) {
      localStorage.removeItem(COOKIE_CONSENT_KEY);
      return null;
    }
    return parsed.choice;
  } catch {
    return null;
  }
}

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  window.addEventListener(CONSENT_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(CONSENT_CHANGE_EVENT, callback);
  };
}

const emptySubscribe = () => () => {};

export function useCookieConsent() {
  // Synchronous client hydration check via useSyncExternalStore (no setState in effect)
  const isHydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const consentChoice = useSyncExternalStore(
    subscribe,
    getStoredConsent,
    () => null // Server snapshot
  );

  const [isManuallyOpened, setIsManuallyOpened] = useState(false);
  const [isManuallyClosed, setIsManuallyClosed] = useState(false);

  useEffect(() => {
    const handleOpen = () => {
      setIsManuallyClosed(false);
      setIsManuallyOpened(true);
    };

    window.addEventListener(OPEN_COOKIE_EVENT, handleOpen);
    return () => {
      window.removeEventListener(OPEN_COOKIE_EVENT, handleOpen);
    };
  }, []);

  const saveConsent = useCallback((choice: 'all' | 'essential') => {
    try {
      const data: CookieConsentData = {
        choice,
        timestamp: Date.now(),
      };
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(data));

      const maxAgeSeconds = COOKIE_CONSENT_MAX_AGE_DAYS * 24 * 60 * 60;
      document.cookie = `${COOKIE_CONSENT_KEY}=${choice}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax; Secure`;

      notifyConsentChanged();
      setIsManuallyOpened(false);
      setIsManuallyClosed(true);
    } catch (err) {
      console.error('Failed to save cookie consent', err);
      setIsManuallyClosed(true);
    }
  }, []);

  const acceptAll = useCallback(() => {
    saveConsent('all');
  }, [saveConsent]);

  const acceptEssential = useCallback(() => {
    saveConsent('essential');
  }, [saveConsent]);

  const close = useCallback(() => {
    if (!consentChoice) {
      saveConsent('essential');
    } else {
      setIsManuallyClosed(true);
      setIsManuallyOpened(false);
    }
  }, [consentChoice, saveConsent]);

  // Determine visibility:
  // - Must be hydrated on client
  // - If manually opened, show
  // - If manually closed, hide
  // - If no consent choice saved yet, show
  const isOpen = isHydrated && (isManuallyOpened || (!consentChoice && !isManuallyClosed));

  return {
    isOpen,
    consentChoice,
    acceptAll,
    acceptEssential,
    close,
    open: () => {
      setIsManuallyClosed(false);
      setIsManuallyOpened(true);
    },
  };
}
