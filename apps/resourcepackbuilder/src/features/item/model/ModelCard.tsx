/**
 * The item's model as a section panel: the 3D preview beside its settings (hold style, shading), the export check and
 * the notes of the import; or, while the item has no model, a drop zone for one.
 */
import { useTranslations } from 'next-intl';
import { RefreshCw, Trash2 } from 'lucide-react';
import { compareVersions, getMcVersion, type ImportedModel } from '@resourcepackbuilder/minecraft';
import { type Item, itemMaterial } from '@resourcepackbuilder/core/project';
import { issuesFor } from '@resourcepackbuilder/utils';
import { DropZone, FieldGroup, FieldRow, IconButton, MoreOptions, pickFiles, Section } from '@resourcepackbuilder/ui';
import { Alert, AlertDescription } from '@resourcepackbuilder/ui/components/alert';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { ModelPreview } from '../../../components/ModelPreview';
import { setItemModel } from '../../../commands/items';
import { IssueList } from '../../../components/IssueList';
import { MODEL_ACCEPT, MODEL_FORMATS } from '../../../components/modelFiles';
import { usePlan } from '../../../shell/PlanProvider';
import { useOpenProject } from '../../../store/project';
import { useItemActions } from '../useItemActions';
import { ModelParentSelect } from './ModelParentSelect';
import { ShadingOptions } from './ShadingOptions';
import { useModelImport } from './useModelImport';

const PREVIEW_HEIGHT = 300;

/** "Blockbench (.bbmodel), 12 cubes, 2 textures, parent: …" as one line. */
function useModelSummary(model: ImportedModel): string {
  const t = useTranslations('item');
  const elementCount = model.json.elements?.length ?? 0;
  const parent = model.json.parent;
  return [
    model.fileName,
    t(`model.source.${model.source}`),
    elementCount > 0 ? t('model.cubes', { count: elementCount }) : null,
    t('model.textureCount', { count: model.textures.length }),
    parent ? t('model.parent', { parent }) : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** Notice about the Minecraft version the model needs, a warning when the project targets an older one. */
function RequiredVersionAlert({ requiresVersion }: { requiresVersion: string }) {
  const t = useTranslations('item');
  const projectVersion = useOpenProject().settings.minecraftVersion;
  const isTooHigh = compareVersions(requiresVersion, projectVersion) > 0;
  return (
    <Alert variant={isTooHigh ? 'warning' : 'info'}>
      <AlertDescription>
        {isTooHigh
          ? t('model.requiresTooHigh', { version: requiresVersion, project: getMcVersion(projectVersion).label })
          : t('model.requires', { version: requiresVersion })}
      </AlertDescription>
    </Alert>
  );
}

/** Replace and remove, in the section header. */
function ModelActions({ itemId }: { itemId: string }) {
  const t = useTranslations('item');
  const tCommon = useTranslations('common');
  const { importModel } = useModelImport();
  const actions = useItemActions();
  const replace = async () => {
    const files = await pickFiles(MODEL_ACCEPT);
    if (!files.length) return;
    const model = await importModel(files);
    if (model) setItemModel(itemId, model);
  };
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => void replace()}>
        <RefreshCw /> {t('model.replace')}
      </Button>
      <IconButton label={tCommon('remove')} variant="ghost-destructive" onClick={() => void actions.removeModel(itemId)}>
        <Trash2 />
      </IconButton>
    </>
  );
}

/** The model section while the item has none: what that means, and a drop zone. */
export function NoModelCard({ item, id }: { item: Item; id?: string }) {
  const t = useTranslations('item');
  const { importModel } = useModelImport();
  return (
    <Section id={id} title={t('model.title')} description={t('model.noneDescription', { material: itemMaterial(item) })}>
      <DropZone
        onFiles={async (files) => {
          const model = await importModel(files);
          if (model) setItemModel(item.id, model);
        }}
        accept={MODEL_ACCEPT}
        title={t('model.dropTitle')}
        subtitle={t('model.dropSubtitle')}
        formats={MODEL_FORMATS}
      />
    </Section>
  );
}

/** The item's model: 3D preview, hold style and shading, the export check and the notes of the import. */
export function ModelCard({ item, model, id }: { item: Item; model: ImportedModel; id?: string }) {
  const t = useTranslations('item');
  const plan = usePlan();
  const summary = useModelSummary(model);
  const issues = plan ? issuesFor(plan.issues, { kind: 'item', id: item.id }).filter((i) => i.code !== 'plan.missingModel') : [];
  return (
    <Section id={id} title={t('model.title')} description={summary} actions={<ModelActions itemId={item.id} />}>
      <div className="grid gap-4 @3xl/section:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ModelPreview model={model} height={PREVIEW_HEIGHT} />
        <div className="flex min-w-0 flex-col gap-3">
          {model.requiresVersion && <RequiredVersionAlert requiresVersion={model.requiresVersion} />}
          <FieldGroup>
            <ModelParentSelect itemId={item.id} model={model} />
            <ShadingOptions itemId={item.id} model={model} />
            <FieldRow label={t('model.check')} layout="stacked">
              <IssueList issues={issues} empty={t('model.noProblems')} hideInfo={false} />
            </FieldRow>
          </FieldGroup>
          {model.issues.length > 0 && (
            <MoreOptions label={t('model.importNotes', { count: model.issues.length })}>
              <IssueList issues={model.issues} />
            </MoreOptions>
          )}
        </div>
      </div>
    </Section>
  );
}
