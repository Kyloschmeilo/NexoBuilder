/** Follows a CSS media query, e.g. whether the window is wide enough for a layout column. */
import { useCallback, useSyncExternalStore } from 'react';

/** Whether `query` matches now; re-renders when that changes. False outside the browser. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
