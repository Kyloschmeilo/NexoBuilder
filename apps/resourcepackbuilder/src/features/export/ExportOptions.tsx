/** Export options stored in the open project (pack as ZIP, project folder, YAML file layout). */
import { useId } from 'react';
import { useTranslations } from 'next-intl';
import type { ExportMode } from '@resourcepackbuilder/core/export/types';
import type { ProjectSettings } from '@resourcepackbuilder/core/project/types';
import { CollapsibleSection } from '@resourcepackbuilder/ui';
import { Field, FieldLabel } from '@resourcepackbuilder/ui/components/field';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { CheckboxField } from '../../components/CheckboxField';
import { updateProjectSettings } from '../../commands/settings';
import { useOpenProject } from '../../store/project';

type YamlFileMode = ProjectSettings['yamlFileMode'];

const YAML_FILE_MODES = ['folder', 'item'] as const satisfies readonly YamlFileMode[];

function isYamlFileMode(value: string): value is YamlFileMode {
  return YAML_FILE_MODES.some((mode) => mode === value);
}

export function ExportOptions({ mode, hasSeveralProjects }: { mode: ExportMode; hasSeveralProjects: boolean }) {
  const t = useTranslations('dialogs.export');
  const id = useId();
  const project = useOpenProject();
  const { settings } = project;
  const isZipOptionOff = mode !== 'full';
  const isFolderOptionOff = mode === 'pack' || hasSeveralProjects;
  return (
    <CollapsibleSection title={t('options', { name: project.name })}>
      <div className="flex flex-col gap-3">
        <CheckboxField
          checked={settings.externalPackAsZip}
          disabled={isZipOptionOff}
          onChange={(checked) => updateProjectSettings((p) => (p.settings.externalPackAsZip = checked))}
          label={t('externalPackAsZip')}
          description={t('externalPackAsZipHelp', { packName: settings.packName })}
        />
        <CheckboxField
          checked={settings.itemsInProjectFolder || hasSeveralProjects}
          disabled={isFolderOptionOff}
          onChange={(checked) => updateProjectSettings((p) => (p.settings.itemsInProjectFolder = checked))}
          label={t('itemsInProjectFolder')}
          description={
            hasSeveralProjects
              ? t('itemsInProjectFolderSeveral')
              : t('itemsInProjectFolderHelp', { project: `<${t('projectPlaceholder')}>` })
          }
        />
        <Field className="max-w-md" data-disabled={mode === 'pack'}>
          <FieldLabel htmlFor={`${id}-yaml`}>{t('yamlFiles')}</FieldLabel>
          <NativeSelect
            id={`${id}-yaml`}
            className="w-full"
            value={settings.yamlFileMode}
            disabled={mode === 'pack'}
            onChange={(e) => {
              const next = e.target.value;
              if (isYamlFileMode(next)) updateProjectSettings((p) => (p.settings.yamlFileMode = next));
            }}
          >
            <NativeSelectOption value="folder">{t('yamlPerFolder')}</NativeSelectOption>
            <NativeSelectOption value="item">{t('yamlPerItem')}</NativeSelectOption>
          </NativeSelect>
        </Field>
      </div>
    </CollapsibleSection>
  );
}
