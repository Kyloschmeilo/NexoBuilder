/** Which property categories are pasted, and whether they replace or extend the target's values. */
import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { COPY_CATEGORIES, type CategorySummary, type CopyCategory, type SummaryEntry } from '@resourcepackbuilder/core/nexo/copyConfig';
import { SectionLabel } from '@resourcepackbuilder/ui';
import { Alert, AlertDescription } from '@resourcepackbuilder/ui/components/alert';
import { Checkbox } from '@resourcepackbuilder/ui/components/checkbox';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@resourcepackbuilder/ui/components/field';
import { ToggleGroup, ToggleGroupItem } from '@resourcepackbuilder/ui/components/toggle-group';
import { useSchemaText } from '../../components/useSchemaText';

export type PasteMode = 'replace' | 'merge';

const PASTE_MODES = ['replace', 'merge'] as const satisfies readonly PasteMode[];

function isPasteMode(value: string | undefined): value is PasteMode {
  return PASTE_MODES.some((mode) => mode === value);
}

interface CategoryPickerProps {
  summary: CategorySummary[];
  categories: ReadonlySet<CopyCategory>;
  onCategoriesChange: (categories: ReadonlySet<CopyCategory>) => void;
  mode: PasteMode;
  onModeChange: (mode: PasteMode) => void;
}

export function CategoryPicker({ summary, categories, onCategoriesChange, mode, onModeChange }: CategoryPickerProps) {
  const t = useTranslations('dialogs.pasteConfig');
  const tSchema = useTranslations('schema');
  const schemaText = useSchemaText();
  const id = useId();
  // Summary keys are schema keys from core data at runtime, so they cannot be typed as literal keys here.
  const entryText = (entry: SummaryEntry) => ('text' in entry ? entry.text : tSchema(entry.key as never, entry.params as never));

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
                  {schemaText(category.label)}
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
        <ToggleGroup
          variant="outline"
          size="sm"
          spacing={0}
          aria-label={t('existing')}
          value={[mode]}
          onValueChange={([next]) => {
            if (isPasteMode(next)) onModeChange(next);
          }}
        >
          <ToggleGroupItem value="replace" className="px-3">
            {t('replace')}
          </ToggleGroupItem>
          <ToggleGroupItem value="merge" className="px-3">
            {t('merge')}
          </ToggleGroupItem>
        </ToggleGroup>
        <p className="text-xs text-muted-foreground">{mode === 'replace' ? t('replaceHelp') : t('mergeHelp')}</p>
      </div>
      <Alert variant="info">
        <AlertDescription className="text-xs">{t('neverCopied')}</AlertDescription>
      </Alert>
    </section>
  );
}
