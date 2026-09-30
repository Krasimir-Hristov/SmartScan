import { renderHook, act } from '@testing-library/react';
import { useConciergeChat } from './useConciergeChat';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as chatStreamApi from '../api/chatStream';

// Mock the API module
vi.mock('../api/chatStream', () => ({
  streamConciergeChat: vi.fn(),
}));

// Mock useHaptic
vi.mock('./useHaptic', () => ({
  useHaptic: () => ({ triggerHaptic: vi.fn() }),
}));

describe('useConciergeChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with empty messages and not streaming', () => {
    const { result } = renderHook(() =>
      useConciergeChat({ spaceId: 'space-123' })
    );

    expect(result.current.messages).toEqual([]);
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sends a message and handles streaming chunks', async () => {
    // Setup mock implementation for streaming
    vi.mocked(chatStreamApi.streamConciergeChat).mockImplementation(async (params) => {
      // Simulate chunk 1
      params.onChunk('Hello ');
      // Simulate chunk 2
      params.onChunk('world!');
      // Simulate done
      params.onDone();
    });

    const { result } = renderHook(() =>
      useConciergeChat({ spaceId: 'space-123' })
    );

    await act(async () => {
      await result.current.sendMessage('Hello bot');
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0]).toEqual(expect.objectContaining({
      role: 'user',
      content: 'Hello bot',
    }));
    
    expect(result.current.messages[1]).toEqual(expect.objectContaining({
      role: 'assistant',
      content: 'Hello world!',
      isStreaming: false,
    }));
    
    expect(result.current.isStreaming).toBe(false);
    
    expect(chatStreamApi.streamConciergeChat).toHaveBeenCalledWith(
      expect.objectContaining({
        spaceId: 'space-123',
        query: 'Hello bot',
        history: [], // empty history for first msg
      })
    );
  });

  it('ignores empty messages', async () => {
    const { result } = renderHook(() => useConciergeChat({ spaceId: 'space-123' }));
    
    await act(async () => {
      await result.current.sendMessage('   ');
    });
    
    expect(chatStreamApi.streamConciergeChat).not.toHaveBeenCalled();
    expect(result.current.messages).toHaveLength(0);
  });

  it('prevents concurrent requests while streaming', async () => {
    let resolveStream: (value?: unknown) => void = () => {};
    const promise = new Promise((resolve) => { resolveStream = resolve; });
    vi.mocked(chatStreamApi.streamConciergeChat).mockImplementation(() => promise as never);

    const { result } = renderHook(() => useConciergeChat({ spaceId: 'space-123' }));

    act(() => {
      result.current.sendMessage('First message');
    });
    
    expect(result.current.isStreaming).toBe(true);

    await act(async () => {
      await result.current.sendMessage('Second message');
    });
    
    // Should only be called once
    expect(chatStreamApi.streamConciergeChat).toHaveBeenCalledTimes(1);
    
    resolveStream();
  });

  it('handles error during streaming and preserves partial message', async () => {
    vi.mocked(chatStreamApi.streamConciergeChat).mockImplementation(async (params) => {
      params.onChunk('Partial text');
      params.onError(new Error('Network failure'));
    });

    const { result } = renderHook(() =>
      useConciergeChat({ spaceId: 'space-123' })
    );

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    expect(result.current.isStreaming).toBe(false);
    expect(result.current.error).toBe('Network failure');
    // message should preserve the partial text, not overwrite it
    expect(result.current.messages[1].content).toBe('Partial text');
  });

  it('stops generation early and aborts the signal', async () => {
    let capturedSignal: AbortSignal | undefined;
    let resolveStream: (value?: unknown) => void = () => {};
    const promise = new Promise((resolve) => { resolveStream = resolve; });
    vi.mocked(chatStreamApi.streamConciergeChat).mockImplementation((params) => {
      capturedSignal = params.signal;
      return promise as never;
    });

    const { result } = renderHook(() =>
      useConciergeChat({ spaceId: 'space-123' })
    );

    let sendPromise: Promise<void>;
    act(() => {
      sendPromise = result.current.sendMessage('Long prompt');
    });

    expect(result.current.isStreaming).toBe(true);
    expect(capturedSignal).toBeDefined();
    expect(capturedSignal!.aborted).toBe(false);

    act(() => {
      result.current.stopGeneration();
    });

    expect(result.current.isStreaming).toBe(false);
    expect(result.current.messages[1].isStreaming).toBe(false);
    expect(capturedSignal!.aborted).toBe(true);

    // Cleanup the pending promise
    resolveStream();
    await act(async () => { await sendPromise!; });
  });

  it('clears chat history and sends empty history on next message', async () => {
    const { result } = renderHook(() =>
      useConciergeChat({ spaceId: 'space-123' })
    );

    vi.mocked(chatStreamApi.streamConciergeChat).mockImplementation(async (params) => {
      params.onChunk('Test');
      params.onDone();
    });

    await act(async () => {
      await result.current.sendMessage('Hi');
    });

    expect(result.current.messages.length).toBeGreaterThan(0);

    act(() => {
      result.current.clearChat();
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.error).toBeNull();

    // Send another message after clearing — history should be empty
    await act(async () => {
      await result.current.sendMessage('Hello again');
    });

    const lastCall = vi.mocked(chatStreamApi.streamConciergeChat).mock.calls.at(-1);
    expect(lastCall).toBeDefined();
    expect(lastCall![0].history).toEqual([]);
    expect(lastCall![0].query).toBe('Hello again');
  });
});
