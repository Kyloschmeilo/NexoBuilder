import { useCallback } from 'react';
import type { Option } from '@resourcepackbuilder/core/form';
import { useSchemaText } from '../../useSchemaText';

/** A value offered for selection whose text the app already knows (e.g. an item's display name). */
export interface LiteralChoice {
  value: string;
  text: string;
}

/** An option of core's Nexo data (`label` is a `schema` key) or a {@link LiteralChoice}. */
export type Choice = Option | LiteralChoice;

/** Returns the display text of a choice, or undefined when only its value is shown. */
export function useChoiceText(): (choice: Choice) => string | undefined {
  const schemaText = useSchemaText();
  return useCallback((choice) => ('text' in choice ? choice.text : schemaText(choice.label)), [schemaText]);
}
