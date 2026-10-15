/** Short notices for the user. The store only queues them; the toast UI shows them and decides when they disappear. */
import { create } from 'zustand';

export type ToastKind = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface NotificationState {
  /** Toasts not yet taken over by the toast UI */
  queue: Toast[];
  nextId: number;
}

export const useNotificationStore = create<NotificationState>(() => ({ queue: [], nextId: 1 }));

/** Shows `message` (already translated) as a toast. */
export function toast(kind: ToastKind, message: string): void {
  useNotificationStore.setState((s) => ({ queue: [...s.queue, { id: s.nextId, kind, message }], nextId: s.nextId + 1 }));
}

/** Removes and returns the queued toasts (called by the toast UI). */
export function takeToasts(): Toast[] {
  const { queue } = useNotificationStore.getState();
  if (queue.length) useNotificationStore.setState({ queue: [] });
  return queue;
}
