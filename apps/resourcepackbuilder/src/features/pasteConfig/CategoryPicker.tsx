/** Which property categories are pasted, and whether they replace or extend the target's values. */
import { useId } from 'react';
import { useTranslations } from 'next-intl';
import {
  COPY_CATEGORIES,
  type CategorySummary,
  type CopyCategory,
  type PasteOptions,
  type SummaryEntry,
} from '@resourcepackbuilder/core/nexo/copyConfig';
import { SectionLabel, SegmentedControl } from '@resourcepackbuilder/ui';
import { Alert, AlertDescription } from '@resourcepackbuilder/ui/components/alert';
import { Checkbox } from '@resourcepackbuilder/ui/components/checkbox';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@resourcepackbuilder/ui/components/field';
import { useSchemaText } from '../../components/useSchemaText';

type PasteMode = PasteOptions['mode'];

interface CategoryPickerProps {
  summary: CategorySummary[];
  categories: ReadonlySet<CopyCategory>;
  onCategoriesChange: (categories: ReadonlySet<CopyCategory>) => void;
  mode: PasteMode;
  onModeChange: (mode: PasteMode) => void;
}

export function CategoryPicker({ summary, categories, onCategoriesChange, mode, onModeChange }: CategoryPickerProps) {
  const t = useTranslations('dialogs.pasteConfig');
  const tSchema = useSchemaText();
  const id = useId();
  const entryText = (entry: SummaryEntry) => ('text' in entry ? entry.text : tSchema(entry.key, entry.params));

  const toggle = (category: CopyCategory) => {
    const next = new Set(categories);
    if (next.has(category)) next.delete(category);
    else next.add(category);
    onCategoriesChange(next);
  };

  return (
    <section className="flex min-w-0 flex-col gap-3">
      <SectionLabel>{t('what')}</SectionLabel>
      <div className="flex flex-col gap-0.5">
        {COPY_CATEGORIES.map((category) => {
          const entries = summary.find((s) => s.id === category.id)?.entries ?? [];
          const checkboxId = `${id}-${category.id}`;
          return (
            <Field key={category.id} orientation="horizontal" className="py-1.5">
              <Checkbox id={checkboxId} checked={categories.has(category.id)} onCheckedChange={() => toggle(category.id)} />
              <FieldContent>
                <FieldLabel htmlFor={checkboxId} className="font-normal">
                  {tSchema(category.label)}
                  <span className="font-mono text-xs text-muted-foreground">{entries.length > 0 ? entries.length : '–'}</span>
                </FieldLabel>
                <FieldDescription className="text-xs break-words">
                  {entries.length > 0 ? entries.map(entryText).join(', ') : mode === 'replace' ? t('emptyReplace') : t('emptyMerge')}
                </FieldDescription>
              </FieldContent>
            </Field>
          );
        })}
      </div>
      <div className="flex flex-col gap-1.5">
        <SectionLabel>{t('existing')}</SectionLabel>
        <SegmentedControl
          size="sm"
          aria-label={t('existing')}
          value={mode}
          options={[
            { value: 'replace', label: t('replace') },
            { value: 'merge', label: t('merge') },
          ]}
          onChange={onModeChange}
        />
        <p className="text-xs text-muted-foreground">{mode === 'replace' ? t('replaceHelp') : t('mergeHelp')}</p>
      </div>
      <Alert variant="info">
        <AlertDescription className="text-xs">{t('neverCopied')}</AlertDescription>
      </Alert>
    </section>
  );
}
