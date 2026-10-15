/** Settings saved in the open project. */
import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { MC_VERSIONS } from '@resourcepackbuilder/core/minecraft/versions';
import { PACK_NAME_PATTERN } from '@resourcepackbuilder/core/minecraft/resourceLocation';
import { Checkbox } from '@resourcepackbuilder/ui/components/checkbox';
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from '@resourcepackbuilder/ui/components/field';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { updateProjectSettings } from '../../commands/settings';
import { richTags } from '../../i18n/richTags';
import { useOpenProject } from '../../store/project';
import { NamespaceProblemText, useNamespaceProblem } from '../projects/NamespaceProblem';
import { PackIconField } from './PackIconField';

export function ProjectSettings() {
  const t = useTranslations('dialogs.settings');
  const id = useId();
  const project = useOpenProject();
  const checkNamespace = useNamespaceProblem();
  const namespaceProblem = checkNamespace(project.namespace);
  const { settings } = project;
  const isPackNameValid = PACK_NAME_PATTERN.test(settings.packName);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 @xl/dialog:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={`${id}-name`}>{t('projectName')}</FieldLabel>
          <Input id={`${id}-name`} value={project.name} onChange={(e) => updateProjectSettings((p) => (p.name = e.target.value))} />
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
            <FieldDescription className="font-mono text-xs break-all">plugins/Nexo/pack/external_packs/{settings.packName}</FieldDescription>
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

      <Field orientation="horizontal">
        <Checkbox
          id={`${id}-item-model`}
          checked={settings.useItemModel}
          onCheckedChange={(checked) => updateProjectSettings((p) => (p.settings.useItemModel = checked))}
        />
        <FieldContent>
          <FieldLabel htmlFor={`${id}-item-model`}>{t('useItemModel')}</FieldLabel>
          <FieldDescription>{t.rich('useItemModelHelp', { ...richTags, component: 'Components.item_model: nexo:<item_id>' })}</FieldDescription>
        </FieldContent>
      </Field>
    </div>
  );
}
