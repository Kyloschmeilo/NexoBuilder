/**
 * The common options of a glyph: its id and size (or, for a reference glyph, the cell it shows), the grid of a
 * multi-bitmap, the frames of a GIF, and how it is used in chat. Which ones apply depends on the glyph's kind and the
 * target; each row shows the key the target writes.
 */
import { useTranslations } from 'next-intl';
import { CHAT_TEXT_HEIGHT, isMultiBitmap, type Glyph } from '@resourcepackbuilder/core/project';
import { normalizeTypedId } from '@resourcepackbuilder/minecraft';
import { FieldGroup } from '@resourcepackbuilder/ui';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { updateGlyph } from '../../commands/media';
import { NumberInput, TextInput } from '../../components/editor';
import { useOpenProject } from '../../store/project';
import { MediaField, SwitchField } from '../media/MediaFields';

const DEFAULT_FONT = 'minecraft:default';

type Update = (recipe: (draft: Glyph) => void, historyKey?: string) => void;

/** Changes the glyph; equal history keys in quick succession form one undo step. */
const glyphUpdate =
  (glyph: Glyph): Update =>
  (recipe, historyKey) =>
    updateGlyph(glyph.id, recipe, historyKey);

/** Id, size or referenced cell, grid and GIF frames. */
export function GlyphBasicsFields({ glyph, glyphs }: { glyph: Glyph; glyphs: Glyph[] }) {
  const t = useTranslations('media.glyphs');
  const tField = useTranslations('media.fields');
  const tShared = useTranslations('media.shared');
  const nexo = useOpenProject().target === 'nexo';
  const update = glyphUpdate(glyph);
  const multiBitmaps = glyphs.filter((other) => other.id !== glyph.id && isMultiBitmap(other));

  return (
    <FieldGroup>
      <MediaField label={tField('id')} help={t('idHelp')}>
        {(id) => (
          <Input
            id={id}
            className="font-mono"
            value={glyph.glyphId}
            onChange={(e) => update((g) => (g.glyphId = normalizeTypedId(e.target.value)), 'id')}
          />
        )}
      </MediaField>
      {glyph.kind === 'reference' ? (
        <>
          <MediaField label={tField('reference')} yamlKey={nexo ? 'reference' : 'ref'} help={t('referenceHelp')}>
            {(id) => (
              <TextInput
                id={id}
                value={glyph.reference}
                mono
                suggestions={multiBitmaps.map((g) => ({ value: g.glyphId }))}
                onChange={(v) => update((g) => (g.reference = v ?? ''), 'reference')}
              />
            )}
          </MediaField>
          <MediaField label={tField('index')} yamlKey={nexo ? 'index' : 'ref'} help={t('indexHelp')}>
            {(id) => (
              <NumberInput id={id} value={glyph.index} integer min={1} onChange={(v) => update((g) => (g.index = v ?? 1), 'index')} />
            )}
          </MediaField>
        </>
      ) : (
        <>
          <MediaField label={tField('height')} yamlKey="height" help={t('heightHelp')}>
            {(id) => (
              <NumberInput
                id={id}
                value={glyph.height}
                integer
                min={1}
                onChange={(v) => update((g) => (g.height = v ?? CHAT_TEXT_HEIGHT), 'height')}
              />
            )}
          </MediaField>
          <MediaField label={tField('ascent')} yamlKey="ascent" help={t('ascentHelp')}>
            {(id) => <NumberInput id={id} value={glyph.ascent} integer onChange={(v) => update((g) => (g.ascent = v ?? 0), 'ascent')} />}
          </MediaField>
        </>
      )}
      {glyph.kind === 'image' && (
        <>
          <MediaField label={tField('rows')} yamlKey={nexo ? 'rows' : 'grid_size'} help={t('rowsHelp')}>
            {(id) => <NumberInput id={id} value={glyph.rows} integer min={1} onChange={(v) => update((g) => (g.rows = v ?? 1), 'rows')} />}
          </MediaField>
          <MediaField label={tField('columns')} yamlKey={nexo ? 'columns' : 'grid_size'} help={t('columnsHelp')}>
            {(id) => (
              <NumberInput id={id} value={glyph.columns} integer min={1} onChange={(v) => update((g) => (g.columns = v ?? 1), 'columns')} />
            )}
          </MediaField>
          <MediaField label={tField('font')} yamlKey="font" help={t('fontHelp')}>
            {(id) => (
              <TextInput
                id={id}
                value={glyph.font}
                mono
                placeholder={t('defaultFromSettings')}
                suggestions={[{ value: DEFAULT_FONT }]}
                onChange={(v) => update((g) => (g.font = v ?? ''), 'font')}
              />
            )}
          </MediaField>
        </>
      )}
      {glyph.kind === 'gif' && (
        <>
          <MediaField label={tField('frameCount')} yamlKey="frame_count" help={t('frameCountHelp')}>
            {(id) => (
              <NumberInput
                id={id}
                value={glyph.frameCount}
                integer
                min={1}
                onChange={(v) => update((g) => (g.frameCount = v ?? null), 'frames')}
              />
            )}
          </MediaField>
          <MediaField label={tField('offset')} yamlKey="offset" help={tShared('optional')}>
            {(id) => <NumberInput id={id} value={glyph.offset} integer onChange={(v) => update((g) => (g.offset = v ?? null), 'offset')} />}
          </MediaField>
        </>
      )}
    </FieldGroup>
  );
}

/** Permission, chat shortcuts, Nexo's emoji list and tab completion. */
export function GlyphChatFields({ glyph }: { glyph: Glyph }) {
  const t = useTranslations('media.glyphs');
  const tField = useTranslations('media.fields');
  const update = glyphUpdate(glyph);
  // Nexo's emoji list (/nexo emojis); CraftEngine makes an emoji of every glyph with placeholders
  const nexo = useOpenProject().target === 'nexo';

  return (
    <FieldGroup>
      <MediaField label={tField('permission')} yamlKey="permission" help={t('permissionHelp')}>
        {(id) => (
          <Input
            id={id}
            className="font-mono"
            value={glyph.permission}
            placeholder={t('defaultFromSettings')}
            onChange={(e) => update((g) => (g.permission = e.target.value), 'permission')}
          />
        )}
      </MediaField>
      <MediaField label={tField('placeholders')} yamlKey={nexo ? 'placeholders' : 'keywords'} help={t('placeholdersHelp')}>
        {(id) => (
          <Input
            id={id}
            className="font-mono"
            value={glyph.placeholders.join(', ')}
            placeholder={t('placeholdersPlaceholder', { heart: '<3' })}
            onChange={(e) => update((g) => (g.placeholders = e.target.value.split(',').map((p) => p.trim())), 'placeholders')}
          />
        )}
      </MediaField>
      {nexo && (
        <SwitchField
          label={tField('isEmoji')}
          yamlKey="is_emoji"
          help={t('isEmojiHint')}
          checked={glyph.isEmoji}
          onChange={(checked) => update((g) => (g.isEmoji = checked))}
        />
      )}
      <SwitchField
        label={tField('tabComplete')}
        yamlKey={nexo ? 'tabcomplete' : 'chat_completion'}
        help={t('tabCompleteHint')}
        checked={glyph.tabcomplete}
        onChange={(checked) => update((g) => (g.tabcomplete = checked))}
      />
    </FieldGroup>
  );
}
