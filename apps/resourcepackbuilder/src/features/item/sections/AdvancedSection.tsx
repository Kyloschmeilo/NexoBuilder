/**
 * The Advanced section of the item editor: raw YAML laid over the generated item config, for everything the editor
 * does not offer. The final YAML is in the output dock; a button shows it there.
 */
import { useTranslations } from 'next-intl';
import { PanelRight } from 'lucide-react';
import type { Item, PackTargetId } from '@resourcepackbuilder/core/project';
import { packTargetFor } from '@resourcepackbuilder/export';
import { parseRawYaml } from '@resourcepackbuilder/core/yaml';
import { Section } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { FieldDescription, FieldError } from '@resourcepackbuilder/ui/components/field';
import { Textarea } from '@resourcepackbuilder/ui/components/textarea';
import { updateItem } from '../../../commands/items';
import { useIsDockColumn } from '../../../shell/useDockLayout';
import { useOpenProject } from '../../../store/project';
import { showDock } from '../../../store/ui';

const INDENT = '  ';
/** An overlay in the target's own YAML shape */
const EXAMPLES: Record<PackTargetId, string> = {
  nexo: 'Mechanics:\n  furniture:\n    placements:\n      wall:\n        properties:\n          translation: 0,0.3,-0.3',
  craftengine: 'settings:\n  fuel_time: 300',
};

function useRawYamlError(text: string): string | null {
  const t = useTranslations('item');
  const { error } = parseRawYaml(text);
  if (!error) return null;
  return error.kind === 'syntax' ? error.message : t('yaml.notObject');
}

/** The raw YAML overlay of the item, with its parse error and where it goes. */
export function AdvancedSection({ item }: { item: Item }) {
  const t = useTranslations('item');
  const project = useOpenProject();
  const isDockColumn = useIsDockColumn();
  const target = packTargetFor(project);
  const error = useRawYamlError(item.rawYaml);
  const setRawYaml = (rawYaml: string) =>
    updateItem(
      item.id,
      (d) => {
        d.rawYaml = rawYaml;
      },
      'rawYaml',
    );

  return (
    <Section
      id="advanced"
      title={t('advanced.title')}
      description={t('yaml.extraDescription')}
      actions={
        <Button variant="ghost" size="sm" onClick={() => showDock('yaml', isDockColumn)}>
          <PanelRight /> {t('advanced.showYaml')}
        </Button>
      }
    >
      <Textarea
        aria-label={t('advanced.title')}
        className="min-h-0 font-mono text-xs leading-5 [tab-size:2]"
        aria-invalid={error ? true : undefined}
        rows={12}
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
      {error && <FieldError className="mt-1.5 text-meta">{t('yaml.error', { error })}</FieldError>}
      <FieldDescription className="mt-1.5 text-meta">{t('yaml.keyHint', { id: target.yamlKey(project, item) })}</FieldDescription>
    </Section>
  );
}
