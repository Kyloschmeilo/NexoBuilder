/**
 * The body of a CraftEngine item's Furniture section: the variant switcher (ground, wall, ceiling and the furniture's
 * own variants, plus "Add variant"), the two-pane editor of the selected variant, the furniture's settings as feature
 * rows, and its behaviors as typed entry cards with an "Add behavior" catalog.
 */
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Copy, Plus, Trash2 } from 'lucide-react';
import {
  CE_FURNITURE_ALIGNMENTS,
  CE_FURNITURE_ANCHORS,
  CE_FURNITURE_BEHAVIOR_LIST,
  CE_FURNITURE_FIELDS,
  CE_FURNITURE_LOOT_TEMPLATE,
  CE_FURNITURE_ROTATIONS,
  CE_FURNITURE_SETTINGS_FIELDS,
  CE_FURNITURE_VARIANT_FIELDS,
  CE_DOCS,
  furnitureVariants,
  furnitureVariantsKey,
  withLightObjects,
} from '@resourcepackbuilder/core/craftEngine';
import type { ConfigObject, ConfigValue, Item } from '@resourcepackbuilder/core/project';
import { EmptyHint, FieldGroup, FieldRow, SegmentedControl, useRowKeys } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { isPlainObject } from '@resourcepackbuilder/utils';
import { addCraftEngineFurnitureVariant, removeCraftEngineFurnitureVariant, updateCraftEngineFurniture } from '../../../commands/items';
import { CatalogDialog, catalogFromTypedSource, TypedEntryCard, useCatalogText } from '../../../components/catalog';
import { BooleanSwitch } from '../../../components/editor/inputs/BooleanSwitch';
import { NumberInput } from '../../../components/editor/inputs/NumberInput';
import { SelectInput } from '../../../components/editor/inputs/SelectInput';
import { FeatureList, FeatureRow } from '../../../components/features';
import { prompt } from '../../../store/dialogs';
import { KeyedFields, withKey } from './DisplayElementsEditor';
import { FurnitureVariantEditor } from './FurnitureVariantEditor';
import { variantNameError, variantNames } from './model';
import { FieldFeatureRow, FurnitureGroup } from './parts';

const ANCHORS: readonly string[] = CE_FURNITURE_ANCHORS;
const objectAt = (value: unknown): ConfigObject => (isPlainObject(value) ? (value as ConfigObject) : {});
/** The key a furniture's behaviors are under: `behavior` when only that one is set, else `behaviors` */
const behaviorsKey = (furniture: Record<string, unknown>) =>
  furniture.behaviors === undefined && furniture.behavior !== undefined ? 'behavior' : 'behaviors';
/** A furniture's behaviors as a list (a single behavior may stand without one). */
const behaviorList = (value: unknown): unknown[] => (Array.isArray(value) ? value : value === undefined ? [] : [value]);

/** The loot each item turned off last (with its arguments), so turning it on again in the session brings it back. */
const lastLoot = new Map<string, ConfigObject>();

/** The placement rules and further keys of a variant: what the detail pane shows while no entry is selected. */
function VariantSettings({
  furniture,
  name,
  label,
  variant,
  edit,
  editVariant,
  onRemove,
}: {
  furniture: Record<string, unknown>;
  name: string;
  label: string;
  variant: Record<string, unknown>;
  edit: (next: (furniture: ConfigObject) => ConfigObject, historyKey?: string) => void;
  editVariant: (next: (variant: ConfigObject) => ConfigObject, historyKey?: string) => void;
  onRemove: () => void;
}) {
  const t = useTranslations('item.ceFurniture');
  const tFurniture = useTranslations('item.furniture');
  const rule = objectAt(objectAt(furniture.rules)[name]);
  const setRule = (key: string, value: string | undefined) =>
    edit((f) => {
      const all = objectAt(f.rules);
      const next = withKey(objectAt(all[name]), key, value === 'any' ? undefined : value);
      const nextRules = withKey(all, name, Object.keys(next).length > 0 ? next : undefined);
      return withKey(f, 'rules', Object.keys(nextRules).length > 0 ? nextRules : undefined);
    });
  const ruleRow = (key: 'rotation' | 'alignment', values: readonly string[]) => (
    <FieldRow label={t(key)} yamlKey={`rules.${name}.${key}`}>
      <SelectInput
        aria-label={t(key)}
        value={typeof rule[key] === 'string' ? rule[key].toLowerCase() : undefined}
        // Rule values come from core at runtime; a test checks each has a name in en and de
        placeholder={t(`${key === 'rotation' ? 'rotations' : 'alignments'}.any` as never)}
        options={values
          .filter((value) => value !== 'any')
          .map((value) => ({ value, text: t(`${key === 'rotation' ? 'rotations' : 'alignments'}.${value}` as never) }))}
        onChange={(value) => setRule(key, value)}
      />
    </FieldRow>
  );
  return (
    <>
      <div className="flex min-h-7.5 items-center gap-2">
        <h3 className="m-0 min-w-0 flex-1 truncate text-label font-semibold text-text">{tFurniture('variantTitle', { name: label })}</h3>
        <Button type="button" variant="ghost" size="sm" className="text-danger hover:text-danger" onClick={onRemove}>
          <Trash2 /> {t('removeVariant')}
        </Button>
      </div>
      <FieldGroup>
        {ANCHORS.includes(name) && (
          <>
            {ruleRow('rotation', CE_FURNITURE_ROTATIONS)}
            {ruleRow('alignment', CE_FURNITURE_ALIGNMENTS)}
          </>
        )}
        <KeyedFields
          fields={CE_FURNITURE_VARIANT_FIELDS}
          object={variant}
          siblings={variant}
          set={(key, value, historyKey) => editVariant((v) => withKey(v, key, value), historyKey)}
          historyKey="variant"
        />
      </FieldGroup>
      <p className="m-0 text-meta text-text-muted">{tFurniture('selectEntryHint')}</p>
    </>
  );
}

/** The furniture's behaviors (storage, item display slots, lights) as typed entry cards with an add catalog. */
function FurnitureBehaviors({
  furniture,
  edit,
}: {
  furniture: Record<string, unknown>;
  edit: (next: (furniture: ConfigObject) => ConfigObject, historyKey?: string) => void;
}) {
  const t = useTranslations('item.ceFurniture');
  const tFurniture = useTranslations('item.furniture');
  const text = useCatalogText();
  const [isAdding, setIsAdding] = useState(false);
  const key = behaviorsKey(furniture);
  // Lights written as text show as their position and level
  const list = behaviorList(withLightObjects(furniture[key]));
  const used = list.map((entry) => (isPlainObject(entry) && typeof entry.type === 'string' ? entry.type : '')).filter(Boolean);
  // Each card keeps its open state when a card before it is removed or duplicated
  const cardKeys = useRowKeys(list.length);
  const commit = (next: unknown[], historyKey?: string) =>
    edit((f) => {
      const target = behaviorsKey(f);
      // A furniture keeps a single behavior under `behavior` when it had it there
      const value = next.length === 0 ? undefined : target === 'behavior' && next.length === 1 ? next[0] : next;
      return withKey(
        target === 'behavior' && next.length > 1 ? withKey(f, 'behavior', undefined) : f,
        next.length > 1 ? 'behaviors' : target,
        value as ConfigValue | undefined,
      );
    }, historyKey);
  const catalog = catalogFromTypedSource(CE_FURNITURE_BEHAVIOR_LIST, { text, target: 'craftengine', added: used });
  return (
    <FurnitureGroup
      title={t('behaviors')}
      count={list.length}
      help={t('behaviorsHelp')}
      docs={{ url: CE_DOCS.furnitureBehaviors, target: 'craftengine' }}
      actions={
        list.length > 0 && (
          <Button type="button" variant="ghost" size="sm" className="text-primary hover:text-primary" onClick={() => setIsAdding(true)}>
            <Plus /> {tFurniture('addBehavior')}
          </Button>
        )
      }
    >
      {list.length === 0 ? (
        <EmptyHint actionLabel={tFurniture('addBehavior')} onAction={() => setIsAdding(true)}>
          {tFurniture('noBehaviors')}
        </EmptyHint>
      ) : (
        <div className="flex min-w-0 flex-col gap-2">
          {list.map((entry, i) => (
            <TypedEntryCard
              key={cardKeys.keys[i]}
              source={CE_FURNITURE_BEHAVIOR_LIST}
              entry={entry}
              onChange={(next) =>
                commit(
                  list.map((e, j) => (j === i ? next : e)),
                  `behavior-${i}`,
                )
              }
              onRemove={() => {
                cardKeys.remove(i);
                commit(list.filter((_, j) => j !== i));
              }}
              menu={[
                {
                  icon: <Copy />,
                  label: tFurniture('duplicate'),
                  onSelect: () => {
                    cardKeys.insert(i + 1);
                    commit([...list.slice(0, i + 1), structuredClone(entry), ...list.slice(i + 1)]);
                  },
                },
              ]}
            />
          ))}
        </div>
      )}
      <CatalogDialog
        open={isAdding}
        onOpenChange={setIsAdding}
        title={tFurniture('addBehaviorTitle')}
        {...catalog}
        addLabel={tFurniture('addBehavior')}
        onAdd={(types) => commit([...list, ...types.map((type) => ({ type }))])}
      />
    </FurnitureGroup>
  );
}

/** The editor of a CraftEngine furniture (`furniture` is the item's `furniture` section). */
export function CraftEngineFurnitureEditor({ item, furniture }: { item: Item; furniture: Record<string, unknown> }) {
  const t = useTranslations('item.ceFurniture');
  const tFurniture = useTranslations('item.furniture');
  const tCommon = useTranslations('common');
  const variants = furnitureVariants(furniture);
  const names = variantNames(furniture);
  const [selected, setSelected] = useState(() => names.find((name) => variants[name]) ?? 'ground');
  const name = names.includes(selected) ? selected : 'ground';
  const variant = variants[name] as Record<string, unknown> | undefined;
  // Anchor names come from core at runtime; a test checks each has a name in en and de
  const labelOf = (n: string) => (ANCHORS.includes(n) ? t(`anchors.${n}` as never) : n);

  const edit = (next: (furniture: ConfigObject) => ConfigObject, historyKey?: string) =>
    updateCraftEngineFurniture(item.id, next, historyKey);
  // Variants stay under the key the furniture has them (CraftEngine also reads `variant` and `placement`)
  const editVariant = (next: (variant: ConfigObject) => ConfigObject, historyKey?: string) =>
    edit(
      (f) => {
        const key = furnitureVariantsKey(f);
        const all = objectAt(f[key]);
        return withKey(f, key, withKey(all, name, next(objectAt(all[name]))));
      },
      historyKey && `${name}-${historyKey}`,
    );

  const addVariant = async () => {
    const created = await prompt({
      title: tFurniture('newVariant'),
      label: tFurniture('variantName'),
      initial: '',
      confirmLabel: tCommon('create'),
      validate: (value) => {
        const error = variantNameError(furniture, value);
        return error && tFurniture(`variantNameErrors.${error}`);
      },
    });
    if (created === null) return;
    addCraftEngineFurnitureVariant(item.id, created.trim());
    setSelected(created.trim());
  };

  const settings = objectAt(furniture.settings);
  const setSetting = (key: string, value: ConfigValue | undefined, historyKey?: string) =>
    edit(
      (f) => {
        const next = withKey(objectAt(f.settings), key, value);
        return withKey(f, 'settings', Object.keys(next).length > 0 ? next : undefined);
      },
      historyKey && `setting-${historyKey}`,
    );
  const loot = objectAt(furniture.loot);
  const dropsItem = loot.template === CE_FURNITURE_LOOT_TEMPLATE;
  const setDropsItem = (checked: boolean) => {
    if (!checked) lastLoot.set(item.id, loot);
    const remembered = lastLoot.get(item.id);
    const restored = remembered?.template === CE_FURNITURE_LOOT_TEMPLATE ? remembered : null;
    edit((f) => withKey(f, 'loot', checked ? (restored ?? { template: CE_FURNITURE_LOOT_TEMPLATE }) : undefined));
  };
  const [openSetting, setOpenSetting] = useState<string | null>(null);
  const rowOpen = (key: string) => ({
    open: openSetting === key,
    onOpenChange: (open: boolean) => setOpenSetting(open ? key : null),
  });

  return (
    <div className="@container/furniture flex min-w-0 flex-col gap-6">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <SegmentedControl
            size="sm"
            aria-label={t('variant')}
            value={name}
            onChange={setSelected}
            options={names.map((n) => ({
              value: n,
              label: labelOf(n),
              className: variants[n] ? undefined : 'text-text-faint',
            }))}
          />
          <Button type="button" variant="ghost" size="sm" className="text-primary hover:text-primary" onClick={() => void addVariant()}>
            <Plus /> {tFurniture('addVariant')}
          </Button>
        </div>
        {variant ? (
          <FurnitureVariantEditor
            item={item}
            name={name}
            variant={variant}
            edit={editVariant}
            settings={
              <VariantSettings
                furniture={furniture}
                name={name}
                label={labelOf(name)}
                variant={variant}
                edit={edit}
                editVariant={editVariant}
                onRemove={() => removeCraftEngineFurnitureVariant(item.id, name)}
              />
            }
          />
        ) : (
          <EmptyHint
            actionLabel={tFurniture('addThisVariant', { name: labelOf(name) })}
            onAction={() => addCraftEngineFurnitureVariant(item.id, name)}
          >
            {tFurniture('variantMissing', { name: labelOf(name) })}
          </EmptyHint>
        )}
      </div>

      <FurnitureGroup title={t('settings')} help={t('settingsHelp')} docs={{ url: CE_DOCS.furnitureSettings, target: 'craftengine' }}>
        <FeatureList>
          <FeatureRow
            featureId="settings.hit_times"
            label={t('hitTimes')}
            yamlKey="settings.hit_times"
            control={
              <NumberInput
                label={t('hitTimes')}
                className="w-28 font-mono"
                placeholder="1"
                integer
                min={1}
                value={typeof settings.hit_times === 'number' ? settings.hit_times : undefined}
                onChange={(n) => setSetting('hit_times', n, 'hit-times')}
              />
            }
          />
          {CE_FURNITURE_SETTINGS_FIELDS.map((field) => (
            <FieldFeatureRow
              key={field.key}
              field={field}
              value={settings[field.key]}
              yamlKey={`settings.${field.key}`}
              onChange={(value) => setSetting(field.key, value as ConfigValue | undefined, field.key)}
              {...rowOpen(`settings.${field.key}`)}
            />
          ))}
          {CE_FURNITURE_FIELDS.map((field) => (
            <FieldFeatureRow
              key={field.key}
              field={field}
              value={furniture[field.key]}
              onChange={(value) => edit((f) => withKey(f, field.key, value as ConfigValue | undefined), `furniture-${field.key}`)}
              {...rowOpen(field.key)}
            />
          ))}
          <FeatureRow
            featureId="loot"
            label={t('loot')}
            yamlKey="loot"
            control={
              <BooleanSwitch allowUnset={false} aria-label={t('loot')} value={dropsItem} onChange={(checked) => setDropsItem(!!checked)} />
            }
          />
        </FeatureList>
      </FurnitureGroup>

      <FurnitureBehaviors furniture={furniture} edit={edit} />
    </div>
  );
}
