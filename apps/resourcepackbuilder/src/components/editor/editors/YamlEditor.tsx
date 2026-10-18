import { useId } from 'react';
import { useTranslations } from 'next-intl';
import type { YamlField } from '@resourcepackbuilder/core/form';
import { parseYaml, toYaml } from '@resourcepackbuilder/core/yaml';
import { Textarea } from '@resourcepackbuilder/ui/components/textarea';
import { useDraft } from '@resourcepackbuilder/ui';
import { useSchemaText } from '../../useSchemaText';
import { FieldShell } from '../FieldShell';
import type { EditorProps } from '../types';

const INDENT = '  ';

const formatYaml = (value: unknown) => (value === undefined || value === null ? '' : toYaml(value).trimEnd());

function parseDraft(text: string): { value: unknown } | undefined {
  const parsed = parseYaml(text);
  return parsed.error ? undefined : { value: parsed.value ?? undefined };
}

/** Free YAML for values the form has no fields for. Tab indents instead of leaving the field. */
export function YamlEditor({ field, value, onChange, hideLabel }: EditorProps<YamlField>) {
  const id = useId();
  const t = useTranslations('editor');
  const text = useSchemaText();
  const { draft, setDraft } = useDraft(value, parseDraft, formatYaml);
  const error = parseYaml(draft).error;

  const edit = (next: string) => {
    setDraft(next);
    const parsed = parseDraft(next);
    if (parsed) onChange(parsed.value);
  };

  return (
    <FieldShell field={field} hideLabel={hideLabel} wide error={error ? t('field.yamlError', { error }) : undefined} htmlFor={id}>
      <Textarea
        id={id}
        className="field-sizing-fixed font-mono text-xs leading-5 [tab-size:2]"
        aria-invalid={!!error || undefined}
        rows={6}
        value={draft}
        placeholder={text(field.placeholder)}
        spellCheck={false}
        onChange={(e) => edit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Tab') return;
          e.preventDefault();
          // setRangeText keeps the caret right after the inserted indent
          e.currentTarget.setRangeText(INDENT, e.currentTarget.selectionStart, e.currentTarget.selectionEnd, 'end');
          edit(e.currentTarget.value);
        }}
      />
    </FieldShell>
  );
}
