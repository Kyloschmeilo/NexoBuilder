import { useId, useState } from 'react';
import { FolderPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DEFAULT_MC_VERSION, MC_VERSIONS } from '@resourcepackbuilder/minecraft';
import { DEFAULT_PACK_TARGET, defaultNamespace, PACK_TARGETS } from '@resourcepackbuilder/core/project';
import { Button } from '@resourcepackbuilder/ui/components/button';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from '@resourcepackbuilder/ui/components/field';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { RadioGroup, RadioGroupItem } from '@resourcepackbuilder/ui/components/radio-group';
import { AutoGrid } from '@resourcepackbuilder/ui';
import { isOneOf } from '../../lib/isOneOf';
import { NamespaceProblemText, useNamespaceProblem } from '../../components/NamespaceProblem';
import { useProjectActions } from './useProjectActions';

/** Name, namespace and Minecraft version of a new project; the namespace follows the name until edited. */
export function NewProjectForm({ onDone }: { onDone?: () => void }) {
  const t = useTranslations('layout.projectForm');
  const id = useId();
  const targetId = `${id}-target`;
  const actions = useProjectActions();
  const checkNamespace = useNamespaceProblem();
  const [name, setName] = useState('');
  const [editedNamespace, setEditedNamespace] = useState<string | null>(null);
  const [version, setVersion] = useState(DEFAULT_MC_VERSION);
  const [target, setTarget] = useState(DEFAULT_PACK_TARGET);
  const tTargets = useTranslations('layout.projectForm.targets');
  const defaultName = t('defaultName');
  const namespace = editedNamespace ?? defaultNamespace(name || defaultName);
  const problem = checkNamespace(namespace, target);
  const isInvalid = problem?.isError ?? false;

  const submit = async () => {
    if (isInvalid) return;
    await actions.create(name || defaultName, namespace, version, target);
    onDone?.();
  };

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <Field>
        <FieldLabel htmlFor={`${id}-name`}>{t('name')}</FieldLabel>
        <Input
          id={`${id}-name`}
          data-testid="new-project-name"
          autoFocus
          placeholder={t('namePlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <AutoGrid min="12rem" fit className="gap-3">
        <Field data-invalid={isInvalid || undefined}>
          <FieldLabel htmlFor={`${id}-namespace`}>{t('namespace')}</FieldLabel>
          <Input
            id={`${id}-namespace`}
            className="font-mono"
            aria-invalid={isInvalid || undefined}
            value={namespace}
            onChange={(e) => setEditedNamespace(e.target.value.toLowerCase())}
          />
          <NamespaceProblemText problem={problem} />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-version`}>{t('version')}</FieldLabel>
          <NativeSelect id={`${id}-version`} className="w-full" value={version} onChange={(e) => setVersion(e.target.value)}>
            {MC_VERSIONS.map((v) => (
              <NativeSelectOption key={v.id} value={v.id}>
                {v.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      </AutoGrid>
      <FieldSet>
        <FieldLegend variant="label">{t('target')}</FieldLegend>
        <RadioGroup
          value={target}
          onValueChange={(value) => {
            if (isOneOf(PACK_TARGETS, value)) setTarget(value);
          }}
          className="grid gap-2 sm:grid-cols-2"
        >
          {PACK_TARGETS.map((id) => (
            <FieldLabel key={id} htmlFor={`${targetId}-${id}`}>
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldTitle>{tTargets(`${id}.name`)}</FieldTitle>
                  <FieldDescription className="text-xs">{tTargets(`${id}.description`)}</FieldDescription>
                </FieldContent>
                <RadioGroupItem id={`${targetId}-${id}`} value={id} data-testid={`new-project-target-${id}`} />
              </Field>
            </FieldLabel>
          ))}
        </RadioGroup>
        <FieldDescription>{t('targetHint')}</FieldDescription>
      </FieldSet>
      <Button type="submit" size="lg" disabled={isInvalid}>
        <FolderPlus /> {t('create')}
      </Button>
    </form>
  );
}
