import { useTranslations } from 'next-intl';
import type { Item, PackTargetId } from '@resourcepackbuilder/core/project';
import { findItemPlan, itemYamlPreview, packTargetFor } from '@resourcepackbuilder/export';
import { parseRawYaml } from '@resourcepackbuilder/core/yaml';
import { SectionCard } from '@resourcepackbuilder/ui';
import { FieldDescription, FieldError } from '@resourcepackbuilder/ui/components/field';
import { Textarea } from '@resourcepackbuilder/ui/components/textarea';
import { updateItem } from '../../commands/items';
import { YamlCode } from '../../components/YamlCode';
import { usePlan } from '../../shell/PlanProvider';
import { useOpenProject } from '../../store/project';

const INDENT = '  ';
/** An overlay in the target's own YAML shape */
const EXAMPLES: Record<PackTargetId, string> = {
  nexo: 'Mechanics:\n  furniture:\n    placements:\n      wall:\n        properties:\n          translation: 0,0.3,-0.3',
  craftengine: 'settings:\n  fuel_time: 300',
};
/** Shown while the export plan does not know the item's file yet. */
const DEFAULT_YAML_FILE = '…';

function useRawYamlError(text: string): string | null {
  const t = useTranslations('item');
  const { error } = parseRawYaml(text);
  if (!error) return null;
  return error.kind === 'syntax' ? error.message : t('yaml.notObject');
}

export function YamlTab({ item }: { item: Item }) {
  const t = useTranslations('item');
  const plan = usePlan();
  const project = useOpenProject();
  const target = packTargetFor(project);
  const error = useRawYamlError(item.rawYaml);
  const preview = itemYamlPreview(plan, item.id);
  const yamlFile = `${target.layout.pluginDir}/${findItemPlan(plan, item.id)?.yamlFile ?? DEFAULT_YAML_FILE}`;
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
          placeholder={`${t('yaml.example')}\n${EXAMPLES[project.target]}`}
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
        <FieldDescription className="mt-1.5 text-xs">{t('yaml.keyHint', { id: target.yamlKey(project, item) })}</FieldDescription>
      </SectionCard>

      <SectionCard title={t('yaml.finalTitle')} description={t('yaml.finalDescription', { file: yamlFile })}>
        <YamlCode text={preview || t('yaml.computing')} />
      </SectionCard>
    </div>
  );
}
