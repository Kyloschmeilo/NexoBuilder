/** The texts the catalog adapters need, in the current language and the namespace of the form being edited. */
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { formFor } from '@resourcepackbuilder/core/targets';
import { useFormTarget } from '../formTarget';
import { useSchemaText } from '../useSchemaText';
import type { CatalogText } from './adapters';

/** Builds the {@link CatalogText} for `catalogFromPropertyGroup` and `catalogFromTypedSource`. */
export function useCatalogText(): CatalogText {
  const text = useSchemaText();
  const t = useTranslations();
  const tCatalog = useTranslations('editor.catalog');
  const target = useFormTarget();
  return useMemo(() => {
    const namespaces = [...(target ? [formFor(target).messages] : []), 'schema'];
    return {
      schema: (key: string) => text(key),
      // Keys come from core data at runtime, so they cannot be typed as literal keys
      hasSchema: (key: string) => namespaces.some((namespace) => t.has(`${namespace}.${key}` as never)),
      conflict: (name: string) => tCatalog('conflict', { name }),
      other: tCatalog('other'),
    };
  }, [text, t, tCatalog, target]);
}
