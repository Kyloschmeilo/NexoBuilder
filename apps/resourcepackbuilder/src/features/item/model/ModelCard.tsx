import { useTranslations } from 'next-intl';
import { Box, RefreshCw, Trash2 } from 'lucide-react';
import { compareVersions, getMcVersion, type ImportedModel } from '@resourcepackbuilder/minecraft';
import type { Item } from '@resourcepackbuilder/core/project';
import { issuesFor } from '@resourcepackbuilder/utils';
import { CollapsibleSection, pickFiles, SectionCard } from '@resourcepackbuilder/ui';
import { Alert, AlertDescription } from '@resourcepackbuilder/ui/components/alert';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { ModelPreview } from '@resourcepackbuilder/preview';
import { setItemModel } from '../../../commands/items';
import { IssueList } from '../../../components/IssueList';
import { usePlan } from '../../../shell/PlanProvider';
import { useOpenProject } from '../../../store/project';
import { ModelParentSelect } from './ModelParentSelect';
import { ShadingOptions } from './ShadingOptions';
import { MODEL_ACCEPT } from '../../../components/modelFiles';
import { useItemActions } from '../useItemActions';
import { useModelImport } from './useModelImport';

const PREVIEW_HEIGHT = 360;

/** "Blockbench (.bbmodel) · 12 cubes · 2 textures · Parent: …" */
function useModelSummary(model: ImportedModel): string {
  const t = useTranslations('item');
  const elementCount = model.json.elements?.length ?? 0;
  const parent = model.json.parent;
  return [
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
      <Button variant="outline" size="sm" onClick={() => void replace()}>
        <RefreshCw /> {t('model.replace')}
      </Button>
      <Button variant="destructive" size="sm" onClick={() => void actions.removeModel(itemId)}>
        <Trash2 /> {tCommon('remove')}
      </Button>
    </>
  );
}

/** The item's model: 3D preview, display settings, the export check and the notes of the import. */
export function ModelCard({ item, model }: { item: Item; model: ImportedModel }) {
  const t = useTranslations('item');
  const plan = usePlan();
  const summary = useModelSummary(model);
  const issues = plan ? issuesFor(plan.issues, { kind: 'item', id: item.id }).filter((i) => i.code !== 'plan.missingModel') : [];
  return (
    <SectionCard
      icon={<Box className="size-4.5" />}
      title={model.fileName}
      description={summary}
      actions={<ModelActions itemId={item.id} />}
    >
      <div className="grid gap-4 @3xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <ModelPreview model={model} height={PREVIEW_HEIGHT} />
        <div className="flex min-w-0 flex-col gap-3">
          {model.requiresVersion && <RequiredVersionAlert requiresVersion={model.requiresVersion} />}
          <ModelParentSelect itemId={item.id} model={model} />
          <ShadingOptions itemId={item.id} model={model} />
          <div className="flex flex-col gap-1.5">
            <div className="text-sm font-medium">{t('model.check')}</div>
            <IssueList issues={issues} empty={t('model.noProblems')} hideInfo={false} />
          </div>
          {model.issues.length > 0 && (
            <CollapsibleSection title={t('model.importNotes', { count: model.issues.length })}>
              <IssueList issues={model.issues} />
            </CollapsibleSection>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
