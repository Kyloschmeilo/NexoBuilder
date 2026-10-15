import { useTranslations } from 'next-intl';
import type { Item } from '@resourcepackbuilder/core/project/types';
import type { ExportPlan } from '@resourcepackbuilder/core/export/types';
import { parseYaml, toYaml } from '@resourcepackbuilder/core/nexo/yaml';
import { isPlainObject } from '@resourcepackbuilder/core/object';
import { CopyButton } from '@resourcepackbuilder/ui';
import { updateItem } from '../../commands/items';
import { YamlView } from '../../components/YamlView';
import { usePlan } from '../../store/PlanProvider';
import { FieldDescription, FieldError } from '@resourcepackbuilder/ui/components/field';
import { Textarea } from '@resourcepackbuilder/ui/components/textarea';
import { EditorCard } from './EditorCard';

export function itemYamlPreview(plan: ExportPlan | null, item: Item): string {
  const entry = plan?.items.find((p) => p.item.id === item.id);
  if (!entry) return '';
  return toYaml({ [item.nexoId || 'item']: entry.config });
}

const EXAMPLE = 'Mechanics:\n  furniture:\n    placements:\n      wall:\n        properties:\n          translation: 0,0.3,-0.3';

export function YamlTab({ item }: { item: Item }) {
  const t = useTranslations('item');
  const plan = usePlan();
  const tCommon = useTranslations('common');
  const text = item.rawYaml;
  const parsed = parseYaml(text);
  const error = parsed.error ?? (parsed.value !== null && !isPlainObject(parsed.value) ? t('yaml.notObject') : null);
  const preview = itemYamlPreview(plan, item);
  const entry = plan?.items.find((p) => p.item.id === item.id);

  return (
    <div>
      <EditorCard title={t('yaml.extraTitle')} description={t('yaml.extraDescription')}>
        <Textarea
          className="min-h-0 font-mono text-[13px]"
          aria-invalid={error ? true : undefined}
          rows={10}
          spellCheck={false}
          value={text}
          placeholder={`${t('yaml.example')}\n${EXAMPLE}`}
          onChange={(e) => updateItem(item.id, (d) => (d.rawYaml = e.target.value), 'rawYaml')}
          onKeyDown={(e) => {
            if (e.key === 'Tab') {
              e.preventDefault();
              const el = e.target as HTMLTextAreaElement;
              const { selectionStart, selectionEnd } = el;
              const next = text.slice(0, selectionStart) + '  ' + text.slice(selectionEnd);
              updateItem(item.id, (d) => (d.rawYaml = next), 'rawYaml');
              window.requestAnimationFrame(() => el.setSelectionRange(selectionStart + 2, selectionStart + 2));
            }
          }}
        />
        {error && <FieldError className="mt-1.5 text-xs">{t('yaml.error', { error })}</FieldError>}
        <FieldDescription className="mt-1.5 text-xs">{t('yaml.keyHint', { id: item.nexoId })}</FieldDescription>
      </EditorCard>

      <EditorCard
        title={t('yaml.finalTitle')}
        description={t('yaml.finalDescription', { file: entry?.yamlFile ?? 'plugins/Nexo/items/…' })}
        actions={<CopyButton text={preview} label={tCommon('copy')} />}
      >
        <YamlView text={preview || t('yaml.computing')} />
      </EditorCard>
    </div>
  );
}
