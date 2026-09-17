'use client';

import { useState, useRef, useCallback, useEffect, useSyncExternalStore } from 'react';

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

export interface UseSpeechRecognitionOptions {
  autoStopSeconds?: number;
  onTextChange?: (liveText: string) => void;
  onFinalResult?: (finalText: string) => void;
}

export interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  isSupported: boolean;
  startListening: (langCode?: string, initialText?: string) => void;
  stopListening: () => void;
  resetTranscript: () => void;
  setTranscript: (val: string | ((prev: string) => string)) => void;
}

const emptySubscribe = () => () => {};

const checkSpeechSupport = (): boolean => {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
  );
};

export const useSpeechRecognition = (
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn => {
  const isSupported = useSyncExternalStore(
    emptySubscribe,
    checkSpeechSupport,
    () => false
  );
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const shouldRestartRef = useRef(false);
  const autoStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalAccumulatorRef = useRef<string>('');

  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;
    if (autoStopTimeoutRef.current) {
      clearTimeout(autoStopTimeoutRef.current);
      autoStopTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop error
      }
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const startListening = useCallback(
    (langCode: string = 'bg-BG', initialText: string = '') => {
      setError(null);
      setInterimTranscript('');
      finalAccumulatorRef.current = initialText.trim();
      setTranscript(initialText.trim());

      if (autoStopTimeoutRef.current) {
        clearTimeout(autoStopTimeoutRef.current);
      }
      const safetyLimitSeconds = options.autoStopSeconds ?? 180;
      autoStopTimeoutRef.current = setTimeout(() => {
        stopListening();
      }, safetyLimitSeconds * 1000);

      if (typeof window === 'undefined') return;

      const SpeechRec =
        (
          window as unknown as {
            SpeechRecognition?: new () => ISpeechRecognition;
          }
        ).SpeechRecognition ||
        (
          window as unknown as {
            webkitSpeechRecognition?: new () => ISpeechRecognition;
          }
        ).webkitSpeechRecognition;

      if (!SpeechRec) {
        setError('Браузърът не поддържа гласова диктовка. Можете да въведете текст директно.');
        return;
      }

      // Stop previous instance if running
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore
        }
      }

      try {
        const recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = langCode;

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let currentFinal = '';
          let currentInterim = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const res = event.results[i];
            const text = res[0]?.transcript || '';
            if (res.isFinal) {
              currentFinal += text + ' ';
            } else {
              currentInterim += text;
            }
          }

          if (currentFinal) {
            finalAccumulatorRef.current = finalAccumulatorRef.current
              ? `${finalAccumulatorRef.current.trim()} ${currentFinal.trim()}`
              : currentFinal.trim();
            setTranscript(finalAccumulatorRef.current);
            if (options.onFinalResult) {
              options.onFinalResult(finalAccumulatorRef.current);
            }
          }

          setInterimTranscript(currentInterim);

          const liveCombined = currentInterim
            ? `${finalAccumulatorRef.current} ${currentInterim}`.trim()
            : finalAccumulatorRef.current;

          if (options.onTextChange) {
            options.onTextChange(liveCombined);
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          if (event.error === 'not-allowed') {
            setError('Достъпът до микрофона е отказан. Моля, разрешете микрофона в настройките на браузъра.');
          } else if (event.error === 'network') {
            setError('Грешка в гласовата услуга. Ако ползвате Brave браузър, разрешете Google Services в настройките за поверителност.');
          } else if (event.error === 'language-not-supported') {
            setError('Избраният език не се поддържа от браузъра за гласово разпознаване.');
          } else if (event.error !== 'no-speech') {
            setError(`Грешка при микрофона: ${event.error}`);
            loggerSpeechError(event.error);
          }
          setIsListening(false);
        };

        recognition.onend = () => {
          if (shouldRestartRef.current) {
            try {
              recognition.start();
            } catch {
              setIsListening(false);
            }
          } else {
            setIsListening(false);
            setInterimTranscript('');
          }
        };

        shouldRestartRef.current = true;
        recognition.start();
        recognitionRef.current = recognition;
      } catch {
        setError('Неуспешно стартиране на микрофона.');
        setIsListening(false);
      }
    },
    [options, stopListening]
  );

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      shouldRestartRef.current = false;
      if (autoStopTimeoutRef.current) {
        clearTimeout(autoStopTimeoutRef.current);
        autoStopTimeoutRef.current = null;
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore
        }
      }
    };
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    setTranscript,
  };
};

const loggerSpeechError = (err: string): void => {
  if (process.env.NODE_ENV === 'development') {
    console.debug('Speech recognition non-fatal event:', err);
  }
};

