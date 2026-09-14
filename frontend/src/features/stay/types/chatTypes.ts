export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
  isStreaming?: boolean;
}

export interface ChatHistoryPayload {
  role: 'user' | 'assistant';
  content: string;
}

export interface ConciergeStreamChunk {
  content?: string;
  error?: string;
}

export interface UseConciergeChatOptions {
  spaceId: string;
  locale?: string;
  initialMessages?: ChatMessage[];
  connectionErrorMessage?: string;
}

export interface UseConciergeChatReturn {
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  sendMessage: (query: string) => Promise<void>;
  stopGeneration: () => void;
  clearChat: () => void;
}
