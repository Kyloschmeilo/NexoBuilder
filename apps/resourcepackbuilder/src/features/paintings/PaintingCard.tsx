import { ImagePlus, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ExportPlan } from '@resourcepackbuilder/export';
import { issuesFor } from '@resourcepackbuilder/utils';
import { DEFAULT_ANIMATION_FRAMETIME, normalizeTypedId } from '@resourcepackbuilder/minecraft';
import { MAX_PAINTING_BLOCKS, paintingFrameSize, type Painting } from '@resourcepackbuilder/core/project/media/painting';
import { mediaKey } from '@resourcepackbuilder/core/project/media/entry';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { AutoGrid, IconButton, pickFiles } from '@resourcepackbuilder/ui';
import { updatePainting } from '../../commands/media';
import { NumberInput } from '../../components/editor';
import { CheckboxField } from '../../components/CheckboxField';
import { FormField } from '../../components/FormField';
import { IssueList } from '../../components/IssueList';
import { useMediaFileReader } from '../../hooks/useFileReaders';
import { MEDIA_FILES } from '../../lib/mediaFiles';
import { useOpenProject } from '../../store/project';
import { MediaCard, PreviewFrame } from '../media/MediaCard';
import { useMediaActions } from '../media/useMediaActions';
import { NexoKey } from '../media/NexoKey';
import { PaintingPreview } from './PaintingPreview';

export function PaintingCard({ painting, plan }: { painting: Painting; plan: ExportPlan | null }) {
  const t = useTranslations('media.paintings');
  const media = useMediaActions();
  const tShared = useTranslations('media.shared');
  const project = useOpenProject();
  const readFiles = useMediaFileReader('painting');
  const update = (recipe: (draft: Painting) => void, historyKey?: string) => updatePainting(painting.id, recipe, historyKey);
  const issues = plan ? issuesFor(plan.issues, { kind: 'painting', id: painting.id }) : [];
  const { file } = painting;
  const frames = painting.animated ? (paintingFrameSize(painting)?.frames ?? 1) : 1;

  const replaceImage = async () => {
    const [entry] = await readFiles(await pickFiles(MEDIA_FILES.painting.accept, false));
    if (entry) update((p) => (p.file = entry.file));
  };

  return (
    <MediaCard
      title={painting.paintingId}
      badges={
        <>
          <Badge variant="secondary">{t('sizeBlocks', { width: painting.width, height: painting.height })}</Badge>
          {painting.animated && <Badge>{t('animated')}</Badge>}
        </>
      }
      usage={mediaKey(project, painting.paintingId)}
      copyLabel={tShared('copyId')}
      actions={
        <IconButton label={tShared('replaceImage')} onClick={() => void replaceImage()}>
          <RefreshCw />
        </IconButton>
      }
      deleteLabel={t('delete')}
      onDelete={() => void media.remove('painting', painting)}
      preview={
        <>
          <PreviewFrame>{file && <PaintingPreview painting={painting} file={file} frames={Math.max(1, frames)} />}</PreviewFrame>
          {file && (
            <span className="text-xs text-muted-foreground">
              {t('pixelSize', { width: file.width, height: file.height })}
              {painting.animated && ` · ${t('frames', { count: frames })}`}
            </span>
          )}
        </>
      }
    >
      <AutoGrid>
        <FormField label={<NexoKey>ID</NexoKey>} help={t('idHelp')}>
          <Input
            className="font-mono"
            value={painting.paintingId}
            onChange={(e) => update((p) => (p.paintingId = normalizeTypedId(e.target.value)), 'id')}
          />
        </FormField>
        <FormField label={<NexoKey>Title</NexoKey>} help={t('titleHelp')}>
          <Input value={painting.title} onChange={(e) => update((p) => (p.title = e.target.value), 'title')} />
        </FormField>
        <FormField label={<NexoKey>Author</NexoKey>} help={t('authorHelp')}>
          <Input value={painting.author} onChange={(e) => update((p) => (p.author = e.target.value), 'author')} />
        </FormField>
        <FormField label={<NexoKey>Width</NexoKey>} help={t('widthHelp')}>
          <NumberInput
            value={painting.width}
            integer
            min={1}
            max={MAX_PAINTING_BLOCKS}
            onChange={(v) => update((p) => (p.width = v ?? 1), 'width')}
          />
        </FormField>
        <FormField label={<NexoKey>Height</NexoKey>} help={t('heightHelp')}>
          <NumberInput
            value={painting.height}
            integer
            min={1}
            max={MAX_PAINTING_BLOCKS}
            onChange={(v) => update((p) => (p.height = v ?? 1), 'height')}
          />
        </FormField>
        {painting.animated && (
          <FormField label={<NexoKey>Frametime</NexoKey>} help={t('frametimeHelp')}>
            <NumberInput
              value={painting.frametime}
              integer
              min={1}
              onChange={(v) => update((p) => (p.frametime = v ?? DEFAULT_ANIMATION_FRAMETIME), 'frametime')}
            />
          </FormField>
        )}
      </AutoGrid>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        <CheckboxField
          checked={painting.randomPlace}
          onChange={(checked) => update((p) => (p.randomPlace = checked))}
          label={<NexoKey>Random Place</NexoKey>}
          description={t('randomPlaceHint')}
        />
        <CheckboxField
          checked={painting.animated}
          onChange={(checked) => update((p) => (p.animated = checked))}
          label={<NexoKey>Animated</NexoKey>}
          description={t('animatedHint')}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => media.createPaintingItem(painting)}>
          <ImagePlus /> {t('createItem')}
        </Button>
        <span className="text-xs text-muted-foreground">{t('createItemHint')}</span>
      </div>
      <IssueList issues={issues} />
    </MediaCard>
  );
}
