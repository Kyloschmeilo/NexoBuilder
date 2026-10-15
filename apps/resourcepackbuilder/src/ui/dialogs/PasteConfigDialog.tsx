/** Paste copied item properties into one or more items. */
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ClipboardPaste } from 'lucide-react';
import { COPY_CATEGORIES, summarizeClipboard, type CopyCategory, type SummaryEntry } from '@resourcepackbuilder/core/nexo/copyConfig';
import { selectFromProject } from '@resourcepackbuilder/core/export/selection';
import { Alert, AlertDescription } from '@resourcepackbuilder/ui/components/alert';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Checkbox } from '@resourcepackbuilder/ui/components/checkbox';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@resourcepackbuilder/ui/components/field';
import { ToggleGroup, ToggleGroupItem } from '@resourcepackbuilder/ui/components/toggle-group';
import { clipboardLabel, pasteItemProperties, useItemClipboard } from '../../state/clipboard';
import { useStore } from '../../state/store';
import { AppDialog, SectionLabel, richTags, useSchemaText } from './AppDialog';
import { SelectionTree } from './ExportSelection';

export function PasteConfigDialog({ targetItemIds }: { targetItemIds: string[] }) {
  const t = useTranslations('dialogs.pasteConfig');
  const tSel = useTranslations('dialogs.selection');
  const tc = useTranslations('common');
  const schemaText = useSchemaText();
  const ts = useTranslations('schema');
  const entryText = (entry: SummaryEntry) => ('text' in entry ? entry.text : ts(entry.key as never, entry.params as never));
  const project = useStore((s) => s.project)!;
  const close = useStore((s) => s.closeDialog);
  const clip = useItemClipboard((s) => s.clip);
  const summary = useMemo(() => (clip ? summarizeClipboard(clip) : []), [clip]);
  const [mode, setMode] = useState<'replace' | 'merge'>('replace');
  const [categories, setCategories] = useState<Set<CopyCategory>>(
    () => new Set(COPY_CATEGORIES.filter((c) => c.defaultOn && summary.find((s) => s.id === c.id)?.entries.length).map((c) => c.id)),
  );
  // Target selection like in the export: what is not selected is remembered
  const [excluded, setExcluded] = useState<string[]>(() => Object.keys(project.items).filter((id) => !targetItemIds.includes(id)));

  if (!clip) return null;
  const sourceInProject = !!project.items[clip.sourceItemId];
  const treeProject = sourceInProject ? selectFromProject(project, { excludedItemIds: [clip.sourceItemId], excludedGlyphIds: [] }) : project;
  const excludedSet = new Set(excluded);
  const targets = Object.keys(treeProject.items).filter((id) => !excludedSet.has(id));

  const apply = () => {
    const count = pasteItemProperties(targets, { categories, mode });
    useStore.getState().toast('success', t('pasted', { name: clipboardLabel(clip), count }));
    close();
  };

  const toggle = (id: CopyCategory) =>
    setCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <AppDialog
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
          <Button variant="outline" onClick={close}>
            {tc('cancel')}
          </Button>
          <Button disabled={targets.length === 0 || categories.size === 0} onClick={apply}>
            <ClipboardPaste /> {t('apply', { count: targets.length })}
          </Button>
        </>
      }
    >
      <div className="grid items-start gap-5 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <SectionLabel>{t('what')}</SectionLabel>
          <div className="flex flex-col gap-0.5">
            {COPY_CATEGORIES.map((c) => {
              const entries = summary.find((s) => s.id === c.id)?.entries ?? [];
              const id = `paste-category-${c.id}`;
              return (
                <Field key={c.id} orientation="horizontal" className="py-1.5">
                  <Checkbox id={id} checked={categories.has(c.id)} onCheckedChange={() => toggle(c.id)} />
                  <FieldContent>
                    <FieldLabel htmlFor={id} className="font-normal">
                      {schemaText(c.label)}
                      <span className="font-mono text-xs text-muted-foreground">{entries.length > 0 ? entries.length : '–'}</span>
                    </FieldLabel>
                    <FieldDescription className="text-xs">
                      {entries.length > 0 ? entries.map(entryText).join(', ') : mode === 'replace' ? t('emptyReplace') : t('emptyMerge')}
                    </FieldDescription>
                  </FieldContent>
                </Field>
              );
            })}
          </div>
          <div className="flex flex-col gap-1.5">
            <SectionLabel>{t('existing')}</SectionLabel>
            <ToggleGroup
              variant="outline"
              size="sm"
              spacing={0}
              aria-label={t('existing')}
              value={[mode]}
              onValueChange={(value) => {
                const next = value[0] as typeof mode | undefined;
                if (next) setMode(next);
              }}
            >
              <ToggleGroupItem value="replace" className="px-3">
                {t('replace')}
              </ToggleGroupItem>
              <ToggleGroupItem value="merge" className="px-3">
                {t('merge')}
              </ToggleGroupItem>
            </ToggleGroup>
            <p className="m-0 text-xs text-muted-foreground">{mode === 'replace' ? t('replaceHelp') : t('mergeHelp')}</p>
          </div>
          <Alert>
            <AlertDescription className="text-xs">{t('neverCopied')}</AlertDescription>
          </Alert>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1">
            <SectionLabel>{t.rich('targets', { ...richTags, count: targets.length })}</SectionLabel>
            <span className="flex-1" />
            <Button variant="ghost" size="sm" onClick={() => setExcluded([])}>
              {tSel('all')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setExcluded(Object.keys(project.items))}>
              {tSel('none')}
            </Button>
          </div>
          <div className="rounded-md border border-primary/50">
            <SelectionTree
              project={treeProject}
              itemsOnly
              selection={{ excludedItemIds: excluded, excludedGlyphIds: [] }}
              onChange={(next) => setExcluded(next.excludedItemIds)}
            />
          </div>
        </div>
      </div>
    </AppDialog>
  );
}
