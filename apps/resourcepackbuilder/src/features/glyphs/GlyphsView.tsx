import { Link2, RefreshCw, Smile, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ExportPlan } from '@resourcepackbuilder/core/export/types';
import { issuesFor } from '@resourcepackbuilder/core/issues';
import { glyphFilePath } from '@resourcepackbuilder/core/nexo/glyphs/files';
import { glyphFileFromDataUrl, type Glyph, type GlyphFile } from '@resourcepackbuilder/core/nexo/glyphs/model';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Card, CardContent } from '@resourcepackbuilder/ui/components/card';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@resourcepackbuilder/ui/components/tooltip';
import { CopyButton, DropZone, IconButton, PageHeader, PageShell, fileStem, pickFiles, readFileAs } from '@resourcepackbuilder/ui';
import { addGlyph, deleteGlyph, updateGlyph } from '../../commands/media';
import { NumberInput, TextInput } from '../../components/editor';
import { CheckRow } from '../../components/CheckRow';
import { FormField, FormGrid } from '../../components/FormField';
import { Hint, InlineCode } from '../../components/Hint';
import { IssueList } from '../../components/IssueList';
import { toast } from '../../store/notifications';
import { usePlan } from '../../store/PlanProvider';
import { useOpenProject } from '../../store/project';

const ACCEPT = '.png,.gif,image/png,image/gif';

/** Reads PNG/GIF files as glyph images; files that are no image are passed to `onInvalid`. */
async function readGlyphFiles(files: File[], onInvalid: (name: string) => void) {
  const result: Array<{ name: string; file: GlyphFile; gif: boolean }> = [];
  for (const f of files) {
    const gif = f.name.toLowerCase().endsWith('.gif');
    const file = glyphFileFromDataUrl(f.name, await readFileAs(f, gif ? 'image/gif' : 'image/png'));
    if (file) result.push({ name: fileStem(f.name), file, gif: file.dataUrl.startsWith('data:image/gif') });
    else onInvalid(f.name);
  }
  return result;
}

function useReadGlyphFiles() {
  const t = useTranslations('media.glyphs');
  return (files: File[]) => readGlyphFiles(files, (name) => toast('error', t('notImage', { name })));
}

export function GlyphsView() {
  const t = useTranslations('media.glyphs');
  const project = useOpenProject();
  const plan = usePlan();
  const readFiles = useReadGlyphFiles();
  const glyphs = project.glyphs;

  return (
    <PageShell>
      <PageHeader
        icon={<Smile className="size-7" />}
        title={t('title')}
        meta={
          <>
            <Badge variant="secondary">{t('count', { count: glyphs.length })}</Badge>
            <Badge variant="outline" className="font-mono">
              plugins/Nexo/{glyphFilePath(project)}
            </Badge>
          </>
        }
        actions={
          <Tooltip>
            <TooltipTrigger render={<Button variant="outline" onClick={() => addGlyph(t('defaultReferenceId'), null, 'reference')} />}>
              <Link2 /> {t('referenceGlyph')}
            </TooltipTrigger>
            <TooltipContent>{t('referenceGlyphHelp')}</TooltipContent>
          </Tooltip>
        }
      />
      <Hint>
        <div>{t.rich('hint', { tag: '<glyph:id>', code: (chunks) => <InlineCode>{chunks}</InlineCode> })}</div>
      </Hint>
      <DropZone
        onFiles={async (files) => {
          for (const entry of await readFiles(files)) addGlyph(entry.name, entry.file, entry.gif ? 'gif' : 'image');
        }}
        accept={ACCEPT}
        title={t('dropTitle')}
        subtitle={t('dropSubtitle')}
        formats={['.png', '.gif']}
        compact
      />
      {glyphs.length > 0 && (
        <div className="mt-2 flex flex-col gap-4">
          {glyphs.map((glyph) => (
            <GlyphCard key={glyph.id} glyph={glyph} glyphs={glyphs} plan={plan} />
          ))}
        </div>
      )}
    </PageShell>
  );
}

function GlyphCard({ glyph, glyphs, plan }: { glyph: Glyph; glyphs: Glyph[]; plan: ExportPlan | null }) {
  const t = useTranslations('media.glyphs');
  const tShared = useTranslations('media.shared');
  const readFiles = useReadGlyphFiles();
  const update = (fn: (g: Glyph) => void, key?: string) => updateGlyph(glyph.id, fn, key);
  const issues = plan ? issuesFor(plan.issues, { kind: 'glyph', id: glyph.id }) : [];
  const multi = glyph.kind === 'image' && glyph.rows * glyph.columns > 1;
  const usage = multi ? `<glyph:${glyph.glyphId}:1>` : `<glyph:${glyph.glyphId}>`;
  const multiBitmaps = glyphs.filter((g) => g.kind === 'image' && g.rows * g.columns > 1 && g.id !== glyph.id);

  return (
    <Card size="sm" className="gap-0 py-0">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h3 className="truncate font-mono text-sm font-medium">{glyph.glyphId}</h3>
          <Badge variant="secondary">{t(`kinds.${glyph.kind}`)}</Badge>
          {glyph.file && <Badge variant="secondary">{t('pixelSize', { width: glyph.file.width, height: glyph.file.height })}</Badge>}
        </div>
        <span className="truncate font-mono text-xs text-muted-foreground">{usage}</span>
        <CopyButton text={usage} label={t('copyTag')} />
        {glyph.kind !== 'reference' && (
          <IconButton
            label={tShared('replaceImage')}
            onClick={async () => {
              const [entry] = await readFiles(await pickFiles(ACCEPT, false));
              if (entry) {
                update((g) => {
                  g.file = entry.file;
                  g.kind = entry.gif ? 'gif' : 'image';
                });
              }
            }}
          >
            <RefreshCw />
          </IconButton>
        )}
        <IconButton label={t('delete')} tone="destructive" onClick={() => deleteGlyph(glyph.id)}>
          <Trash2 />
        </IconButton>
      </div>
      <CardContent className="py-4">
        <div className={glyph.kind === 'reference' ? 'grid grid-cols-1 gap-4' : 'grid grid-cols-[170px_minmax(0,1fr)] gap-4'}>
          {glyph.kind !== 'reference' && (
            <div className="flex flex-col gap-2">
              <div className="grid h-[130px] w-[170px] place-items-center rounded-md border border-border bg-background">
                {glyph.file && (
                  <img
                    src={glyph.file.dataUrl}
                    alt=""
                    className="max-h-[110px] max-w-[150px] [image-rendering:pixelated]"
                    style={{
                      width: glyph.file.width >= glyph.file.height ? 150 : undefined,
                      height: glyph.file.height > glyph.file.width ? 110 : undefined,
                    }}
                  />
                )}
              </div>
              {glyph.file && <ChatPreview glyph={glyph} />}
            </div>
          )}
          <div className="flex flex-col gap-3">
            <FormGrid>
              <FormField label="ID">
                <Input
                  className="font-mono"
                  value={glyph.glyphId}
                  onChange={(e) => update((g) => (g.glyphId = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_')), 'id')}
                />
              </FormField>
              {glyph.kind === 'reference' ? (
                <>
                  <FormField label="Reference" help={t('referenceHelp')}>
                    <TextInput
                      value={glyph.reference}
                      mono
                      suggestions={multiBitmaps.map((g) => ({ value: g.glyphId }))}
                      onChange={(v) => update((g) => (g.reference = v ?? ''), 'reference')}
                    />
                  </FormField>
                  <FormField label="Index" help={t('indexHelp')}>
                    <NumberInput value={glyph.index} integer min={1} onChange={(v) => update((g) => (g.index = v ?? 1), 'index')} />
                  </FormField>
                </>
              ) : (
                <>
                  <FormField label="Height" help={t('heightHelp')}>
                    <NumberInput value={glyph.height} integer min={1} onChange={(v) => update((g) => (g.height = v ?? 8), 'height')} />
                  </FormField>
                  <FormField label="Ascent" help={t('ascentHelp')}>
                    <NumberInput value={glyph.ascent} integer onChange={(v) => update((g) => (g.ascent = v ?? 0), 'ascent')} />
                  </FormField>
                </>
              )}
              {glyph.kind === 'image' && (
                <>
                  <FormField label="Rows" help={t('rowsHelp')}>
                    <NumberInput value={glyph.rows} integer min={1} onChange={(v) => update((g) => (g.rows = v ?? 1), 'rows')} />
                  </FormField>
                  <FormField label="Columns" help={t('columnsHelp')}>
                    <NumberInput value={glyph.columns} integer min={1} onChange={(v) => update((g) => (g.columns = v ?? 1), 'columns')} />
                  </FormField>
                  <FormField label="Font" help={t('fontHelp')}>
                    <TextInput
                      value={glyph.font}
                      mono
                      placeholder={t('defaultFromSettings')}
                      suggestions={[{ value: 'minecraft:default' }]}
                      onChange={(v) => update((g) => (g.font = v ?? ''), 'font')}
                    />
                  </FormField>
                </>
              )}
              {glyph.kind === 'gif' && (
                <>
                  <FormField label="Frame Count" help={t('frameCountHelp')}>
                    <NumberInput
                      value={glyph.frameCount}
                      integer
                      min={1}
                      onChange={(v) => update((g) => (g.frameCount = v ?? null), 'frames')}
                    />
                  </FormField>
                  <FormField label="Offset" help={tShared('optional')}>
                    <NumberInput value={glyph.offset} integer onChange={(v) => update((g) => (g.offset = v ?? null), 'offset')} />
                  </FormField>
                </>
              )}
              <FormField label="Permission" help={tShared('optional')}>
                <Input
                  className="font-mono"
                  value={glyph.permission}
                  placeholder={t('defaultFromSettings')}
                  onChange={(e) => update((g) => (g.permission = e.target.value), 'permission')}
                />
              </FormField>
              <FormField label="Placeholders" help={t('placeholdersHelp')}>
                <Input
                  className="font-mono"
                  value={glyph.placeholders.join(', ')}
                  placeholder={t('placeholdersPlaceholder', { heart: '<3' })}
                  onChange={(e) => update((g) => (g.placeholders = e.target.value.split(',').map((p) => p.trim())), 'placeholders')}
                />
              </FormField>
            </FormGrid>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <CheckRow
                checked={glyph.isEmoji}
                onChange={(checked) => update((g) => (g.isEmoji = checked))}
                label="Is Emoji"
                hint={t('isEmojiHint')}
              />
              <CheckRow
                checked={glyph.tabcomplete}
                onChange={(checked) => update((g) => (g.tabcomplete = checked))}
                label="Tab Complete"
                hint={t('tabCompleteHint')}
              />
            </div>
            {glyph.kind !== 'reference' && <p className="text-xs leading-relaxed text-muted-foreground">{t('sizeHelp')}</p>}
            {issues.length > 0 && <IssueList issues={issues} />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Approximate preview in chat (2 screen pixels per Minecraft pixel). */
function ChatPreview({ glyph }: { glyph: Glyph }) {
  const t = useTranslations('media.glyphs');
  if (!glyph.file) return null;
  const scale = 2;
  const cellH = glyph.file.height / Math.max(1, glyph.rows);
  const cellW = glyph.file.width / Math.max(1, glyph.columns);
  const h = glyph.height * scale;
  const w = (cellW / cellH) * h;
  // Default font: ascent 7 – deviations shift the glyph up/down
  const offset = (7 - glyph.ascent) * scale;
  if (h > 120) return <span className="text-xs text-muted-foreground">{t('largeNoPreview')}</span>;
  return (
    <div className="flex max-w-full min-w-0 items-start gap-1 rounded-sm border-2 border-input bg-background px-2.5 py-1.5 text-base leading-[18px] text-foreground">
      <span>{t('previewBefore')}</span>
      <span
        className="inline-block [background-position:0_0] [image-rendering:pixelated]"
        style={{
          width: w,
          height: h,
          marginTop: offset,
          backgroundImage: `url(${glyph.file.dataUrl})`,
          backgroundSize: `${glyph.columns * 100}% ${glyph.rows * 100}%`,
        }}
      />
      <span>{t('previewAfter')}</span>
    </div>
  );
}
