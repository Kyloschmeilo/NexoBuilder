import { useEffect, useId, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Box, FilePlus2, Image as ImageIcon, PackagePlus, Trash2, TriangleAlert } from 'lucide-react';
import type { DroppedFile } from '@resourcepackbuilder/core/model/textures';
import {
  MAX_ITEM_LAYERS,
  TEXTURE_TEMPLATES,
  getTextureTemplate,
  isTextureTemplateId,
  suggestSlotAssignment,
} from '@resourcepackbuilder/core/model/textureModel';
import { createDrafts, runDraft, unsupportedFiles, type ImportDraft, type PngMode } from '@resourcepackbuilder/core/model/drafts';
import { isPngDataUrl } from '@resourcepackbuilder/core/binary/png';
import { MATERIALS } from '@resourcepackbuilder/core/nexo/options';
import { validateItemId } from '@resourcepackbuilder/core/project/ids';
import { slugify, stripFormatting } from '@resourcepackbuilder/core/text';
import { getFolderPathLabel } from '@resourcepackbuilder/core/project/tree';
import { DropZone, IconButton, readLoadedFiles, type LoadedFile } from '@resourcepackbuilder/ui';
import { Alert, AlertDescription } from '@resourcepackbuilder/ui/components/alert';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@resourcepackbuilder/ui/components/card';
import { Field, FieldDescription, FieldError, FieldLabel, FieldTitle } from '@resourcepackbuilder/ui/components/field';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { ToggleGroup, ToggleGroupItem } from '@resourcepackbuilder/ui/components/toggle-group';
import { ModelPreview } from '@resourcepackbuilder/preview';
import { addItems } from '../../commands/items';
import { DialogFrame } from '../../components/DialogFrame';
import { TextInput } from '../../components/editor';
import { FolderSelect } from '../../components/FolderSelect';
import { IssueList } from '../../components/IssueList';
import { useSchemaText } from '../../components/useSchemaText';
import { useErrorMessage } from '../../i18n/errors';
import { richTags } from '../../i18n/richTags';
import { closeDialog, type FeatureDialogProps } from '../../store/dialogs';
import { toast } from '../../store/notifications';
import { useOpenProject } from '../../store/project';
import { setEditorTab } from '../../store/ui';

interface DraftMeta {
  displayName: string;
  nexoId: string;
  idEdited: boolean;
  material: string;
}

const ACCEPT = '.bbmodel,.json,.png,.mcmeta';

const isPng = (file: DroppedFile) => isPngDataUrl(file.dataUrl);

type IdError = 'idRequired' | 'idInvalid' | 'idExists' | 'idDuplicate';

/** Stable key of a draft (main file) so inputs are kept when rebuilding. */
function sourceKey(draft: ImportDraft): string {
  return `${draft.kind}:${draft.files[0]?.name ?? draft.key}`;
}

function WarningHint({ children }: { children: React.ReactNode }) {
  return (
    <Alert className="border-warning/50 bg-warning/10">
      <TriangleAlert className="text-warning" />
      <AlertDescription className="text-foreground">{children}</AlertDescription>
    </Alert>
  );
}

export function NewItemDialog({ folderId, files: initialFiles }: FeatureDialogProps['newItem']) {
  const t = useTranslations('dialogs.newItem');
  const tCommon = useTranslations('common');
  const errorMessage = useErrorMessage();
  const folderFieldId = useId();
  const project = useOpenProject();
  const close = closeDialog;
  const [files, setFiles] = useState<DroppedFile[]>([]);
  const [drafts, setDrafts] = useState<ImportDraft[]>([]);
  const [meta, setMeta] = useState<Record<string, DraftMeta>>({});
  const [pngMode, setPngMode] = useState<PngMode>('auto');
  const [targetFolder, setTargetFolder] = useState(folderId);
  const [loading, setLoading] = useState(Boolean(initialFiles?.length));
  const [withoutModel, setWithoutModel] = useState(false);
  const [plainMeta, setPlainMeta] = useState<DraftMeta>({ displayName: '', nexoId: '', idEdited: false, material: 'PAPER' });
  const [ignored, setIgnored] = useState<string[]>([]);

  const addRead = (read: LoadedFile[]) => {
    const next = [...files.filter((f) => !read.some((r) => r.name === f.name)), ...read];
    setIgnored(unsupportedFiles(next).map((f) => f.name));
    setFiles(next);
    rebuild(next, pngMode);
    setWithoutModel(false);
    setLoading(false);
  };

  const readFailed = (err: unknown) => {
    toast('error', t('readFailed', { error: errorMessage(err) }));
    setLoading(false);
  };

  const addFiles = (list: File[]) => {
    setLoading(true);
    readLoadedFiles(list).then(addRead, readFailed);
  };

  const rebuild = (all: DroppedFile[], mode: typeof pngMode) => {
    const next = createDrafts(all, mode);
    setDrafts(next);
    // Inputs (name, ID, material) are kept when more files are added
    setMeta((old) => {
      const result = { ...old };
      for (const d of next) {
        const key = sourceKey(d);
        if (!result[key]) result[key] = { displayName: d.name, nexoId: slugify(d.name), idEdited: false, material: 'PAPER' };
      }
      return result;
    });
  };

  useEffect(() => {
    if (initialFiles?.length) readLoadedFiles(initialFiles).then(addRead, readFailed);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- only the files the dialog was opened with

  const entries = withoutModel ? [] : drafts;
  const allMeta = useMemo(
    () => (withoutModel ? [plainMeta] : drafts.map((d) => meta[sourceKey(d)]).filter((m) => m !== undefined)),
    [withoutModel, plainMeta, drafts, meta],
  );

  const idErrors = useMemo((): Array<IdError | null> => {
    const counts = new Map<string, number>();
    for (const m of allMeta) counts.set(m.nexoId, (counts.get(m.nexoId) ?? 0) + 1);
    return allMeta.map((m) => {
      const error = validateItemId(project, m.nexoId);
      if (error) return error.kind === 'missing' ? 'idRequired' : error.kind === 'invalid' ? 'idInvalid' : 'idExists';
      return (counts.get(m.nexoId) ?? 0) > 1 ? 'idDuplicate' : null;
    });
  }, [allMeta, project]);

  const blocking = withoutModel
    ? !!idErrors[0]
    : entries.length === 0 || entries.some((d) => d.error || !d.model) || idErrors.some(Boolean);

  const create = () => {
    if (blocking) return;
    const inputs = withoutModel
      ? [
          {
            displayName: plainMeta.displayName,
            nexoId: plainMeta.nexoId,
            folderId: targetFolder,
            material: plainMeta.material || 'PAPER',
            model: null,
          },
        ]
      : entries.map((d) => {
          const m = meta[sourceKey(d)];
          return { displayName: m.displayName, nexoId: m.nexoId, folderId: targetFolder, material: m.material || 'PAPER', model: d.model };
        });
    addItems(inputs);
    close();
    toast('success', t('created', { count: inputs.length }));
    setEditorTab('general');
  };

  const updateMeta = (key: string, patch: Partial<DraftMeta>) =>
    setMeta((old) => {
      const current = old[key];
      const next = { ...current, ...patch };
      if (patch.displayName !== undefined && !current.idEdited) next.nexoId = slugify(stripFormatting(patch.displayName));
      return { ...old, [key]: next };
    });

  const updateDraft = (key: string, patch: Partial<ImportDraft>) =>
    setDrafts((old) => old.map((d) => (d.key === key ? runDraft({ ...d, ...patch }) : d)));

  const pngCount = files.filter(isPng).length;
  const onlyPngs = pngCount > 0 && drafts.every((d) => d.kind === 'png');

  return (
    <DialogFrame
      title={t('title')}
      icon={<PackagePlus />}
      size="wide"
      sticky={drafts.length > 0}
      footerStart={t.rich('target', { ...richTags, folder: getFolderPathLabel(project, targetFolder) })}
      footer={
        <>
          <Button variant="outline" onClick={close}>
            {tCommon('cancel')}
          </Button>
          <Button disabled={blocking} onClick={create}>
            <FilePlus2 />
            {t('create', { count: withoutModel ? 1 : Math.max(entries.length, 1) })}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <Field className="max-w-[260px] min-w-[260px]">
          <FieldLabel htmlFor={folderFieldId}>{t('folder')}</FieldLabel>
          <FolderSelect id={folderFieldId} value={targetFolder} onChange={setTargetFolder} />
        </Field>

        {!withoutModel && (
          <DropZone
            onFiles={addFiles}
            accept={ACCEPT}
            title={drafts.length ? t('dropTitleMore') : t('dropTitle')}
            subtitle={drafts.length ? t('dropSubtitleMore') : t('dropSubtitle')}
            formats={drafts.length ? undefined : ['.bbmodel', '.json + .png', '.png', '.png.mcmeta']}
            compact={drafts.length > 0}
          />
        )}
        {loading && <div className="text-xs text-muted-foreground">{t('reading')}</div>}
        {ignored.length > 0 && <WarningHint>{t('ignored', { files: ignored.join(', ') })}</WarningHint>}

        {drafts.length === 0 && !withoutModel && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t('noModel')}</span>
            <Button variant="outline" size="sm" onClick={() => setWithoutModel(true)}>
              <Box /> {t('createWithoutModel')}
            </Button>
          </div>
        )}

        {withoutModel && (
          <Card size="sm" className="rounded-lg">
            <CardHeader>
              <CardTitle className="font-heading">{t('withoutModelTitle')}</CardTitle>
              <CardDescription>{t('withoutModelDescription')}</CardDescription>
              <CardAction>
                <Button variant="outline" size="sm" onClick={() => setWithoutModel(false)}>
                  {t('useModel')}
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <MetaFields
                meta={plainMeta}
                idError={idErrors[0]}
                onChange={(patch) =>
                  setPlainMeta((old) => {
                    const next = { ...old, ...patch };
                    if (patch.displayName !== undefined && !old.idEdited) next.nexoId = slugify(stripFormatting(patch.displayName));
                    return next;
                  })
                }
              />
            </CardContent>
          </Card>
        )}

        {onlyPngs && pngCount > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">{t('multiplePngs')}</span>
            <ToggleGroup
              variant="outline"
              size="sm"
              spacing={0}
              value={[drafts.length > 1 ? 'separate' : 'combined']}
              onValueChange={(value) => {
                const next = value[0] === 'separate' ? 'separate' : value[0] === 'combined' ? 'combined' : null;
                if (!next) return;
                setPngMode(next);
                rebuild(files, next);
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
        )}

        {entries.map((draft, index) => (
          <DraftCard
            key={draft.key}
            draft={draft}
            meta={meta[sourceKey(draft)]}
            idError={idErrors[index]}
            single={entries.length === 1}
            onMeta={(patch) => updateMeta(sourceKey(draft), patch)}
            onDraft={(patch) => updateDraft(draft.key, patch)}
            onRemove={() => {
              setDrafts((old) => old.filter((d) => d.key !== draft.key));
            }}
          />
        ))}
      </div>
    </DialogFrame>
  );
}

function MetaFields({
  meta,
  idError,
  onChange,
}: {
  meta: DraftMeta;
  idError: IdError | null;
  onChange: (patch: Partial<DraftMeta>) => void;
}) {
  const t = useTranslations('dialogs.newItem');
  const nameId = useId();
  const idId = useId();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field>
        <FieldLabel htmlFor={nameId}>{t('displayName')}</FieldLabel>
        <Input
          id={nameId}
          value={meta.displayName}
          placeholder={t('displayNamePlaceholder', { tag: '<red>' })}
          autoFocus
          onChange={(e) => onChange({ displayName: e.target.value })}
        />
      </Field>
      <Field data-invalid={!!idError}>
        <FieldLabel htmlFor={idId}>{t('itemId')}</FieldLabel>
        <Input
          id={idId}
          className="font-mono"
          aria-invalid={!!idError}
          value={meta.nexoId}
          onChange={(e) => onChange({ nexoId: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'), idEdited: true })}
        />
        {idError && <FieldError>{t(idError)}</FieldError>}
      </Field>
      <label className="flex flex-col gap-2">
        <FieldTitle>{t('material')}</FieldTitle>
        <TextInput
          value={meta.material}
          suggestions={MATERIALS}
          mono
          onChange={(v) => onChange({ material: (v ?? '').toUpperCase().replace(/[^A-Z0-9_]/g, '_') })}
        />
      </label>
    </div>
  );
}

interface DraftCardProps {
  draft: ImportDraft;
  meta: DraftMeta | undefined;
  idError: IdError | null;
  single: boolean;
  onMeta: (patch: Partial<DraftMeta>) => void;
  onDraft: (patch: Partial<ImportDraft>) => void;
  onRemove: () => void;
}

function DraftCard({ draft, meta, idError, single, onMeta, onDraft, onRemove }: DraftCardProps) {
  const t = useTranslations('dialogs.newItem');
  const tIssues = useTranslations('dialogs.issues');
  const errorMessage = useErrorMessage();
  const schemaText = useSchemaText();
  const templateFieldId = useId();
  if (!meta) return null;
  const pngs = draft.files.filter(isPng);
  const template = draft.template ? getTextureTemplate(draft.template) : null;
  const errorCount = draft.model?.issues.filter((i) => i.level === 'error').length ?? 0;
  const description = [
    t(`source.${draft.kind}`),
    draft.model ? t('textures', { count: draft.model.textures.length }) : null,
    draft.model?.json.elements ? t('cubes', { count: draft.model.json.elements.length }) : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <Card size="sm" className="rounded-lg">
      <CardHeader className="flex items-center gap-2.5">
        {draft.kind === 'png' ? <ImageIcon className="size-[18px] shrink-0" /> : <Box className="size-[18px] shrink-0" />}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <CardTitle className="truncate">{draft.model?.fileName ?? draft.files[0]?.name}</CardTitle>
          <CardDescription className="text-xs">{description}</CardDescription>
        </div>
        {errorCount > 0 && <Badge variant="destructive">{tIssues('errors', { count: errorCount })}</Badge>}
        {!single && (
          <IconButton label={t('dontImport')} tone="destructive" onClick={onRemove}>
            <Trash2 />
          </IconButton>
        )}
      </CardHeader>
      <CardContent>
        {draft.error ? (
          <WarningHint>{errorMessage(draft.error)}</WarningHint>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: single ? '320px 1fr' : '200px 1fr' }}>
            {draft.model && <ModelPreview model={draft.model} height={single ? 300 : 200} showToolbar={single} />}
            <div className="flex min-w-0 flex-col gap-3">
              <MetaFields meta={meta} idError={idError} onChange={onMeta} />
              {draft.kind === 'png' && template && (
                <div className="flex flex-col gap-2">
                  <Field>
                    <FieldLabel htmlFor={templateFieldId}>{t('modelKind')}</FieldLabel>
                    <NativeSelect
                      id={templateFieldId}
                      className="w-full"
                      value={template.id}
                      onChange={(e) => {
                        if (!isTextureTemplateId(e.target.value)) return;
                        const next = getTextureTemplate(e.target.value);
                        onDraft({ template: next.id, assignment: suggestSlotAssignment(next, pngs) });
                      }}
                    >
                      {TEXTURE_TEMPLATES.map((tpl) => (
                        <NativeSelectOption key={tpl.id} value={tpl.id}>
                          {schemaText(tpl.label)}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                    <FieldDescription>{schemaText(template.description)}</FieldDescription>
                  </Field>
                  {(!template.multiLayer || pngs.length > 1) && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {(template.multiLayer
                        ? Array.from({ length: Math.min(pngs.length, MAX_ITEM_LAYERS) }, (_, i) => `layer${i}`)
                        : template.slots
                      ).map((slot) => (
                        <label key={slot} className="flex flex-col gap-2">
                          <FieldTitle className="font-mono">{slot}</FieldTitle>
                          <NativeSelect
                            className="w-full"
                            value={draft.assignment?.[slot] ?? ''}
                            onChange={(e) => onDraft({ assignment: { ...draft.assignment, [slot]: e.target.value } })}
                          >
                            <NativeSelectOption value="">{t('noTexture')}</NativeSelectOption>
                            {pngs.map((p) => (
                              <NativeSelectOption key={p.name} value={p.name}>
                                {p.name}
                              </NativeSelectOption>
                            ))}
                          </NativeSelect>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {draft.model && <IssueList issues={draft.model.issues} />}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
