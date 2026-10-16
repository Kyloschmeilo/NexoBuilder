import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2 } from 'lucide-react';
import {
  CE_FURNITURE_ALIGNMENTS,
  CE_FURNITURE_ANCHORS,
  CE_FURNITURE_LOOT_TEMPLATE,
  CE_FURNITURE_ROTATIONS,
  craftEngineBlock,
  craftEngineFurniture,
  furnitureVariants,
  newFurnitureVariant,
} from '@resourcepackbuilder/core/craftEngine';
import type { ConfigObject, ConfigValue, Item } from '@resourcepackbuilder/core/project';
import { SegmentedControl } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { isPlainObject } from '@resourcepackbuilder/utils';
import { CheckboxField } from '../../../components/CheckboxField';
import { Section } from '../../../components/Section';
import { setCraftEngineFurniture, updateCraftEngineFurniture } from '../../../commands/items';
import { useOpenProject } from '../../../store/project';
import { FurniturePreview } from './FurniturePreview';
import { FurnitureVariantEditor, NumberInput, withKey } from './FurnitureVariantEditor';

const ANCHORS: readonly string[] = CE_FURNITURE_ANCHORS;
const SOUNDS = ['break', 'place', 'hit'] as const;
const objectAt = (value: unknown): ConfigObject => (isPlainObject(value) ? (value as ConfigObject) : {});

/** The placement rule selects of a variant (stored in the definition's `rules`, written to the item's behavior). */
function RuleSelect({
  label,
  value,
  values,
  name,
  onChange,
}: {
  label: string;
  value: string;
  values: readonly string[];
  name: (value: string) => string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <NativeSelect className="w-full" size="sm" value={value} onChange={(e) => onChange(e.target.value)}>
        {!values.includes(value) && <NativeSelectOption value={value}>{value}</NativeSelectOption>}
        {values.map((v) => (
          <NativeSelectOption key={v} value={v}>
            {name(v)}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </label>
  );
}

function FurnitureEditor({ item, furniture }: { item: Item; furniture: Record<string, unknown> }) {
  const t = useTranslations('item');
  const project = useOpenProject();
  const variants = furnitureVariants(furniture);
  const names = [...ANCHORS, ...Object.keys(variants).filter((name) => !ANCHORS.includes(name))];
  const [selected, setSelected] = useState(() => names.find((name) => variants[name]) ?? 'ground');
  const name = names.includes(selected) ? selected : 'ground';
  const variant = variants[name] as Record<string, unknown> | undefined;
  const isAnchor = ANCHORS.includes(name);

  const edit = (next: (furniture: ConfigObject) => ConfigObject, historyKey?: string) => updateCraftEngineFurniture(item.id, next, historyKey);
  const setVariant = (value: ConfigObject | undefined, historyKey?: string) =>
    edit((f) => withKey(f, 'variants', withKey(objectAt(f.variants), name, value)), historyKey);
  const editVariant = (next: (variant: ConfigObject) => ConfigObject, historyKey?: string) =>
    edit((f) => {
      const all = objectAt(f.variants);
      return withKey(f, 'variants', withKey(all, name, next(objectAt(all[name]))));
    }, historyKey && `${name}-${historyKey}`);
  const rules = objectAt(furniture.rules);
  const rule = objectAt(rules[name]);
  const setRule = (key: string, value: string) =>
    edit((f) => {
      const all = objectAt(f.rules);
      const next = withKey(objectAt(all[name]), key, value === 'any' ? undefined : value);
      const nextRules = withKey(all, name, Object.keys(next).length > 0 ? next : undefined);
      return withKey(f, 'rules', Object.keys(nextRules).length > 0 ? nextRules : undefined);
    });
  const settings = objectAt(furniture.settings);
  const sounds = objectAt(settings.sounds);
  const setSetting = (key: string, value: ConfigValue | undefined, historyKey?: string) =>
    edit((f) => {
      const next = withKey(objectAt(f.settings), key, value);
      return withKey(f, 'settings', Object.keys(next).length > 0 ? next : undefined);
    }, historyKey);
  const loot = objectAt(furniture.loot);
  const dropsItem = loot.template === CE_FURNITURE_LOOT_TEMPLATE;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <SegmentedControl
          size="sm"
          aria-label={t('ceFurniture.variant')}
          value={name}
          onChange={setSelected}
          options={names.map((n) => ({
            value: n,
            // Anchor names come from core at runtime; a test checks each has a name in en and de
            label: ANCHORS.includes(n) ? t(`ceFurniture.anchors.${n}` as never) : n,
            className: variants[n] ? undefined : 'text-muted-foreground',
          }))}
        />
        <p className="text-xs text-muted-foreground">{t('ceFurniture.variantHelp')}</p>
      </div>

      {!variant ? (
        <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-border p-4">
          <p className="text-sm text-muted-foreground">{t('ceFurniture.variantMissing')}</p>
          <Button size="sm" variant="outline" onClick={() => setVariant(newFurnitureVariant())}>
            <Plus /> {t('ceFurniture.addVariant')}
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 @3xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-1.5">
              <FurniturePreview project={project} item={item} variantName={name} variant={variant} />
              <p className="text-xs text-muted-foreground">{t('ceFurniture.previewHelp')}</p>
            </div>
            <div className="flex min-w-0 flex-col gap-3">
              {isAnchor && (
                <div className="grid grid-cols-2 gap-2">
                  <RuleSelect
                    label={t('ceFurniture.rotation')}
                    value={String(rule.rotation ?? 'any').toLowerCase()}
                    values={CE_FURNITURE_ROTATIONS}
                    // Rule values come from core at runtime; a test checks each has a name in en and de
                    name={(v) => t(`ceFurniture.rotations.${v}` as never)}
                    onChange={(v) => setRule('rotation', v)}
                  />
                  <RuleSelect
                    label={t('ceFurniture.alignment')}
                    value={String(rule.alignment ?? 'any').toLowerCase()}
                    values={CE_FURNITURE_ALIGNMENTS}
                    name={(v) => t(`ceFurniture.alignments.${v}` as never)}
                    onChange={(v) => setRule('alignment', v)}
                  />
                  <p className="col-span-full text-xs text-muted-foreground">{t('ceFurniture.rulesHelp')}</p>
                </div>
              )}
              <div>
                <Button size="sm" variant="outline" onClick={() => setVariant(undefined)}>
                  <Trash2 /> {t('ceFurniture.removeVariant')}
                </Button>
              </div>
            </div>
          </div>
          <FurnitureVariantEditor variant={variant} edit={editVariant} />
        </>
      )}

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">{t('ceFurniture.settings')}</span>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{t('ceFurniture.hitTimes')}</span>
            <NumberInput
              label={t('ceFurniture.hitTimes')}
              placeholder="1"
              value={typeof settings.hit_times === 'number' ? settings.hit_times : undefined}
              onChange={(n) => setSetting('hit_times', n, 'hit-times')}
            />
          </label>
          {SOUNDS.map((sound) => (
            <label key={sound} className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">{t(`ceFurniture.sounds.${sound}`)}</span>
              <Input
                className="h-7"
                placeholder={`minecraft:block.wood.${sound}`}
                value={typeof sounds[sound] === 'string' ? sounds[sound] : ''}
                onChange={(e) => {
                  const next = withKey(sounds, sound, e.target.value.trim() === '' ? undefined : e.target.value);
                  setSetting('sounds', Object.keys(next).length > 0 ? next : undefined, `sound-${sound}`);
                }}
              />
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{t('ceFurniture.settingsHelp')}</p>
      </div>

      <CheckboxField
        checked={dropsItem}
        onChange={(checked) => edit((f) => withKey(f, 'loot', checked ? { template: CE_FURNITURE_LOOT_TEMPLATE } : undefined))}
        label={t('ceFurniture.loot')}
        description={t('ceFurniture.lootHelp')}
      />
    </div>
  );
}

/**
 * CraftEngine: whether the item places furniture, and its variants (ground, wall, ceiling) with their elements,
 * hitboxes and seats, its settings and loot. An item is either a block or furniture, so the toggle is off while the
 * item places a block.
 */
export function CraftEngineFurnitureSection({ item }: { item: Item }) {
  const t = useTranslations('item');
  const furniture = craftEngineFurniture(item.config);
  const isBlock = craftEngineBlock(item.config) !== null;
  return (
    <Section title={t('ceFurniture.title')} description={t('ceFurniture.description')}>
      <CheckboxField
        checked={furniture !== null}
        disabled={isBlock && furniture === null}
        onChange={(checked) => setCraftEngineFurniture(item.id, checked)}
        label={t('ceFurniture.toggle')}
        description={isBlock && furniture === null ? t('ceFurniture.toggleBlocked') : t('ceFurniture.toggleHelp')}
      />
      {furniture && <FurnitureEditor item={item} furniture={furniture} />}
    </Section>
  );
}
