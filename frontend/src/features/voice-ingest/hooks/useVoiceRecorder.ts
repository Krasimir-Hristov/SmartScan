'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseVoiceRecorderOptions {
  language?: string;
  maxDurationSeconds?: number;
  onTranscript?: (transcribedText: string) => void;
  onError?: (errorMessage: string) => void;
}

export interface UseVoiceRecorderReturn {
  isRecording: boolean;
  isTranscribing: boolean;
  durationSeconds: number;
  error: string | null;
  startRecording: () => Promise<boolean>;
  stopRecording: () => Promise<void>;
  cancelRecording: () => void;
}

export const useVoiceRecorder = (
  options: UseVoiceRecorderOptions = {},
): UseVoiceRecorderReturn => {
  const { language, maxDurationSeconds = 180, onTranscript, onError } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore stop error on cancellation
      }
    }
    cleanupStream();
    audioChunksRef.current = [];
    setIsRecording(false);
    setIsTranscribing(false);
    setDurationSeconds(0);
  }, [cleanupStream]);

  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      return;
    }

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    setIsRecording(false);
    setIsTranscribing(true);

    const recorder = mediaRecorderRef.current;

    const recordingDonePromise = new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const finalBlob = new Blob(audioChunksRef.current, { type: mimeType });
        cleanupStream();
        resolve(finalBlob);
      };
    });

    try {
      recorder.stop();
    } catch {
      cleanupStream();
      setIsTranscribing(false);
      return;
    }

    const audioBlob = await recordingDonePromise;

    if (audioBlob.size < 200) {
      setIsTranscribing(false);
      setDurationSeconds(0);
      return;
    }

    try {
      const formData = new FormData();
      const ext = audioBlob.type.includes('mp4') ? 'mp4' : 'webm';
      formData.append('file', audioBlob, `speech_recording.${ext}`);
      if (language) {
        formData.append('language', language);
      }

      const response = await fetch('/api/py/voice/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = (await response.json().catch(() => ({}))) as { detail?: string };
        const msg =
          errData.detail || 'Възникна проблем при преобразуването на гласа в текст.';
        setError(msg);
        if (onError) onError(msg);
        return;
      }

      const data = (await response.json()) as { success: boolean; text: string };
      if (data.text && onTranscript) {
        onTranscript(data.text);
      }
    } catch {
      const msg = 'Неуспешна връзка със сървъра за транскрипция. Моля, опитайте отново.';
      setError(msg);
      if (onError) onError(msg);
    } finally {
      setIsTranscribing(false);
      setDurationSeconds(0);
      audioChunksRef.current = [];
    }
  }, [cleanupStream, language, onError, onTranscript]);

  const startRecording = useCallback(async (): Promise<boolean> => {
    setError(null);
    setDurationSeconds(0);
    audioChunksRef.current = [];

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      const msg = 'Този браузър не поддържа директен запис през микрофон.';
      setError(msg);
      if (onError) onError(msg);
      return false;
    }

    try {
      // 1. THIS OPENS THE NATIVE BROWSER PERMISSION PROMPT AT THE TOP OF THE WINDOW
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      // Select supported audio container
      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        }
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(250); // Slice into 250ms chunks for smooth memory usage
      setIsRecording(true);

      // Start duration timer
      timerIntervalRef.current = setInterval(() => {
        setDurationSeconds((prev) => {
          if (prev + 1 >= maxDurationSeconds) {
            // Auto stop when reaching max safety duration
            void stopRecording();
            return maxDurationSeconds;
          }
          return prev + 1;
        });
      }, 1000);

      return true;
    } catch (err: unknown) {
      cleanupStream();
      let errorMsg = 'Възникна грешка при стартиране на микрофона.';

      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMsg =
            'Достъпът до микрофона е отказан. Моля, разрешете използването на микрофона в лентата горе на браузъра.';
        } else if (
          err.name === 'NotFoundError' ||
          err.name === 'DevicesNotFoundError'
        ) {
          errorMsg = 'Не беше намерен наличен микрофон на това устройство.';
        }
      }

      setError(errorMsg);
      if (onError) onError(errorMsg);
      setIsRecording(false);
      return false;
    }
  }, [cleanupStream, maxDurationSeconds, onError, stopRecording]);

  useEffect(() => {
    return () => {
      cleanupStream();
    };
  }, [cleanupStream]);

  return {
    isRecording,
    isTranscribing,
    durationSeconds,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
  };
};
