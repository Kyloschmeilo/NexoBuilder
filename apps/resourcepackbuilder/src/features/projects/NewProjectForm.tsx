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

/** Slug used when even the default project name gives none. */
const FALLBACK_NAMESPACE = 'my_pack';

/** Name, namespace and Minecraft version of a new project; the namespace follows the name until edited. */
export function NewProjectForm({ onDone }: { onDone?: () => void }) {
  const t = useTranslations('layout.projectForm');
  const id = useId();
  const actions = useProjectActions();
  const [name, setName] = useState('');
  const [editedNamespace, setEditedNamespace] = useState<string | null>(null);
  const [version, setVersion] = useState(DEFAULT_MC_VERSION);
  const defaultName = t('defaultName');
  const namespace = editedNamespace ?? slugify(name || defaultName, slugify(defaultName, FALLBACK_NAMESPACE));
  const problem = namespaceError(namespace);
  const namespaceMessage = problem === 'invalid' ? t('namespaceInvalid') : problem === 'minecraft' ? t('namespaceMinecraft') : null;

  const submit = async () => {
    if (namespaceMessage) return;
    await actions.create(name || defaultName, namespace, version);
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
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(12rem,100%),1fr))] gap-3">
        <Field data-invalid={!!namespaceMessage || undefined}>
          <FieldLabel htmlFor={`${id}-namespace`}>{t('namespace')}</FieldLabel>
          <Input
            id={`${id}-namespace`}
            className="font-mono"
            aria-invalid={!!namespaceMessage || undefined}
            value={namespace}
            onChange={(e) => setEditedNamespace(e.target.value.toLowerCase())}
          />
          {namespaceMessage && <FieldError>{namespaceMessage}</FieldError>}
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
      </div>
      <Button type="submit" size="lg" disabled={!!namespaceMessage}>
        <FolderPlus /> {t('create')}
      </Button>
    </form>
  );
}
