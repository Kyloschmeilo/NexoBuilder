import { useCallback } from 'react';
import { useTranslations } from 'next-intl';

/**
 * Translates human-readable strings of core's Nexo data (field labels, help texts, placeholders, option
 * labels…). Every such string is a key in the `schema` namespace – core's tests guarantee it – and `''` or
 * `undefined` mean "no text".
 */
export function useSchemaText(): (key: string | undefined) => string | undefined {
  const t = useTranslations('schema');
  // Keys come from core data at runtime, so they cannot be typed as literal keys here.
  return useCallback((key) => (key ? t(key as never) : undefined), [t]);
}
