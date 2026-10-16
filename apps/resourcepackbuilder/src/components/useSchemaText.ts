import { useCallback } from 'react';
import { useTranslations } from 'next-intl';

type SchemaParams = Record<string, string | number>;

/** Translates a schema key (with optional message params); `''` or `undefined` mean "no text". */
export interface SchemaText {
  (key: string, params?: SchemaParams): string;
  (key: string | undefined, params?: SchemaParams): string | undefined;
}

/**
 * Translates human-readable strings of core's Nexo data (field labels, help texts, placeholders, option
 * labels…). Every such string is a key in the `schema` namespace – core's tests guarantee it – and `''` or
 * `undefined` mean "no text".
 */
export function useSchemaText(): SchemaText {
  const t = useTranslations('schema');
  // Keys come from core data at runtime, so they cannot be typed as literal keys here; this is the one cast.
  return useCallback(
    (key: string | undefined, params?: SchemaParams) => (key ? t(key as never, params as never) : undefined),
    [t],
  ) as SchemaText;
}
