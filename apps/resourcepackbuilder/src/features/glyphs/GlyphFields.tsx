import { useTranslations } from 'next-intl';
import type { Glyph } from '@resourcepackbuilder/core/nexo/glyphs/model';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { updateGlyph } from '../../commands/media';
import { NumberInput, TextInput } from '../../components/editor';
import { CheckRow } from '../../components/CheckRow';
import { FormField, FormGrid } from '../../components/FormField';
import { NexoKey } from '../media/NexoKey';
import { ID_CHARS, typedId } from '../media/typedId';
import { isMultiBitmap } from './glyphTag';

/** Height of chat text in Minecraft pixels; the height a glyph falls back to. */
const CHAT_TEXT_HEIGHT = 8;
const DEFAULT_FONT = 'minecraft:default';

/** The Nexo options of a glyph; which ones apply depends on its kind. */
export function GlyphFields({ glyph, glyphs }: { glyph: Glyph; glyphs: Glyph[] }) {
  const t = useTranslations('media.glyphs');
  const tShared = useTranslations('media.shared');
  const update = (recipe: (draft: Glyph) => void, historyKey?: string) => updateGlyph(glyph.id, recipe, historyKey);
  const multiBitmaps = glyphs.filter((other) => other.id !== glyph.id && isMultiBitmap(other));

  return (
    <>
      <FormGrid>
        <FormField label={<NexoKey>ID</NexoKey>} help={t('idHelp')}>
          <Input
            className="font-mono"
            value={glyph.glyphId}
            onChange={(e) => update((g) => (g.glyphId = typedId(e.target.value, ID_CHARS)), 'id')}
          />
        </FormField>
        {glyph.kind === 'reference' ? (
          <>
            <FormField label={<NexoKey>Reference</NexoKey>} help={t('referenceHelp')}>
              <TextInput
                value={glyph.reference}
                mono
                suggestions={multiBitmaps.map((g) => ({ value: g.glyphId }))}
                onChange={(v) => update((g) => (g.reference = v ?? ''), 'reference')}
              />
            </FormField>
            <FormField label={<NexoKey>Index</NexoKey>} help={t('indexHelp')}>
              <NumberInput value={glyph.index} integer min={1} onChange={(v) => update((g) => (g.index = v ?? 1), 'index')} />
            </FormField>
          </>
        ) : (
          <>
            <FormField label={<NexoKey>Height</NexoKey>} help={t('heightHelp')}>
              <NumberInput
                value={glyph.height}
                integer
                min={1}
                onChange={(v) => update((g) => (g.height = v ?? CHAT_TEXT_HEIGHT), 'height')}
              />
            </FormField>
            <FormField label={<NexoKey>Ascent</NexoKey>} help={t('ascentHelp')}>
              <NumberInput value={glyph.ascent} integer onChange={(v) => update((g) => (g.ascent = v ?? 0), 'ascent')} />
            </FormField>
          </>
        )}
        {glyph.kind === 'image' && (
          <>
            <FormField label={<NexoKey>Rows</NexoKey>} help={t('rowsHelp')}>
              <NumberInput value={glyph.rows} integer min={1} onChange={(v) => update((g) => (g.rows = v ?? 1), 'rows')} />
            </FormField>
            <FormField label={<NexoKey>Columns</NexoKey>} help={t('columnsHelp')}>
              <NumberInput value={glyph.columns} integer min={1} onChange={(v) => update((g) => (g.columns = v ?? 1), 'columns')} />
            </FormField>
            <FormField label={<NexoKey>Font</NexoKey>} help={t('fontHelp')}>
              <TextInput
                value={glyph.font}
                mono
                placeholder={t('defaultFromSettings')}
                suggestions={[{ value: DEFAULT_FONT }]}
                onChange={(v) => update((g) => (g.font = v ?? ''), 'font')}
              />
            </FormField>
          </>
        )}
        {glyph.kind === 'gif' && (
          <>
            <FormField label={<NexoKey>Frame Count</NexoKey>} help={t('frameCountHelp')}>
              <NumberInput value={glyph.frameCount} integer min={1} onChange={(v) => update((g) => (g.frameCount = v ?? null), 'frames')} />
            </FormField>
            <FormField label={<NexoKey>Offset</NexoKey>} help={tShared('optional')}>
              <NumberInput value={glyph.offset} integer onChange={(v) => update((g) => (g.offset = v ?? null), 'offset')} />
            </FormField>
          </>
        )}
        <FormField label={<NexoKey>Permission</NexoKey>} help={t('permissionHelp')}>
          <Input
            className="font-mono"
            value={glyph.permission}
            placeholder={t('defaultFromSettings')}
            onChange={(e) => update((g) => (g.permission = e.target.value), 'permission')}
          />
        </FormField>
        <FormField label={<NexoKey>Placeholders</NexoKey>} help={t('placeholdersHelp')}>
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
          label={<NexoKey>Is Emoji</NexoKey>}
          hint={t('isEmojiHint')}
        />
        <CheckRow
          checked={glyph.tabcomplete}
          onChange={(checked) => update((g) => (g.tabcomplete = checked))}
          label={<NexoKey>Tab Complete</NexoKey>}
          hint={t('tabCompleteHint')}
        />
      </div>
    </>
  );
}
