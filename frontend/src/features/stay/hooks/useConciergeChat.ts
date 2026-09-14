'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  ChatMessage,
  ChatHistoryPayload,
  UseConciergeChatOptions,
  UseConciergeChatReturn,
} from '../types/chatTypes';
import { streamConciergeChat } from '../api/chatStream';
import { useHaptic } from './useHaptic';

export function useConciergeChat({
  spaceId,
  locale = 'en',
  initialMessages = [],
}: UseConciergeChatOptions): UseConciergeChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const { triggerHaptic } = useHaptic();

  // Clean up any ongoing stream when the hook unmounts
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setMessages((prev) =>
      prev.map((msg) => (msg.isStreaming ? { ...msg, isStreaming: false } : msg))
    );
  }, []);

  const clearChat = useCallback(() => {
    stopGeneration();
    setMessages([]);
    setError(null);
    triggerHaptic(30);
  }, [stopGeneration, triggerHaptic]);

  const sendMessage = useCallback(
    async (rawQuery: string): Promise<void> => {
      const query = rawQuery.trim();
      if (!query || isStreaming) {
        return;
      }

      setError(null);
      triggerHaptic(50);

      const userMessageId = `user-${Date.now()}`;
      const assistantMessageId = `assistant-${Date.now()}`;

      const userMessage: ChatMessage = {
        id: userMessageId,
        role: 'user',
        content: query,
        createdAt: Date.now(),
      };

      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
        isStreaming: true,
      };

      // Build sliding window history (up to last 6 messages)
      const historyPayload: ChatHistoryPayload[] = messages
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      await streamConciergeChat({
        spaceId,
        query,
        history: historyPayload,
        locale,
        signal: controller.signal,
        onChunk: (chunk: string) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: msg.content + chunk }
                : msg
            )
          );
        },
        onDone: () => {
          setIsStreaming(false);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId ? { ...msg, isStreaming: false } : msg
            )
          );
          abortControllerRef.current = null;
          triggerHaptic(50);
        },
        onError: (err: Error) => {
          setIsStreaming(false);
          setError(err.message);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    content:
                      msg.content ||
                      'Възникна грешка при връзката с консиержа. Моля опитайте отново.',
                    isStreaming: false,
                  }
                : msg
            )
          );
          abortControllerRef.current = null;
        },
      });
    },
    [isStreaming, messages, spaceId, locale, triggerHaptic]
  );

  return {
    messages,
    isStreaming,
    error,
    sendMessage,
    stopGeneration,
    clearChat,
  };
}
