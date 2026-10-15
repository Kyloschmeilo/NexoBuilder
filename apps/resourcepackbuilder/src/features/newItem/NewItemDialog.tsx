import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Box, FilePlus2, PackagePlus, TriangleAlert } from 'lucide-react';
import { isPngDataUrl } from '@resourcepackbuilder/core/binary/png';
import { getFolderPathLabel } from '@resourcepackbuilder/core/project/tree';
import { DropZone } from '@resourcepackbuilder/ui';
import { Alert, AlertDescription } from '@resourcepackbuilder/ui/components/alert';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@resourcepackbuilder/ui/components/card';
import { Field, FieldLabel } from '@resourcepackbuilder/ui/components/field';
import { Spinner } from '@resourcepackbuilder/ui/components/spinner';
import { ToggleGroup, ToggleGroupItem } from '@resourcepackbuilder/ui/components/toggle-group';
import { addItems } from '../../commands/items';
import { DialogFrame } from '../../components/DialogFrame';
import { FolderSelect } from '../../components/FolderSelect';
import { richTags } from '../../i18n/richTags';
import { closeDialog, type FeatureDialogProps } from '../../store/dialogs';
import { toast } from '../../store/notifications';
import { useOpenProject } from '../../store/project';
import { setEditorTab } from '../../store/ui';
import { MODEL_ACCEPT, MODEL_FORMATS } from '../item/model/modelFiles';
import { DraftCard } from './DraftCard';
import { ItemMetaFields } from './ItemMetaFields';
import { ignoredFileNames, sourceKey, type NewItemAction, type NewItemState } from './newItemState';
import { useNewItems } from './useNewItems';

/** With several PNGs only: one item per PNG, or all PNGs for one item. */
function PngModeToggle({ state, dispatch }: { state: NewItemState; dispatch: (action: NewItemAction) => void }) {
  const t = useTranslations('dialogs.newItem');
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">{t('multiplePngs')}</span>
      <ToggleGroup
        variant="outline"
        size="sm"
        spacing={0}
        value={[state.drafts.length > 1 ? 'separate' : 'combined']}
        onValueChange={([next]) => {
          if (next === 'separate' || next === 'combined') dispatch({ type: 'pngModeChanged', pngMode: next });
        }}
      >
        <ToggleGroupItem value="separate" className="px-3">
          {t('pngSeparate')}
        </ToggleGroupItem>
        <ToggleGroupItem value="combined" className="px-3">
          {t('pngCombined')}
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

/** Creates one or more items from dropped models or textures, or a single item without a model. */
export function NewItemDialog({ folderId, files: initialFiles }: FeatureDialogProps['newItem']) {
  const t = useTranslations('dialogs.newItem');
  const tCommon = useTranslations('common');
  const folderFieldId = useId();
  const project = useOpenProject();
  const [targetFolderId, setTargetFolderId] = useState(folderId);
  const { state, dispatch, entries, isReading, addFiles, inputs } = useNewItems(project, initialFiles);
  const ignored = ignoredFileNames(state);
  const hasDrafts = state.drafts.length > 0;
  const pngCount = state.files.filter((f) => isPngDataUrl(f.dataUrl)).length;
  const isOnlyPngs = pngCount > 1 && state.drafts.every((d) => d.kind === 'png');
  const toCreate = inputs(targetFolderId);

  const create = () => {
    if (!toCreate) return;
    addItems(toCreate);
    closeDialog();
    toast('success', t('created', { count: toCreate.length }));
    setEditorTab('general');
  };

  return (
    <DialogFrame
      title={t('title')}
      icon={<PackagePlus />}
      size="wide"
      sticky={hasDrafts}
      footerStart={t.rich('target', { ...richTags, folder: getFolderPathLabel(project, targetFolderId) })}
      footer={
        <>
          <Button variant="outline" onClick={closeDialog}>
            {tCommon('cancel')}
          </Button>
          <Button disabled={!toCreate} onClick={create}>
            <FilePlus2 />
            {t('create', { count: Math.max(entries.length, 1) })}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <Field className="max-w-xs">
          <FieldLabel htmlFor={folderFieldId}>{t('folder')}</FieldLabel>
          <FolderSelect id={folderFieldId} value={targetFolderId} onChange={setTargetFolderId} />
        </Field>

        {!state.isWithoutModel && (
          <DropZone
            data-testid="new-item-dropzone"
            onFiles={addFiles}
            accept={MODEL_ACCEPT}
            title={hasDrafts ? t('dropTitleMore') : t('dropTitle')}
            subtitle={hasDrafts ? t('dropSubtitleMore') : t('dropSubtitle')}
            formats={hasDrafts ? undefined : MODEL_FORMATS}
            compact={hasDrafts}
          />
        )}
        {isReading && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Spinner /> {t('reading')}
          </p>
        )}
        {ignored.length > 0 && (
          <Alert variant="warning">
            <TriangleAlert />
            <AlertDescription>{t('ignored', { files: ignored.join(', ') })}</AlertDescription>
          </Alert>
        )}

        {!hasDrafts && !state.isWithoutModel && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">{t('noModel')}</span>
            <Button variant="outline" size="sm" onClick={() => dispatch({ type: 'withoutModelChanged', isWithoutModel: true })}>
              <Box /> {t('createWithoutModel')}
            </Button>
          </div>
        )}

        {state.isWithoutModel && (
          <Card size="sm" className="rounded-lg">
            <CardHeader>
              <CardTitle className="font-heading">{t('withoutModelTitle')}</CardTitle>
              <CardDescription>{t('withoutModelDescription')}</CardDescription>
              <CardAction>
                <Button variant="outline" size="sm" onClick={() => dispatch({ type: 'withoutModelChanged', isWithoutModel: false })}>
                  {t('useModel')}
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <ItemMetaFields
                meta={state.plainMeta}
                idError={entries[0]?.idError ?? null}
                onChange={(patch) => dispatch({ type: 'metaChanged', sourceKey: null, patch })}
              />
            </CardContent>
          </Card>
        )}

        {isOnlyPngs && <PngModeToggle state={state} dispatch={dispatch} />}

        {entries.map(
          ({ draft, meta, idError }) =>
            draft && (
              <DraftCard
                key={draft.key}
                draft={draft}
                meta={meta}
                idError={idError}
                isSingle={entries.length === 1}
                onMetaChange={(patch) => dispatch({ type: 'metaChanged', sourceKey: sourceKey(draft), patch })}
                onDraftChange={(next) => dispatch({ type: 'draftChanged', draft: next })}
                onRemove={() => dispatch({ type: 'draftRemoved', draftKey: draft.key })}
              />
            ),
        )}
      </div>
    </DialogFrame>
  );
}
