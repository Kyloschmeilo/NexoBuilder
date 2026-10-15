/** A minimal typed event channel through which services tell the UI what happened (the UI words it). */
export interface Events<E> {
  emit(event: E): void;
  /** Returns the function that ends the subscription. */
  subscribe(listener: (event: E) => void): () => void;
}

export function createEvents<E>(): Events<E> {
  const listeners = new Set<(event: E) => void>();
  return {
    emit(event) {
      for (const listener of listeners) listener(event);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
