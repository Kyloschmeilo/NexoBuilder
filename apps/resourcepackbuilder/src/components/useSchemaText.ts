import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { formFor } from '@resourcepackbuilder/core/targets';
import { useFormTarget } from './formTarget';

type SchemaParams = Record<string, string | number>;

/** Translates a schema key (with optional message params); `''` or `undefined` mean "no text". */
export interface SchemaText {
  (key: string, params?: SchemaParams): string;
  (key: string | undefined, params?: SchemaParams): string | undefined;
}

/** The namespace of core's project data (recipes, variants, validation …), shared by every target. */
const SHARED_NAMESPACE = 'schema';

/**
 * Translates human-readable strings of core's data (field labels, help texts, placeholders, option labels…). A key
 * is looked up in the namespace of the form of the open project, or of a `FormTargetProvider` (`schema` for Nexo,
 * `ceSchema` for CraftEngine), and then in `schema`, which holds the texts every target shares. Core's tests guarantee
 * each key exists; `''` or `undefined` mean "no text".
 */
export function useSchemaText(): SchemaText {
  const target = useFormTarget();
  const namespace = target ? formFor(target).messages : SHARED_NAMESPACE;
  const t = useTranslations();
  // Keys come from core data at runtime, so they cannot be typed as literal keys here; these are the only casts.
  return useCallback(
    (key: string | undefined, params?: SchemaParams) => {
      if (!key) return undefined;
      const own = `${namespace}.${key}`;
      return t((t.has(own as never) ? own : `${SHARED_NAMESPACE}.${key}`) as never, params as never);
    },
    [t, namespace],
  ) as SchemaText;
}
