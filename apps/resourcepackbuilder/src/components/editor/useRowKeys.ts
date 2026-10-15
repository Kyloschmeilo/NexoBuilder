import { useState } from 'react';
import { insertAt, moveInArray, removeAt } from './values';

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
  return {
    keys: current,
    /** Inserts a key at `index` and returns it. */
    insert: (index: number) => {
      const key = newKey();
      setKeys(insertAt(current, index, key));
      return key;
    },
    move: (from: number, to: number) => setKeys(moveInArray(current, from, to)),
    remove: (index: number) => setKeys(removeAt(current, index)),
  };
}
