import { useState } from 'react';

const newKey = () => crypto.randomUUID();

/**
 * Stable React keys for the rows of a list value, so moving or removing a row keeps focus and input state
 * with the right row. Edit operations update the keys alongside the value; an outside change of the row
 * count (undo, paste) adds or drops keys at the end.
 */
export function useRowKeys(count: number) {
  const [keys, setKeys] = useState(() => Array.from({ length: count }, newKey));
  let current = keys;
  if (keys.length !== count) {
    current = keys.length > count ? keys.slice(0, count) : [...keys, ...Array.from({ length: count - keys.length }, newKey)];
    setKeys(current);
  }
  // The edit operations update from the latest keys, so several of them in one event do not overwrite each other
  return {
    keys: current,
    /** Inserts a key at `index` and returns it. */
    insert: (index: number) => {
      const key = newKey();
      setKeys((prev) => [...prev.slice(0, index), key, ...prev.slice(index)]);
      return key;
    },
    move: (from: number, to: number) =>
      setKeys((prev) => {
        const next = [...prev];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next;
      }),
    remove: (index: number) => setKeys((prev) => prev.filter((_, i) => i !== index)),
  };
}
