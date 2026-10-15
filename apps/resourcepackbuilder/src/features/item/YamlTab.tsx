import { useTranslations } from 'next-intl';
import type { Item } from '@resourcepackbuilder/core/project/types';
import type { ExportPlan } from '@resourcepackbuilder/core/export/types';
import { parseYaml, toYaml } from '@resourcepackbuilder/core/nexo/yaml';
import { isPlainObject } from '@resourcepackbuilder/core/object';
import { CopyButton, SectionCard } from '@resourcepackbuilder/ui';
import { FieldDescription, FieldError } from '@resourcepackbuilder/ui/components/field';
import { Textarea } from '@resourcepackbuilder/ui/components/textarea';
import { updateItem } from '../../commands/items';
import { YamlView } from '../../components/YamlView';
import { usePlan } from '../../store/PlanProvider';

const INDENT = '  ';
const EXAMPLE = 'Mechanics:\n  furniture:\n    placements:\n      wall:\n        properties:\n          translation: 0,0.3,-0.3';
/** Shown while the export plan does not know the item's file yet. */
const DEFAULT_YAML_FILE = 'plugins/Nexo/items/…';

/** The item's final Nexo YAML as the export writes it ('' while the plan is not ready). */
export function itemYamlPreview(plan: ExportPlan | null, item: Item): string {
  const entry = plan?.items.find((p) => p.item.id === item.id);
  return entry ? toYaml({ [item.nexoId || 'item']: entry.config }) : '';
}

function useRawYamlError(text: string): string | null {
  const t = useTranslations('item');
  const parsed = parseYaml(text);
  if (parsed.error) return parsed.error;
  return parsed.value !== null && !isPlainObject(parsed.value) ? t('yaml.notObject') : null;
}

export function YamlTab({ item }: { item: Item }) {
  const t = useTranslations('item');
  const tCommon = useTranslations('common');
  const plan = usePlan();
  const error = useRawYamlError(item.rawYaml);
  const preview = itemYamlPreview(plan, item);
  const yamlFile = plan?.items.find((p) => p.item.id === item.id)?.yamlFile ?? DEFAULT_YAML_FILE;
  const setRawYaml = (rawYaml: string) =>
    updateItem(
      item.id,
      (d) => {
        d.rawYaml = rawYaml;
      },
      'rawYaml',
    );

  return (
    <div className="flex flex-col gap-6">
      <SectionCard title={t('yaml.extraTitle')} description={t('yaml.extraDescription')}>
        <Textarea
          className="min-h-0 font-mono text-xs leading-5 [tab-size:2]"
          aria-invalid={error ? true : undefined}
          rows={10}
          spellCheck={false}
          value={item.rawYaml}
          placeholder={`${t('yaml.example')}\n${EXAMPLE}`}
          onChange={(e) => setRawYaml(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Tab') return;
            e.preventDefault();
            // setRangeText keeps the caret right after the inserted indent
            e.currentTarget.setRangeText(INDENT, e.currentTarget.selectionStart, e.currentTarget.selectionEnd, 'end');
            setRawYaml(e.currentTarget.value);
          }}
        />
        {error && <FieldError className="mt-1.5 text-xs">{t('yaml.error', { error })}</FieldError>}
        <FieldDescription className="mt-1.5 text-xs">{t('yaml.keyHint', { id: item.nexoId })}</FieldDescription>
      </SectionCard>

      <SectionCard
        title={t('yaml.finalTitle')}
        description={t('yaml.finalDescription', { file: yamlFile })}
        actions={<CopyButton text={preview} label={tCommon('copy')} />}
      >
        <YamlView text={preview || t('yaml.computing')} />
      </SectionCard>
    </div>
  );
}
