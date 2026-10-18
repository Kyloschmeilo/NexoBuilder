/** The form that creates a project: plugin first (as two cards with docs links), then name, namespace and version. */
import { useId, useState } from 'react';
import { FolderPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DEFAULT_MC_VERSION, MC_VERSIONS } from '@resourcepackbuilder/minecraft';
import { DEFAULT_PACK_TARGET, defaultNamespace, PACK_TARGETS, type PackTargetId } from '@resourcepackbuilder/core/project';
import { CE_WIKI_URL } from '@resourcepackbuilder/core/craftEngine';
import { NEXO_DOCS_URL } from '@resourcepackbuilder/core/nexo';
import { cn } from '@resourcepackbuilder/ui/cn';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Field, FieldDescription, FieldLabel, FieldLegend, FieldSet } from '@resourcepackbuilder/ui/components/field';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { RadioGroup, RadioGroupItem } from '@resourcepackbuilder/ui/components/radio-group';
import { AutoGrid, DocsLink } from '@resourcepackbuilder/ui';
import { TargetDot } from '../../components/TargetDot';
import { isOneOf } from '../../lib/isOneOf';
import { NamespaceProblemText, useNamespaceProblem } from '../../components/NamespaceProblem';
import { useProjectActions } from './useProjectActions';

/** The checked card's border in the target's own colour. */
const CHECKED_BORDER: Record<PackTargetId, string> = {
  nexo: 'has-data-checked:border-target-nexo',
  craftengine: 'has-data-checked:border-target-ce',
};

/** The plugin's documentation home, linked from its card. */
const DOCS_HOME: Record<PackTargetId, string> = { nexo: NEXO_DOCS_URL, craftengine: CE_WIKI_URL };

/** One plugin to choose: radio, coloured dot, name and a short description, with a link to the plugin's docs. */
function TargetCard({ target, radioId }: { target: PackTargetId; radioId: string }) {
  const tTargets = useTranslations('layout.projectForm.targets');
  const name = tTargets(`${target}.name`);
  return (
    <div
      className={cn(
        'relative rounded-(--radius-panel) border border-line bg-surface transition-colors hover:border-line-strong has-data-checked:bg-accent-soft has-focus-visible:ring-2 has-focus-visible:ring-ring',
        CHECKED_BORDER[target],
      )}
    >
      <label htmlFor={radioId} className="flex cursor-pointer items-start gap-2.5 py-2.5 pr-9 pl-3">
        <RadioGroupItem id={radioId} value={target} data-testid={`new-project-target-${target}`} className="mt-0.5" />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="flex items-center gap-1.5 text-label font-semibold text-text">
            <TargetDot target={target} className="size-2" />
            {name}
          </span>
          <span className="text-meta text-text-muted">{tTargets(`${target}.description`)}</span>
        </span>
      </label>
      <DocsLink url={DOCS_HOME[target]} target={target} className="absolute top-2 right-2" />
    </div>
  );
}

/** Plugin, name, namespace and Minecraft version of a new project; the namespace follows the name until edited. */
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
  const defaultName = t('defaultName');
  const namespace = editedNamespace ?? defaultNamespace(name || defaultName);
  const problem = checkNamespace(namespace, target);
  const isInvalid = problem?.isError ?? false;

  const submit = async () => {
    if (isInvalid) return;
    if (await actions.create(name || defaultName, namespace, version, target)) onDone?.();
  };

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      {/* The plugin comes first: it cannot be changed once the project exists */}
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
            <TargetCard key={id} target={id} radioId={`${targetId}-${id}`} />
          ))}
        </RadioGroup>
        <FieldDescription className="text-meta">{t('targetHint')}</FieldDescription>
      </FieldSet>
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
      <Button type="submit" size="lg" disabled={isInvalid}>
        <FolderPlus /> {t('create')}
      </Button>
    </form>
  );
}
