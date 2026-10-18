/**
 * The less common options of a glyph: its fixed character (both plugins), Nexo's shadow, template and GIF animation
 * type, and the content CraftEngine shows for its emoji.
 */
import { useTranslations } from 'next-intl';
import { EMOJI_CONTEXTS, GLYPH_GIF_TYPES, type Glyph, type GlyphGifType, isMultiBitmap } from '@resourcepackbuilder/core/project';
import { emojiDocsFor } from '@resourcepackbuilder/core/targets';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { AutoGrid } from '@resourcepackbuilder/ui';
import { updateGlyph } from '../../commands/media';
import { TextInput } from '../../components/editor';
import { CheckboxField } from '../../components/CheckboxField';
import { FormField } from '../../components/FormField';
import { DocsLinkButton } from '../media/DocsLinkButton';
import { NexoKey } from '../media/NexoKey';
import { useOpenProject } from '../../store/project';

export function GlyphExtraFields({ glyph, glyphs }: { glyph: Glyph; glyphs: Glyph[] }) {
  const t = useTranslations('media.glyphs');
  const { target } = useOpenProject();
  const nexo = target === 'nexo';
  const update = (recipe: (draft: Glyph) => void, historyKey?: string) => updateGlyph(glyph.id, recipe, historyKey);
  const own = glyph.kind !== 'reference';
  // CraftEngine shows PNG images only; a multi-bitmap gets one character per cell
  const hasChar = own && !isMultiBitmap(glyph) && (nexo || glyph.kind === 'image');
  const others = glyphs.filter((other) => other.id !== glyph.id).map((other) => ({ value: other.glyphId }));

  return (
    <>
      <AutoGrid>
        {hasChar && (
          <FormField label={<NexoKey>Char</NexoKey>} help={t('charHelp')}>
            <Input
              className="font-mono"
              value={glyph.char}
              placeholder={t('charPlaceholder')}
              onChange={(e) => update((g) => (g.char = e.target.value), 'char')}
            />
          </FormField>
        )}
        {nexo && own && (
          <>
            <FormField label={<NexoKey>Default Shadow</NexoKey>} help={t('shadowHelp')}>
              <Input
                className="font-mono"
                value={glyph.shadow}
                placeholder={t('shadowPlaceholder')}
                onChange={(e) => update((g) => (g.shadow = e.target.value), 'shadow')}
              />
            </FormField>
            <FormField label={<NexoKey>Template</NexoKey>} help={t('templateHelp')}>
              <TextInput
                value={glyph.template}
                mono
                suggestions={others}
                onChange={(v) => update((g) => (g.template = v ?? ''), 'template')}
              />
            </FormField>
          </>
        )}
        {nexo && glyph.kind === 'gif' && (
          <FormField label={<NexoKey>Type</NexoKey>} help={t('gifTypeHelp')}>
            <NativeSelect
              className="w-full"
              value={glyph.gifType}
              onChange={(e) => update((g) => (g.gifType = e.target.value as GlyphGifType))}
            >
              {GLYPH_GIF_TYPES.map((type) => (
                <NativeSelectOption key={type} value={type}>
                  {type || t('gifTypeDefault')}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FormField>
        )}
      </AutoGrid>
      {nexo && glyph.kind === 'gif' && glyph.gifType === 'SPRITE' && (
        <CheckboxField
          checked={glyph.interpolate}
          onChange={(checked) => update((g) => (g.interpolate = checked))}
          label={<NexoKey>Interpolate</NexoKey>}
          description={t('interpolateHint')}
        />
      )}
      {!nexo && own && glyph.kind === 'image' && <EmojiContentFields glyph={glyph} update={update} docs={emojiDocsFor(target)} />}
    </>
  );
}

/** CraftEngine: what an emoji keyword turns into, in general and per text context. */
function EmojiContentFields({
  glyph,
  update,
  docs,
}: {
  glyph: Glyph;
  update: (recipe: (draft: Glyph) => void, historyKey?: string) => void;
  docs: string;
}) {
  const t = useTranslations('media.glyphs');
  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{t('emojiHint')}</span>
        <DocsLinkButton href={docs} label={t('emojiDocs')} />
      </div>
      <AutoGrid>
        <FormField label={<NexoKey>Content</NexoKey>} help={t('emojiContentHelp')} wide>
          <Input
            className="font-mono"
            value={glyph.emojiContent}
            placeholder={t('emojiContentPlaceholder')}
            onChange={(e) => update((g) => (g.emojiContent = e.target.value), 'emojiContent')}
          />
        </FormField>
        {EMOJI_CONTEXTS.map((context) => (
          <FormField key={context} label={<NexoKey>{context}</NexoKey>} help={t('emojiOverrideHelp', { context })}>
            <Input
              className="font-mono"
              value={glyph.emojiOverrides[context] ?? ''}
              onChange={(e) =>
                update((g) => {
                  if (e.target.value) g.emojiOverrides[context] = e.target.value;
                  else delete g.emojiOverrides[context];
                }, `emoji.${context}`)
              }
            />
          </FormField>
        ))}
      </AutoGrid>
    </div>
  );
}
