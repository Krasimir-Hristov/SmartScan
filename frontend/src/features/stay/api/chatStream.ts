import { ChatHistoryPayload, ConciergeStreamChunk } from '../types/chatTypes';

export interface StreamChatParams {
  spaceId: string;
  query: string;
  history: ChatHistoryPayload[];
  locale?: string;
  signal?: AbortSignal;
  onChunk: (content: string) => void;
  onDone: () => void;
  onError: (error: Error) => void;
}

/**
 * Sends a chat prompt to the FastAPI AI Concierge endpoint via the Next.js proxy
 * and reads the streaming Server-Sent Events (SSE) response token-by-token.
 */
export async function streamConciergeChat({
  spaceId,
  query,
  history,
  locale,
  signal,
  onChunk,
  onDone,
  onError,
}: StreamChatParams): Promise<void> {
  try {
    const response = await fetch('/api/py/concierge/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        space_id: spaceId,
        query,
        history,
        locale: locale || 'en',
      }),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Network response was not ok');
      throw new Error(`Concierge service error (${response.status}): ${errorText}`);
    }

    if (!response.body) {
      throw new Error('ReadableStream is not supported by the response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    try {
      let receivedDone = false;
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // Keep the last partial line in the buffer
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) {
            continue;
          }

          const rawData = trimmed.replace(/^data:\s*/, '');
          if (rawData === '[DONE]') {
            receivedDone = true;
            onDone();
            return;
          }

          try {
            const parsed = JSON.parse(rawData) as ConciergeStreamChunk;
            if (parsed.error) {
              onError(new Error(parsed.error));
              return;
            }
            if (parsed.content) {
              onChunk(parsed.content);
            }
          } catch {
            // Ignore incomplete JSON chunks until buffer completes
          }
        }
      }

      if (!receivedDone) {
        onError(new Error('STREAM_INTERRUPTED'));
      }
    } finally {
      reader.releaseLock();
    }
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      // Stream was cleanly aborted by the user
      return;
    }
    const error = err instanceof Error ? err : new Error('Unknown chat stream error');
    onError(error);
  }
}
