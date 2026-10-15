import { useId, useState } from 'react';
import { FolderPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DEFAULT_MC_VERSION, MC_VERSIONS } from '@resourcepackbuilder/core/minecraft/versions';
import { namespaceError } from '@resourcepackbuilder/core/minecraft/resourceLocation';
import { slugify } from '@resourcepackbuilder/core/text';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Field, FieldError, FieldLabel } from '@resourcepackbuilder/ui/components/field';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { useProjectActions } from './useProjectActions';

export function NewProjectForm({ onDone }: { onDone?: () => void }) {
  const t = useTranslations('layout.projectForm');
  const id = useId();
  const [name, setName] = useState('');
  const [namespace, setNamespace] = useState('');
  const [nsEdited, setNsEdited] = useState(false);
  const [version, setVersion] = useState(DEFAULT_MC_VERSION);
  const defaultName = t('defaultName');
  const defaultSlug = slugify(defaultName, 'my_pack');
  const ns = nsEdited ? namespace : slugify(name || defaultName, defaultSlug);
  const actions = useProjectActions();
  const nsProblem = namespaceError(ns);
  const nsError = nsProblem === 'invalid' ? t('namespaceInvalid') : nsProblem === 'minecraft' ? t('namespaceMinecraft') : null;
  const submit = async () => {
    if (nsError) return;
    await actions.create(name || defaultName, ns, version);
    onDone?.();
  };
  return (
    <div className="flex flex-col gap-3">
      <Field>
        <FieldLabel htmlFor={`${id}-name`}>{t('name')}</FieldLabel>
        <Input
          id={`${id}-name`}
          autoFocus
          placeholder={t('namePlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit();
          }}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field data-invalid={!!nsError || undefined}>
          <FieldLabel htmlFor={`${id}-ns`}>{t('namespace')}</FieldLabel>
          <Input
            id={`${id}-ns`}
            className="font-mono"
            aria-invalid={!!nsError || undefined}
            value={ns}
            onChange={(e) => {
              setNsEdited(true);
              setNamespace(e.target.value.toLowerCase());
            }}
          />
          {nsError && <FieldError>{nsError}</FieldError>}
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-version`}>{t('version')}</FieldLabel>
          <NativeSelect id={`${id}-version`} value={version} onChange={(e) => setVersion(e.target.value)}>
            {MC_VERSIONS.map((v) => (
              <NativeSelectOption key={v.id} value={v.id}>
                {v.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Button size="lg" disabled={!!nsError} onClick={() => void submit()}>
        <FolderPlus /> {t('create')}
      </Button>
    </div>
  );
}
