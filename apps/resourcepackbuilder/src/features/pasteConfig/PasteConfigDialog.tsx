/** Paste copied item properties into one or more items. */
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ClipboardPaste } from 'lucide-react';
import { selectFromProject } from '@resourcepackbuilder/core/export/selection';
import {
  COPY_CATEGORIES,
  summarizeClipboard,
  type CopyCategory,
  type ItemConfigClipboard,
  type PasteOptions,
} from '@resourcepackbuilder/core/nexo/copyConfig';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { pasteItemProperties } from '../../commands/clipboard';
import { DialogFrame } from '../../components/DialogFrame';
import { SelectionHeader, SelectionTree } from '../../components/selection/SelectionTree';
import { richTags } from '../../i18n/richTags';
import { clipboardLabel, useClipboardStore } from '../../store/clipboard';
import { closeDialog, type FeatureDialogProps } from '../../store/dialogs';
import { notify } from '../../shell/notify';
import { useOpenProject } from '../../store/project';

import { CategoryPicker } from './CategoryPicker';

function PasteDialogContent({ clip, targetItemIds }: { clip: ItemConfigClipboard; targetItemIds: string[] }) {
  const t = useTranslations('dialogs.pasteConfig');
  const tCommon = useTranslations('common');
  const project = useOpenProject();
  const summary = useMemo(() => summarizeClipboard(clip), [clip]);
  const [mode, setMode] = useState<PasteOptions['mode']>('replace');
  const [categories, setCategories] = useState<ReadonlySet<CopyCategory>>(
    () => new Set(COPY_CATEGORIES.filter((c) => c.defaultOn && summary.find((s) => s.id === c.id)?.entries.length).map((c) => c.id)),
  );
  // Target selection like in the export: what is not selected is stored
  const [excludedIds, setExcludedIds] = useState<string[]>(() => Object.keys(project.items).filter((id) => !targetItemIds.includes(id)));

  // The source item cannot be a target
  const treeProject = project.items[clip.sourceItemId]
    ? selectFromProject(project, { excludedItemIds: [clip.sourceItemId], excludedGlyphIds: [] })
    : project;
  const excluded = new Set(excludedIds);
  const targets = Object.keys(treeProject.items).filter((id) => !excluded.has(id));

  const apply = () => {
    const count = pasteItemProperties(targets, { categories: new Set(categories), mode });
    notify('success', t('pasted', { name: clipboardLabel(clip), count }));
    closeDialog();
  };

  return (
    <DialogFrame
      title={t('title')}
      icon={<ClipboardPaste />}
      size="wide"
      footerStart={
        <>
          {t.rich('source', { ...richTags, name: clipboardLabel(clip), id: clip.sourceNexoId })}
          {clip.projectId !== project.id && ` · ${t('otherProject')}`}
        </>
      }
      footer={
        <>
          <Button variant="outline" onClick={closeDialog}>
            {tCommon('cancel')}
          </Button>
          <Button disabled={targets.length === 0 || categories.size === 0} onClick={apply}>
            <ClipboardPaste /> {t('apply', { count: targets.length })}
          </Button>
        </>
      }
    >
      <div className="grid items-start gap-5 @3xl/dialog:grid-cols-2">
        <CategoryPicker summary={summary} categories={categories} onCategoriesChange={setCategories} mode={mode} onModeChange={setMode} />
        <section className="flex min-w-0 flex-col gap-2">
          <SelectionHeader
            title={t.rich('targets', { ...richTags, count: targets.length })}
            onAll={() => setExcludedIds([])}
            onNone={() => setExcludedIds(Object.keys(project.items))}
          />
          <div className="rounded-md border border-primary/50">
            <SelectionTree
              project={treeProject}
              itemsOnly
              selection={{ excludedItemIds: excludedIds, excludedGlyphIds: [] }}
              onChange={(next) => setExcludedIds(next.excludedItemIds)}
            />
          </div>
        </section>
      </div>
    </DialogFrame>
  );
}

export function PasteConfigDialog({ targetItemIds }: FeatureDialogProps['pasteConfig']) {
  const clip = useClipboardStore((s) => s.clip);
  return clip ? <PasteDialogContent clip={clip} targetItemIds={targetItemIds} /> : null;
}
