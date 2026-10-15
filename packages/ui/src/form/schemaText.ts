import { useTranslations } from 'next-intl';

/**
 * Translates human-readable strings from core's nexo data (field labels, help texts, option labels…),
 * which hold message keys in the `schema` namespace. Strings that are not a known key (technical
 * placeholders such as `minecraft:stone`, or labels passed in by the app) are shown unchanged.
 */
export function useSchemaText(): (text: string | undefined) => string | undefined {
  const t = useTranslations('schema');
  return (text) => {
    if (!text) return text;
    return t.has(text as never) ? t(text as never) : text;
  };
}
