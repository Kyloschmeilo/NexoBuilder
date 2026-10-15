/** Custom paintings (plugins/Nexo/paintings.yml + texture in the resource pack). */
import { Frame, ImagePlus, RefreshCw, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ExportPlan } from '@resourcepackbuilder/core/export/plan';
import { paintingFrameSize, paintingKey, type Painting, type PaintingFile } from '@resourcepackbuilder/core/nexo/paintings';
import { readPngInfoFromDataUrl } from '@resourcepackbuilder/core/util';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Card, CardContent } from '@resourcepackbuilder/ui/components/card';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { CopyButton, DropZone, IssueList, NumberInput, pickFiles, readAsDataUrl } from '@resourcepackbuilder/ui';
import { translator } from '../../i18n/locale';
import { addPainting, addPaintingItem, deletePainting, updatePainting } from '../../state/actions';
import { useStore } from '../../state/store';
import { CheckRow, Code, FieldGrid, FormField, Hint, IconAction, ViewHeader, ViewShell } from './layout';

const ACCEPT = '.png,image/png';

async function readPaintingFiles(files: File[]): Promise<Array<{ name: string; file: PaintingFile }>> {
  const result: Array<{ name: string; file: PaintingFile }> = [];
  for (const f of files) {
    const dataUrl = (await readAsDataUrl(f)).replace(/^data:[^;,]*/, 'data:image/png');
    const info = readPngInfoFromDataUrl(dataUrl);
    if (!info) {
      useStore.getState().toast('error', translator('media')('paintings.notPng', { name: f.name }));
      continue;
    }
    result.push({ name: f.name.replace(/\.[^.]+$/, ''), file: { name: f.name, dataUrl, width: info.width, height: info.height } });
  }
  return result;
}

export function PaintingsView({ plan }: { plan: ExportPlan | null }) {
  const t = useTranslations('media.paintings');
  const paintings = useStore((s) => s.project?.paintings ?? []);
  return (
    <ViewShell>
      <ViewHeader
        icon={<Frame className="size-7" />}
        title={t('title')}
        meta={
          <>
            <Badge variant="secondary">{t('count', { count: paintings.length })}</Badge>
            <Badge variant="outline" className="font-mono">
              plugins/Nexo/paintings.yml
            </Badge>
          </>
        }
      />
      <Hint>
        <div>{t.rich('hint', { code: (chunks) => <Code>{chunks}</Code> })}</div>
      </Hint>
      <DropZone
        onFiles={async (files) => {
          for (const entry of await readPaintingFiles(files)) addPainting(entry.name, entry.file);
        }}
        accept={ACCEPT}
        title={t('dropTitle')}
        subtitle={t('dropSubtitle')}
        formats={['.png']}
        compact
      />
      {paintings.length > 0 && (
        <div className="mt-2 flex flex-col gap-4">
          {paintings.map((painting) => (
            <PaintingCard key={painting.id} painting={painting} plan={plan} />
          ))}
        </div>
      )}
    </ViewShell>
  );
}

function PaintingCard({ painting, plan }: { painting: Painting; plan: ExportPlan | null }) {
  const t = useTranslations('media.paintings');
  const tShared = useTranslations('media.shared');
  const project = useStore((s) => s.project)!;
  const update = (fn: (p: Painting) => void, key?: string) => updatePainting(painting.id, fn, key);
  const issues = plan?.issues.filter((i) => i.paintingId === painting.id) ?? [];
  const key = paintingKey(project, painting);
  const frame = paintingFrameSize(painting);
  const aspect = painting.width / painting.height;
  return (
    <Card size="sm" className="gap-0 py-0">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h3 className="truncate font-mono text-sm font-medium">{painting.paintingId}</h3>
          <Badge variant="secondary">{t('sizeBlocks', { width: painting.width, height: painting.height })}</Badge>
          {painting.animated && <Badge>{t('animated')}</Badge>}
        </div>
        <span className="truncate font-mono text-xs text-muted-foreground">{key}</span>
        <CopyButton text={key} label={tShared('copyId')} />
        <IconAction
          label={tShared('replaceImage')}
          onClick={async () => {
            const [entry] = await readPaintingFiles(await pickFiles(ACCEPT, false));
            if (entry) update((p) => (p.file = entry.file));
          }}
        >
          <RefreshCw />
        </IconAction>
        <IconAction label={t('delete')} destructive onClick={() => deletePainting(painting.id)}>
          <Trash2 />
        </IconAction>
      </div>
      <CardContent className="py-4">
        <div className="grid grid-cols-[190px_minmax(0,1fr)] gap-4">
          <div className="flex flex-col gap-2">
            <div className="grid h-40 w-[190px] place-items-center rounded-md border border-border bg-background">
              {painting.file && (
                <div
                  className="max-h-[150px] max-w-[170px] border-2 border-input bg-no-repeat [background-position:top_left] [image-rendering:pixelated]"
                  style={{
                    aspectRatio: String(aspect),
                    width: aspect >= 1 ? 170 : undefined,
                    height: aspect < 1 ? 150 : undefined,
                    backgroundImage: `url(${painting.file.dataUrl})`,
                    backgroundSize: painting.animated && frame && frame.frames > 1 ? `100% ${frame.frames * 100}%` : '100% 100%',
                  }}
                />
              )}
            </div>
            {painting.file && (
              <span className="text-xs text-muted-foreground">
                {t('pixelSize', { width: painting.file.width, height: painting.file.height })}
                {frame && painting.animated ? ` · ${t('frames', { count: frame.frames })}` : ''}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-3">
            <FieldGrid>
              <FormField label="ID">
                <Input
                  className="font-mono"
                  value={painting.paintingId}
                  onChange={(e) => update((p) => (p.paintingId = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_')), 'id')}
                />
              </FormField>
              <FormField label="Title" help={t('titleHelp')}>
                <Input value={painting.title} onChange={(e) => update((p) => (p.title = e.target.value), 'title')} />
              </FormField>
              <FormField label="Author" help={t('authorHelp')}>
                <Input value={painting.author} onChange={(e) => update((p) => (p.author = e.target.value), 'author')} />
              </FormField>
              <FormField label="Width" help={t('widthHelp')}>
                <NumberInput value={painting.width} integer min={1} max={16} onChange={(v) => update((p) => (p.width = v ?? 1), 'width')} />
              </FormField>
              <FormField label="Height" help={t('heightHelp')}>
                <NumberInput value={painting.height} integer min={1} max={16} onChange={(v) => update((p) => (p.height = v ?? 1), 'height')} />
              </FormField>
              {painting.animated && (
                <FormField label="Frametime" help={t('frametimeHelp')}>
                  <NumberInput value={painting.frametime} integer min={1} onChange={(v) => update((p) => (p.frametime = v ?? 2), 'frametime')} />
                </FormField>
              )}
            </FieldGrid>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <CheckRow
                checked={painting.randomPlace}
                onChange={(checked) => update((p) => (p.randomPlace = checked))}
                label="Random Place"
                hint={t('randomPlaceHint')}
              />
              <CheckRow checked={painting.animated} onChange={(checked) => update((p) => (p.animated = checked))} label="Animated" hint={t('animatedHint')} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (addPaintingItem(painting)) useStore.getState().toast('success', t('itemCreated'));
                }}
              >
                <ImagePlus /> {t('createItem')}
              </Button>
              <span className="text-xs text-muted-foreground">{t('createItemHint')}</span>
            </div>
            <IssueList issues={issues} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
