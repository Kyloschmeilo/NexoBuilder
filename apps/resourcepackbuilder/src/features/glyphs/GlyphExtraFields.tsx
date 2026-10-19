/**
 * The less common options of a glyph: its fixed character (both plugins), Nexo's shadow, template and GIF animation
 * type, and the content CraftEngine shows for its emoji.
 */
import { useTranslations } from 'next-intl';
import { EMOJI_CONTEXTS, GLYPH_GIF_TYPES, type Glyph, type GlyphGifType, isMultiBitmap } from '@resourcepackbuilder/core/project';
import { emojiDocsFor } from '@resourcepackbuilder/core/targets';
import { DocsLink, FieldGroup, Section } from '@resourcepackbuilder/ui';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { updateGlyph } from '../../commands/media';
import { TextInput } from '../../components/editor';
import { useOpenProject } from '../../store/project';
import { MediaField, SwitchField } from '../media/MediaFields';

type Update = (recipe: (draft: Glyph) => void, historyKey?: string) => void;

/** Whether the glyph has a fixed character for the target: own, single-cell glyphs (CraftEngine: PNG only). */
const hasChar = (glyph: Glyph, nexo: boolean) => glyph.kind !== 'reference' && !isMultiBitmap(glyph) && (nexo || glyph.kind === 'image');

/** Whether the glyph has any of the advanced options for the target. */
export function hasGlyphExtraFields(glyph: Glyph, nexo: boolean): boolean {
  return hasChar(glyph, nexo) || (nexo && glyph.kind !== 'reference');
}

/** Character, shadow, template, GIF type and interpolation. */
export function GlyphExtraFields({ glyph, glyphs }: { glyph: Glyph; glyphs: Glyph[] }) {
  const t = useTranslations('media.glyphs');
  const tField = useTranslations('media.fields');
  const { target } = useOpenProject();
  const nexo = target === 'nexo';
  const update: Update = (recipe, historyKey) => updateGlyph(glyph.id, recipe, historyKey);
  const own = glyph.kind !== 'reference';
  const others = glyphs.filter((other) => other.id !== glyph.id).map((other) => ({ value: other.glyphId }));

  return (
    <FieldGroup>
      {hasChar(glyph, nexo) && (
        <MediaField label={tField('char')} yamlKey="char" help={t('charHelp')}>
          {(id) => (
            <Input
              id={id}
              className="font-mono"
              value={glyph.char}
              placeholder={t('charPlaceholder')}
              onChange={(e) => update((g) => (g.char = e.target.value), 'char')}
            />
          )}
        </MediaField>
      )}
      {nexo && own && (
        <>
          <MediaField label={tField('shadow')} yamlKey="default_shadow" help={t('shadowHelp')}>
            {(id) => (
              <Input
                id={id}
                className="font-mono"
                value={glyph.shadow}
                placeholder={t('shadowPlaceholder')}
                onChange={(e) => update((g) => (g.shadow = e.target.value), 'shadow')}
              />
            )}
          </MediaField>
          <MediaField label={tField('template')} yamlKey="template" help={t('templateHelp')}>
            {(id) => (
              <TextInput
                id={id}
                value={glyph.template}
                mono
                suggestions={others}
                onChange={(v) => update((g) => (g.template = v ?? ''), 'template')}
              />
            )}
          </MediaField>
        </>
      )}
      {nexo && glyph.kind === 'gif' && (
        <MediaField label={tField('gifType')} yamlKey="type" help={t('gifTypeHelp')}>
          {(id) => (
            <NativeSelect
              id={id}
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
          )}
        </MediaField>
      )}
      {nexo && glyph.kind === 'gif' && glyph.gifType === 'SPRITE' && (
        <SwitchField
          label={tField('interpolate')}
          yamlKey="interpolate"
          help={t('interpolateHint')}
          checked={glyph.interpolate}
          onChange={(checked) => update((g) => (g.interpolate = checked))}
        />
      )}
    </FieldGroup>
  );
}

/** CraftEngine: what an emoji keyword turns into, in general and per text context. Only for own PNG glyphs. */
export function EmojiContentSection({ glyph }: { glyph: Glyph }) {
  const t = useTranslations('media.glyphs');
  const tField = useTranslations('media.fields');
  const tSection = useTranslations('media.sections');
  const { target } = useOpenProject();
  if (target === 'nexo' || glyph.kind !== 'image') return null;
  const update: Update = (recipe, historyKey) => updateGlyph(glyph.id, recipe, historyKey);
  return (
    <Section
      id="emoji"
      title={tSection('emoji')}
      description={t('emojiHint')}
      actions={<DocsLink url={emojiDocsFor(target)} target={target} label={t('emojiDocs')} />}
    >
      <FieldGroup>
        <MediaField label={tField('emojiContent')} yamlKey="content" help={t('emojiContentHelp')}>
          {(id) => (
            <Input
              id={id}
              className="font-mono"
              value={glyph.emojiContent}
              placeholder={t('emojiContentPlaceholder')}
              onChange={(e) => update((g) => (g.emojiContent = e.target.value), 'emojiContent')}
            />
          )}
        </MediaField>
        {EMOJI_CONTEXTS.map((context) => (
          <MediaField
            key={context}
            label={tField('emojiOverride', { context })}
            yamlKey={`content_overrides.${context}`}
            help={t('emojiOverrideHelp', { context })}
          >
            {(id) => (
              <Input
                id={id}
                className="font-mono"
                value={glyph.emojiOverrides[context] ?? ''}
                onChange={(e) =>
                  update((g) => {
                    if (e.target.value) g.emojiOverrides[context] = e.target.value;
                    else delete g.emojiOverrides[context];
                  }, `emoji.${context}`)
                }
              />
            )}
          </MediaField>
        ))}
      </FieldGroup>
    </Section>
  );
}
