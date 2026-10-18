/**
 * The CraftEngine furniture section of the Model tab: the toggle, the variants with their placement rules, elements,
 * hitboxes and seats, the settings, the behaviors and the loot.
 */
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2 } from 'lucide-react';
import {
  CE_DOCS,
  CE_FURNITURE_ALIGNMENTS,
  CE_FURNITURE_BEHAVIOR_LIST,
  CE_FURNITURE_FIELDS,
  CE_FURNITURE_ANCHORS,
  CE_FURNITURE_LOOT_TEMPLATE,
  CE_FURNITURE_ROTATIONS,
  CE_FURNITURE_SETTINGS_FIELDS,
  craftEngineBlock,
  craftEngineFurniture,
  furnitureVariants,
  furnitureVariantsKey,
  newFurnitureVariant,
  withLightObjects,
} from '@resourcepackbuilder/core/craftEngine';
import type { ConfigObject, ConfigValue, Item } from '@resourcepackbuilder/core/project';
import { SegmentedControl } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { isPlainObject } from '@resourcepackbuilder/utils';
import { CheckboxField } from '../../../components/CheckboxField';
import { FieldRenderer } from '../../../components/editor';
import { Section } from '../../../components/Section';
import { setCraftEngineFurniture, updateCraftEngineFurniture } from '../../../commands/items';
import { useOpenProject } from '../../../store/project';
import { FurniturePreview } from './FurniturePreview';
import { DocsLink, KeyedFields, NumberInput, withKey } from './DisplayElementsEditor';
import { FurnitureVariantEditor } from './FurnitureVariantEditor';

const ANCHORS: readonly string[] = CE_FURNITURE_ANCHORS;
const objectAt = (value: unknown): ConfigObject => (isPlainObject(value) ? (value as ConfigObject) : {});
/** The key a furniture's behaviors are under: `behavior` when only that one is set, else `behaviors` */
const behaviorsKey = (furniture: Record<string, unknown>) =>
  furniture.behaviors === undefined && furniture.behavior !== undefined ? 'behavior' : 'behaviors';

/** The loot each item turned off last (with its arguments), so turning it on again in the session brings it back. */
const lastLoot = new Map<string, ConfigObject>();

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

  const edit = (next: (furniture: ConfigObject) => ConfigObject, historyKey?: string) =>
    updateCraftEngineFurniture(item.id, next, historyKey);
  // Variants stay under the key the furniture has them (CraftEngine also reads `variant` and `placement`)
  const setVariant = (value: ConfigObject | undefined, historyKey?: string) =>
    edit((f) => {
      const key = furnitureVariantsKey(f);
      return withKey(f, key, withKey(objectAt(f[key]), name, value));
    }, historyKey);
  const editVariant = (next: (variant: ConfigObject) => ConfigObject, historyKey?: string) =>
    edit(
      (f) => {
        const key = furnitureVariantsKey(f);
        const all = objectAt(f[key]);
        return withKey(f, key, withKey(all, name, next(objectAt(all[name]))));
      },
      historyKey && `${name}-${historyKey}`,
    );
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
  const behaviors = behaviorsKey(furniture);
  const setSetting = (key: string, value: ConfigValue | undefined, historyKey?: string) =>
    edit((f) => {
      const next = withKey(objectAt(f.settings), key, value);
      return withKey(f, 'settings', Object.keys(next).length > 0 ? next : undefined);
    }, historyKey);
  const loot = objectAt(furniture.loot);
  const dropsItem = loot.template === CE_FURNITURE_LOOT_TEMPLATE;
  const setDropsItem = (checked: boolean) => {
    if (!checked) lastLoot.set(item.id, loot);
    const remembered = lastLoot.get(item.id);
    const restored = remembered?.template === CE_FURNITURE_LOOT_TEMPLATE ? remembered : null;
    edit((f) => withKey(f, 'loot', checked ? (restored ?? { template: CE_FURNITURE_LOOT_TEMPLATE }) : undefined));
  };

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
        <span className="flex items-center gap-1 text-sm font-medium">
          {t('ceFurniture.settings')}
          <DocsLink href={CE_DOCS.furnitureSettings} />
        </span>
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
          <KeyedFields fields={CE_FURNITURE_SETTINGS_FIELDS} object={settings} siblings={settings} set={setSetting} historyKey="setting" />
        </div>
        <p className="text-xs text-muted-foreground">{t('ceFurniture.settingsHelp')}</p>
      </div>

      <KeyedFields
        fields={CE_FURNITURE_FIELDS}
        object={furniture}
        siblings={furniture}
        set={(key, value, historyKey) => edit((f) => withKey(f, key, value), historyKey)}
        historyKey="furniture"
      />

      <div className="flex flex-col gap-2">
        <span className="flex items-center gap-1 text-sm font-medium">
          {t('ceFurniture.behaviors')}
          <DocsLink href={CE_DOCS.furnitureBehaviors} />
        </span>
        <p className="text-xs text-muted-foreground">{t('ceFurniture.behaviorsHelp')}</p>
        <FieldRenderer
          field={CE_FURNITURE_BEHAVIOR_LIST}
          // Lights written as text show as their position and level
          value={withLightObjects(furniture[behaviors])}
          hideLabel
          onChange={(value) => edit((f) => withKey(f, behaviors, value as ConfigValue | undefined), 'behaviors')}
        />
      </div>

      <CheckboxField checked={dropsItem} onChange={setDropsItem} label={t('ceFurniture.loot')} description={t('ceFurniture.lootHelp')} />
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
