/**
 * Settings saved in the open project, as the field groups of the settings page: General (name, plugin, namespace,
 * Minecraft version), Resource pack (pack name, description, icon) and the plugin's own item option (Nexo's
 * ItemModel component, CraftEngine's categories from folders).
 */
import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { MC_VERSIONS, PACK_NAME_PATTERN } from '@resourcepackbuilder/minecraft';
import { packTargetFor } from '@resourcepackbuilder/export';
import { FieldGroup, FieldRow } from '@resourcepackbuilder/ui';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { NEXO_DOCS } from '@resourcepackbuilder/core/nexo';
import { Switch } from '@resourcepackbuilder/ui/components/switch';
import { TargetDot } from '../../components/TargetDot';
import { setCarpentryAddon } from '../../commands/nexo';
import { updateProjectSettings } from '../../commands/settings';
import { DocsLinkButton } from '../media/DocsLinkButton';
import { richTags } from '../../i18n/richTags';
import { useOpenProject } from '../../store/project';
import { useNamespaceProblem } from '../../components/NamespaceProblem';
import { PackIconField } from './PackIconField';

/** Name, plugin (a fact), namespace and Minecraft version of the open project. */
export function GeneralSettings() {
  const t = useTranslations('dialogs.settings');
  const tTargets = useTranslations('layout.projectForm.targets');
  const id = useId();
  const project = useOpenProject();
  const checkNamespace = useNamespaceProblem();
  const namespaceProblem = checkNamespace(project.namespace, project.target);
  const { settings } = project;
  return (
    <FieldGroup>
      <FieldRow label={t('projectName')} htmlFor={`${id}-name`}>
        <Input id={`${id}-name`} value={project.name} onChange={(e) => updateProjectSettings((p) => (p.name = e.target.value))} />
      </FieldRow>
      <FieldRow label={t('target')} help={t('targetHelp')}>
        {/* A fact of the project, not a choice: shown as text with the target's colour */}
        <p data-testid="settings-target" className="m-0 flex min-h-7.5 items-center gap-2 text-body">
          <TargetDot target={project.target} className="size-2" />
          {tTargets(`${project.target}.name`)}
        </p>
      </FieldRow>
      <FieldRow
        label={t('namespace')}
        htmlFor={`${id}-namespace`}
        help={t('namespaceHelp', { namespace: project.namespace })}
        error={namespaceProblem?.isError ? namespaceProblem.message : undefined}
        warning={namespaceProblem && !namespaceProblem.isError ? namespaceProblem.message : undefined}
      >
        <Input
          id={`${id}-namespace`}
          className="font-mono"
          aria-invalid={namespaceProblem?.isError}
          value={project.namespace}
          onChange={(e) => updateProjectSettings((p) => (p.namespace = e.target.value.toLowerCase()))}
        />
      </FieldRow>
      <FieldRow label={t('minecraftVersion')} htmlFor={`${id}-version`} help={t('minecraftVersionHelp')}>
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
      </FieldRow>
    </FieldGroup>
  );
}

/** External pack name (with the folder it ends up in), pack description and pack icon. */
export function PackSettings() {
  const t = useTranslations('dialogs.settings');
  const id = useId();
  const project = useOpenProject();
  const { settings } = project;
  const isPackNameValid = PACK_NAME_PATTERN.test(settings.packName);
  const { layout } = packTargetFor(project);
  return (
    <FieldGroup>
      <FieldRow
        label={t('packName')}
        htmlFor={`${id}-pack-name`}
        error={isPackNameValid ? undefined : t('packNameInvalid')}
        // The folder the pack is written to: a fact that follows the name, so it stays visible
        help={
          isPackNameValid ? (
            <span className="font-mono break-all">{`${layout.pluginDir}/${layout.packLocation(project, false)}`}</span>
          ) : undefined
        }
        helpInline
      >
        <Input
          id={`${id}-pack-name`}
          className="font-mono"
          aria-invalid={!isPackNameValid}
          value={settings.packName}
          onChange={(e) => updateProjectSettings((p) => (p.settings.packName = e.target.value))}
        />
      </FieldRow>
      <FieldRow label={t('packDescription')} htmlFor={`${id}-description`}>
        <Input
          id={`${id}-description`}
          value={settings.packDescription}
          onChange={(e) => updateProjectSettings((p) => (p.settings.packDescription = e.target.value))}
        />
      </FieldRow>
      <PackIconField packIcon={settings.packIcon} />
    </FieldGroup>
  );
}

/**
 * The item option of the project's plugin: Nexo's ItemModel component, or CraftEngine's categories built from the
 * folders. Each plugin's export ignores the other one's option, so only the matching one is shown.
 */
export function TargetItemSettings() {
  const t = useTranslations('dialogs.settings');
  const project = useOpenProject();
  const { settings } = project;
  if (project.target === 'nexo') {
    return (
      <FieldGroup>
        <FieldRow
          label={t('useItemModel')}
          help={t.rich('useItemModelHelp', { ...richTags, component: 'Components.item_model: nexo:<item_id>' })}
        >
          <Switch
            aria-label={t('useItemModel')}
            className="mt-1.5"
            checked={settings.useItemModel}
            onCheckedChange={(checked) => updateProjectSettings((p) => (p.settings.useItemModel = checked))}
          />
        </FieldRow>
        {/* A Nexo addon: its custom block types are only offered when the server has it */}
        <FieldRow label={t('carpentryAddon')} help={t.rich('carpentryAddonHelp', richTags)}>
          <div className="flex items-center gap-2">
            <Switch
              aria-label={t('carpentryAddon')}
              className="mt-1.5"
              checked={settings.carpentryAddon === true}
              onCheckedChange={setCarpentryAddon}
            />
            <DocsLinkButton href={NEXO_DOCS.carpentry.page} label={t('carpentryAddonDocs')} />
          </div>
        </FieldRow>
      </FieldGroup>
    );
  }
  return (
    <FieldRow label={t('ceCategoriesFromFolders')} help={t.rich('ceCategoriesFromFoldersHelp', richTags)}>
      <Switch
        aria-label={t('ceCategoriesFromFolders')}
        className="mt-1.5"
        checked={settings.ceCategoriesFromFolders}
        onCheckedChange={(checked) => updateProjectSettings((p) => (p.settings.ceCategoriesFromFolders = checked))}
      />
    </FieldRow>
  );
}
