import { afterEach, describe, expect, it, vi } from 'vitest';
import { useToastStore } from './toastStore';

afterEach(() => {
  vi.useRealTimers();
  useToastStore.setState({ items: [], nextId: 1 });
});

describe('toast pin', () => {
  it('pause sets pinned, resume clears it', () => {
    useToastStore.getState().add('hello', 'info');
    const id = useToastStore.getState().items[0]?.id ?? 0;
    useToastStore.getState().pause(id);
    expect(useToastStore.getState().items[0]?.pinned).toBe(true);
    useToastStore.getState().resume(id);
    expect(useToastStore.getState().items[0]?.pinned).toBe(false);
  });

  it('does not dismiss while pinned', () => {
    vi.useFakeTimers();
    useToastStore.getState().add('stay', 'info');
    const id = useToastStore.getState().items[0]?.id ?? 0;
    useToastStore.getState().pause(id);
    vi.advanceTimersByTime(15_000);
    expect(useToastStore.getState().items.some((item) => item.id === id && !item.removing)).toBe(true);
    vi.useRealTimers();
  });
});
