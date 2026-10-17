import { describe, expect, it, vi } from 'vitest';
import { answerFlushRequests } from './flushOnRequest';

function fakeApi() {
  let listener: ((requestId: number) => void) | null = null;
  const api = {
    onFlushRequest: vi.fn((callback: (requestId: number) => void) => {
      listener = callback;
      return () => {
        listener = null;
      };
    }),
    flushed: vi.fn(async (_requestId: number) => undefined),
  };
  return { api, request: (id: number) => listener?.(id), isSubscribed: () => listener !== null };
}

describe('answerFlushRequests', () => {
  it('answers a request only after everything is written', async () => {
    const { api, request } = fakeApi();
    let finish = () => {};
    const flush = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    answerFlushRequests(api, flush);
    request(7);
    await Promise.resolve();
    expect(flush).toHaveBeenCalledTimes(1);
    expect(api.flushed).not.toHaveBeenCalled();
    finish();
    await vi.waitFor(() => expect(api.flushed).toHaveBeenCalledWith(7));
  });

  it('answers also when writing failed', async () => {
    const { api, request } = fakeApi();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    answerFlushRequests(api, () => Promise.reject(new Error('disk full')));
    request(3);
    await vi.waitFor(() => expect(api.flushed).toHaveBeenCalledWith(3));
    warn.mockRestore();
  });

  it('stops answering after unsubscribing', () => {
    const { api, isSubscribed } = fakeApi();
    const stop = answerFlushRequests(api, async () => undefined);
    expect(isSubscribed()).toBe(true);
    stop();
    expect(isSubscribed()).toBe(false);
  });
});
