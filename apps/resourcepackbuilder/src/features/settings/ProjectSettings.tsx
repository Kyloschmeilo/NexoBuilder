/** Settings saved in the open project. */
import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { MC_VERSIONS, PACK_NAME_PATTERN } from '@resourcepackbuilder/minecraft';
import { packTargetFor } from '@resourcepackbuilder/export';
import { Field, FieldDescription, FieldError, FieldLabel } from '@resourcepackbuilder/ui/components/field';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { CheckboxField } from '../../components/CheckboxField';
import { updateProjectSettings } from '../../commands/settings';
import { richTags } from '../../i18n/richTags';
import { useOpenProject } from '../../store/project';
import { NamespaceProblemText, useNamespaceProblem } from '../../components/NamespaceProblem';
import { PackIconField } from './PackIconField';

export function ProjectSettings() {
  const t = useTranslations('dialogs.settings');
  const id = useId();
  const tTargets = useTranslations('layout.projectForm.targets');
  const project = useOpenProject();
  const checkNamespace = useNamespaceProblem();
  const namespaceProblem = checkNamespace(project.namespace, project.target);
  const { settings } = project;
  const isPackNameValid = PACK_NAME_PATTERN.test(settings.packName);
  const { layout } = packTargetFor(project);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 @xl/dialog:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={`${id}-name`}>{t('projectName')}</FieldLabel>
          <Input id={`${id}-name`} value={project.name} onChange={(e) => updateProjectSettings((p) => (p.name = e.target.value))} />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-target`}>{t('target')}</FieldLabel>
          <Input id={`${id}-target`} readOnly disabled value={tTargets(`${project.target}.name`)} />
          <FieldDescription>{t('targetHelp')}</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-version`}>{t('minecraftVersion')}</FieldLabel>
          <NativeSelect
            id={`${id}-version`}
            className="w-full"
            value={settings.minecraftVersion}
            onChange={(e) => updateProjectSettings((p) => (p.settings.minecraftVersion = e.target.value))}
          >
            {MC_VERSIONS.map((v) => (
              <NativeSelectOption key={v.id} value={v.id}>
                {v.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldDescription>{t('minecraftVersionHelp')}</FieldDescription>
        </Field>
        <Field data-invalid={namespaceProblem?.isError}>
          <FieldLabel htmlFor={`${id}-namespace`}>{t('namespace')}</FieldLabel>
          <Input
            id={`${id}-namespace`}
            className="font-mono"
            aria-invalid={namespaceProblem?.isError}
            value={project.namespace}
            onChange={(e) => updateProjectSettings((p) => (p.namespace = e.target.value.toLowerCase()))}
          />
          <NamespaceProblemText problem={namespaceProblem} fallback={t('namespaceHelp', { namespace: project.namespace })} />
        </Field>
        <Field data-invalid={!isPackNameValid}>
          <FieldLabel htmlFor={`${id}-pack-name`}>{t('packName')}</FieldLabel>
          <Input
            id={`${id}-pack-name`}
            className="font-mono"
            aria-invalid={!isPackNameValid}
            value={settings.packName}
            onChange={(e) => updateProjectSettings((p) => (p.settings.packName = e.target.value))}
          />
          {isPackNameValid ? (
            <FieldDescription className="font-mono text-xs break-all">{`${layout.pluginDir}/${layout.packLocation(project, false)}`}</FieldDescription>
          ) : (
            <FieldError>{t('packNameInvalid')}</FieldError>
          )}
        </Field>
        <Field className="@xl/dialog:col-span-2">
          <FieldLabel htmlFor={`${id}-description`}>{t('packDescription')}</FieldLabel>
          <Input
            id={`${id}-description`}
            value={settings.packDescription}
            onChange={(e) => updateProjectSettings((p) => (p.settings.packDescription = e.target.value))}
          />
        </Field>
      </div>

      <PackIconField packIcon={settings.packIcon} />

      {/* A Nexo setting: the CraftEngine export does not read it */}
      {project.target === 'nexo' && (
        <CheckboxField
          checked={settings.useItemModel}
          onChange={(checked) => updateProjectSettings((p) => (p.settings.useItemModel = checked))}
          label={t('useItemModel')}
          description={t.rich('useItemModelHelp', { ...richTags, component: 'Components.item_model: nexo:<item_id>' })}
        />
      )}
    </div>
  );
}
