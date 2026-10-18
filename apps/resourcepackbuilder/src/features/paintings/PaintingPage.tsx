/**
 * The page of one painting: its preview, the basic options (id, title, author, size in blocks, frame time of an
 * animation), where it appears (random placement, animated texture) and the item that hangs it.
 */
import { Frame, ImagePlus, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ExportPlan } from '@resourcepackbuilder/export';
import { issuesFor } from '@resourcepackbuilder/utils';
import { DEFAULT_ANIMATION_FRAMETIME, normalizeTypedId } from '@resourcepackbuilder/minecraft';
import { MAX_PAINTING_BLOCKS, mediaKey, type Painting, paintingFrameSize } from '@resourcepackbuilder/core/project';
import { FieldGroup, IconButton, pickFiles, Section, StatusPill } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { updatePainting } from '../../commands/media';
import { NumberInput } from '../../components/editor';
import { useMediaFileReader } from '../../hooks/useFileReaders';
import { MEDIA_FILES } from '../../lib/mediaFiles';
import { useOpenProject } from '../../store/project';
import { MediaEntryFrame, PreviewFrame } from '../media/MediaEntryFrame';
import { MediaField, SwitchField } from '../media/MediaFields';
import { useMediaActions } from '../media/useMediaActions';
import { PaintingPreview } from './PaintingPreview';

export function PaintingPage({ painting, plan }: { painting: Painting; plan: ExportPlan | null }) {
  const t = useTranslations('media.paintings');
  const tShared = useTranslations('media.shared');
  const tField = useTranslations('media.fields');
  const tSection = useTranslations('media.sections');
  const media = useMediaActions();
  const project = useOpenProject();
  const nexo = project.target === 'nexo';
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
    <MediaEntryFrame
      kind="painting"
      entry={painting}
      title={painting.paintingId}
      thumb={file ? <img src={file.dataUrl} alt="" /> : <Frame />}
      meta={
        <>
          <StatusPill tone="info" label={t('sizeBlocks', { width: painting.width, height: painting.height })} />
          {painting.animated && <StatusPill tone="info" label={t('animated')} />}
        </>
      }
      usage={mediaKey(project, painting.paintingId)}
      copyLabel={tShared('copyId')}
      actions={
        <IconButton label={tShared('replaceImage')} onClick={() => void replaceImage()}>
          <RefreshCw />
        </IconButton>
      }
      issues={issues}
    >
      <Section id="preview" title={tSection('preview')}>
        <div className="flex flex-col items-start gap-2">
          <PreviewFrame>{file && <PaintingPreview painting={painting} file={file} frames={Math.max(1, frames)} />}</PreviewFrame>
          {file && (
            <span className="text-meta text-text-muted">
              {t('pixelSize', { width: file.width, height: file.height })}
              {painting.animated && ` · ${t('frames', { count: frames })}`}
            </span>
          )}
        </div>
      </Section>
      <Section id="basics" title={tSection('basics')}>
        <FieldGroup>
          <MediaField label={tField('id')} yamlKey={nexo ? 'asset_id' : undefined} help={t('idHelp')}>
            {(id) => (
              <Input
                id={id}
                className="font-mono"
                value={painting.paintingId}
                onChange={(e) => update((p) => (p.paintingId = normalizeTypedId(e.target.value)), 'id')}
              />
            )}
          </MediaField>
          <MediaField label={tField('title')} yamlKey="title" help={t('titleHelp')}>
            {(id) => <Input id={id} value={painting.title} onChange={(e) => update((p) => (p.title = e.target.value), 'title')} />}
          </MediaField>
          <MediaField label={tField('author')} yamlKey="author" help={t('authorHelp')}>
            {(id) => <Input id={id} value={painting.author} onChange={(e) => update((p) => (p.author = e.target.value), 'author')} />}
          </MediaField>
          <MediaField label={tField('width')} yamlKey="width" help={t('widthHelp')}>
            {(id) => (
              <NumberInput
                id={id}
                value={painting.width}
                integer
                min={1}
                max={MAX_PAINTING_BLOCKS}
                onChange={(v) => update((p) => (p.width = v ?? 1), 'width')}
              />
            )}
          </MediaField>
          <MediaField label={tField('paintingHeight')} yamlKey="height" help={t('heightHelp')}>
            {(id) => (
              <NumberInput
                id={id}
                value={painting.height}
                integer
                min={1}
                max={MAX_PAINTING_BLOCKS}
                onChange={(v) => update((p) => (p.height = v ?? 1), 'height')}
              />
            )}
          </MediaField>
        </FieldGroup>
      </Section>
      <Section id="placement" title={tSection('placement')}>
        <FieldGroup>
          <SwitchField
            label={tField('randomPlace')}
            yamlKey={nexo ? 'random_place' : 'show_in_op_tab'}
            help={t('randomPlaceHint')}
            checked={painting.randomPlace}
            onChange={(checked) => update((p) => (p.randomPlace = checked))}
          />
          <SwitchField
            label={tField('animated')}
            help={t('animatedHint')}
            checked={painting.animated}
            onChange={(checked) => update((p) => (p.animated = checked))}
          />
          {painting.animated && (
            <MediaField label={tField('frametime')} yamlKey="frametime" help={t('frametimeHelp')}>
              {(id) => (
                <NumberInput
                  id={id}
                  value={painting.frametime}
                  integer
                  min={1}
                  onChange={(v) => update((p) => (p.frametime = v ?? DEFAULT_ANIMATION_FRAMETIME), 'frametime')}
                />
              )}
            </MediaField>
          )}
        </FieldGroup>
      </Section>
      <Section id="item" title={tSection('item')} description={t('createItemHint')}>
        <Button variant="outline" size="sm" onClick={() => media.createPaintingItem(painting)}>
          <ImagePlus /> {t('createItem')}
        </Button>
      </Section>
    </MediaEntryFrame>
  );
}
