/** Settings saved in the open project. */
import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { MC_VERSIONS, PACK_NAME_PATTERN } from '@resourcepackbuilder/minecraft';
import { packTargetFor } from '@resourcepackbuilder/export';
import { Field, FieldDescription, FieldError, FieldLabel, FieldTitle } from '@resourcepackbuilder/ui/components/field';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { NEXO_DOCS } from '@resourcepackbuilder/core/nexo';
import { CheckboxField } from '../../components/CheckboxField';
import { TargetDot } from '../../components/TargetDot';
import { setCarpentryAddon } from '../../commands/nexo';
import { updateProjectSettings } from '../../commands/settings';
import { DocsLinkButton } from '../media/DocsLinkButton';
import { richTags } from '../../i18n/richTags';
import { useOpenProject } from '../../store/project';
import { NamespaceProblemText, useNamespaceProblem } from '../../components/NamespaceProblem';
import { PackIconField } from './PackIconField';

/** The settings stored in the open project: name, target, Minecraft version, namespace, pack and target options. */
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
      <div className="grid gap-4 @xl/settings:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={`${id}-name`}>{t('projectName')}</FieldLabel>
          <Input id={`${id}-name`} value={project.name} onChange={(e) => updateProjectSettings((p) => (p.name = e.target.value))} />
        </Field>
        <Field>
          <FieldTitle>{t('target')}</FieldTitle>
          {/* A fact of the project, not a choice: shown as text with the target's colour */}
          <p className="flex h-7.5 items-center gap-2 text-body">
            <TargetDot target={project.target} className="size-2" />
            {tTargets(`${project.target}.name`)}
          </p>
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
        <Field className="@xl/settings:col-span-2">
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
      {/* A Nexo addon: its custom block types are only offered when the server has it */}
      {project.target === 'nexo' && (
        <div className="flex items-start gap-2">
          <CheckboxField
            className="flex-1"
            checked={settings.carpentryAddon === true}
            onChange={setCarpentryAddon}
            label={t('carpentryAddon')}
            description={t.rich('carpentryAddonHelp', richTags)}
          />
          <DocsLinkButton href={NEXO_DOCS.carpentry.page} label={t('carpentryAddonDocs')} />
        </div>
      )}
      {/* A CraftEngine setting: Nexo has no item browser categories */}
      {project.target === 'craftengine' && (
        <CheckboxField
          checked={settings.ceCategoriesFromFolders}
          onChange={(checked) => updateProjectSettings((p) => (p.settings.ceCategoriesFromFolders = checked))}
          label={t('ceCategoriesFromFolders')}
          description={t.rich('ceCategoriesFromFoldersHelp', richTags)}
        />
      )}
    </div>
  );
}
