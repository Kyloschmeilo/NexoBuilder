import { createContext, useContext } from 'react';
import type { ModelTexture } from '@resourcepackbuilder/core/model/types';

/** What the field editors need from the item they edit. */
export interface FieldContextValue {
  /** Target Minecraft version (fields that need a newer one are flagged). */
  minecraftVersion: string;
  /** Stores a PNG as an extra texture of the item and returns its token "@asset:<id>", or null if it was rejected. */
  uploadAsset: (file: File) => Promise<string | null>;
  /** The texture behind an "@asset:<id>" token. */
  getAsset: (token: string) => ModelTexture | undefined;
}

/** Provided around every {@link FieldRenderer} (by the item editor). */
export const FieldContext = createContext<FieldContextValue | null>(null);

export function useFieldContext(): FieldContextValue {
  const context = useContext(FieldContext);
  if (!context) throw new Error('Field editors must be rendered inside a FieldContext provider');
  return context;
}
