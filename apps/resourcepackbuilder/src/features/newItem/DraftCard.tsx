/** One model to import: preview, the values for its item, texture choices for PNGs, and its checks. */
import { useTranslations } from 'next-intl';
import { Box, Image as ImageIcon, Trash2, TriangleAlert } from 'lucide-react';
import { getTextureTemplate, type ImportDraft, isPngDataUrl } from '@resourcepackbuilder/minecraft';
import type { ItemMeta, MetaPatch } from '@resourcepackbuilder/core/project/newItems';
import type { ItemIdError } from '@resourcepackbuilder/core/project/ids';
import { AutoGrid, IconButton, SectionCard } from '@resourcepackbuilder/ui';
import { Alert, AlertDescription } from '@resourcepackbuilder/ui/components/alert';
import { ModelPreview } from '@resourcepackbuilder/preview';
import { IssueCountBadges } from '../../components/IssueCountBadges';
import { IssueList } from '../../components/IssueList';
import { useErrorMessage } from '../../i18n/errors';
import { ItemIdentityFields } from '../../components/ItemIdentityFields';
import { TextureSlots } from './TextureSlots';

/** Preview height with a single draft (room for the toolbar) and with several. */
const PREVIEW_HEIGHT_SINGLE_PX = 300;
const PREVIEW_HEIGHT_PX = 200;

interface DraftCardProps {
  draft: ImportDraft;
  meta: ItemMeta;
  idError: ItemIdError | null;
  /** The only draft: larger preview, cannot be removed */
  isSingle: boolean;
  onMetaChange: (patch: MetaPatch) => void;
  onDraftChange: (draft: ImportDraft) => void;
  onRemove: () => void;
}

/** "Bbmodel · 3 textures · 12 cubes" */
function useDraftDescription(draft: ImportDraft): string {
  const t = useTranslations('dialogs.newItem');
  return [
    t(`source.${draft.kind}`),
    draft.model ? t('textures', { count: draft.model.textures.length }) : null,
    draft.model?.json.elements ? t('cubes', { count: draft.model.json.elements.length }) : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

export function DraftCard({ draft, meta, idError, isSingle, onMetaChange, onDraftChange, onRemove }: DraftCardProps) {
  const t = useTranslations('dialogs.newItem');
  const errorMessage = useErrorMessage();
  const description = useDraftDescription(draft);
  const pngs = draft.files.filter((file) => isPngDataUrl(file.dataUrl));
  const template = draft.template ? getTextureTemplate(draft.template) : null;
  const Icon = draft.kind === 'png' ? ImageIcon : Box;
  return (
    <SectionCard
      size="sm"
      icon={<Icon className="size-4.5 shrink-0" />}
      title={draft.model?.fileName ?? draft.files[0]?.name}
      titleClassName="truncate font-sans tracking-normal normal-case"
      description={description}
      actions={
        <>
          {draft.model && <IssueCountBadges issues={draft.model.issues} />}
          {!isSingle && (
            <IconButton label={t('dontImport')} variant="ghost-destructive" onClick={onRemove}>
              <Trash2 />
            </IconButton>
          )}
        </>
      }
    >
      {draft.error ? (
        <Alert variant="warning">
          <TriangleAlert />
          <AlertDescription>{errorMessage(draft.error)}</AlertDescription>
        </Alert>
      ) : (
        <div className={isSingle ? 'grid gap-4 @3xl/dialog:grid-cols-[20rem_1fr]' : 'grid gap-4 @3xl/dialog:grid-cols-[12.5rem_1fr]'}>
          {draft.model && (
            <ModelPreview model={draft.model} height={isSingle ? PREVIEW_HEIGHT_SINGLE_PX : PREVIEW_HEIGHT_PX} showToolbar={isSingle} />
          )}
          <div className="flex min-w-0 flex-col gap-3">
            <AutoGrid fit>
              <ItemIdentityFields
                value={meta}
                idError={idError}
                onChange={onMetaChange}
                autoFocus
                displayNameTestId="new-item-display-name"
              />
            </AutoGrid>
            {draft.kind === 'png' && template && <TextureSlots draft={draft} template={template} pngs={pngs} onChange={onDraftChange} />}
            {draft.model && <IssueList issues={draft.model.issues} />}
          </div>
        </div>
      )}
    </SectionCard>
  );
}
