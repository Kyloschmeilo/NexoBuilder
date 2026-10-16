import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2 } from 'lucide-react';
import {
  autoStateGroupOf,
  blockStates,
  CE_AUTO_STATE_GROUP_IDS,
  CE_DEFAULT_AUTO_STATE,
  CE_PROPERTY_TYPES,
  canonicalPropertyType,
  internalStateCount,
  newBlockProperty,
  parseVariantKey,
  propertyValues,
  stateAutoState,
  statesMap,
  statesTemplate,
  toMultiState,
  toSingleState,
  withFacing,
} from '@resourcepackbuilder/core/craftEngine';
import type { ConfigObject, ConfigValue, Item } from '@resourcepackbuilder/core/project';
import { IconButton } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Field, FieldDescription, FieldLabel } from '@resourcepackbuilder/ui/components/field';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { isPlainObject } from '@resourcepackbuilder/utils';
import { updateCraftEngineBlock } from '../../../commands/items';
import { BlockRendererSection } from './BlockRendererEditor';

type StatesEdit = (states: ConfigObject) => ConfigObject;
const ROTATIONS = ['0', '90', '180', '270'];

/** A map with one key renamed in place (the order of the keys stays). */
function renameKey(map: Record<string, unknown>, from: string, to: string): ConfigObject {
  return Object.fromEntries(Object.entries(map).map(([key, value]) => [key === from ? to : key, value])) as ConfigObject;
}

/** A map without one key. */
function withoutKey(map: Record<string, unknown>, key: string): ConfigObject {
  return Object.fromEntries(Object.entries(map).filter(([name]) => name !== key)) as ConfigObject;
}

/** A free name `<base>_<n>` among the map's keys. */
function freeName(map: Record<string, unknown>, base: string): string {
  let n = Object.keys(map).length + 1;
  while (Object.hasOwn(map, `${base}_${n}`)) n++;
  return `${base}_${n}`;
}

/** The typed default of a property from the text field (true/false for booleans, a number for ints). */
function parseDefault(type: string | undefined, text: string): ConfigValue {
  if (type === 'boolean') return text.trim() === 'true';
  if (type === 'int' && /^-?\d+$/.test(text.trim())) return Number(text.trim());
  return text;
}

/** The `auto_state` group of a state or appearance by its canonical id ('' without one). */
function canonicalGroup(state: unknown): string {
  const name = stateAutoState(state)?.group ?? '';
  return autoStateGroupOf(name)?.id ?? name;
}

/** The `auto_state` groups; a shared state (`{ type, id }`) keeps its id, an unknown imported group stays visible. */
export function AutoStateSelect({
  state,
  onChange,
  id,
  label,
}: {
  state: unknown;
  onChange: (auto: ConfigValue) => void;
  id?: string;
  label?: string;
}) {
  const group = canonicalGroup(state);
  const current = isPlainObject(state) ? state.auto_state : undefined;
  return (
    <NativeSelect
      id={id}
      aria-label={label}
      className="w-full"
      value={group}
      onChange={(e) => onChange(isPlainObject(current) ? ({ ...current, type: e.target.value } as ConfigValue) : e.target.value)}
    >
      {!CE_AUTO_STATE_GROUP_IDS.includes(group) && <NativeSelectOption value={group}>{group}</NativeSelectOption>}
      {CE_AUTO_STATE_GROUP_IDS.map((groupId) => (
        <NativeSelectOption key={groupId} value={groupId}>
          {groupId}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
}

/**
 * The block's states: one state with its `auto_state` group, or several (properties, appearances and the variants
 * that map property values to an appearance). States from a template are set by the behavior's form.
 */
export function CraftEngineStatesEditor({ item, block }: { item: Item; block: Record<string, unknown> }) {
  const t = useTranslations('item');
  const selectId = useId();
  const states = blockStates(block);
  const editBlock = (next: (block: ConfigObject) => ConfigObject, historyKey?: string) => updateCraftEngineBlock(item.id, next, historyKey);

  if (!states) {
    return (
      <div className="flex flex-col gap-3">
        <Field className="gap-1.5">
          <FieldLabel htmlFor={selectId}>{t('ceBlock.autoState')}</FieldLabel>
          <AutoStateSelect
            id={selectId}
            state={block.state}
            onChange={(auto) => editBlock((b) => ({ ...b, state: { ...(isPlainObject(b.state) ? b.state : {}), auto_state: auto } }))}
          />
          <FieldDescription className="text-xs">{t('ceBlock.autoStateHelp')}</FieldDescription>
        </Field>
        <div>
          <Button size="sm" variant="outline" onClick={() => editBlock(toMultiState)}>
            {t('ceBlock.states.toMulti')}
          </Button>
        </div>
        <BlockRendererSection
          item={item}
          looks={[['state', isPlainObject(block.state) ? block.state : {}]]}
          edit={(_name, next, historyKey) =>
            editBlock((b) => ({ ...b, state: next(isPlainObject(b.state) ? (b.state as ConfigObject) : {}) }), historyKey)
          }
        />
      </div>
    );
  }
  const template = statesTemplate(states);
  if (template) return <p className="text-xs text-muted-foreground">{t('ceBlock.states.template', { template })}</p>;

  const editStates = (next: StatesEdit, historyKey?: string) =>
    editBlock((b) => ({ ...b, states: next(isPlainObject(b.states) ? (b.states as ConfigObject) : {}) }), historyKey);
  return (
    <div className="flex flex-col gap-5">
      <MultiStateEditor
        states={states}
        editStates={editStates}
        toSingle={() => editBlock((b) => toSingleState(b, { auto_state: CE_DEFAULT_AUTO_STATE }))}
      />
      <BlockRendererSection
        item={item}
        looks={Object.entries(statesMap(states, 'appearances')).map(([name, value]) => [name, isPlainObject(value) ? value : {}])}
        edit={(name, next, historyKey) =>
          editStates((s) => {
            const appearances = statesMap(s, 'appearances');
            const look = appearances[name];
            return {
              ...s,
              appearances: { ...appearances, [name]: next(isPlainObject(look) ? (look as ConfigObject) : {}) } as ConfigObject,
            };
          }, historyKey)
        }
      />
    </div>
  );
}

function MultiStateEditor({
  states,
  editStates,
  toSingle,
}: {
  states: Record<string, unknown>;
  editStates: (next: StatesEdit, historyKey?: string) => void;
  toSingle: () => void;
}) {
  const t = useTranslations('item');
  const tCommon = useTranslations('common');
  const properties = statesMap(states, 'properties');
  const appearances = statesMap(states, 'appearances');
  const variants = statesMap(states, 'variants');
  const count = internalStateCount(properties);
  const setMap = (key: 'properties' | 'appearances' | 'variants', map: ConfigObject, historyKey?: string) =>
    editStates((s) => ({ ...s, [key]: map }), historyKey);

  const addProperty = () =>
    setMap('properties', { ...(properties as ConfigObject), [freeName(properties, 'property')]: newBlockProperty('boolean') });
  const addVariant = () => {
    const [name, def] = Object.entries(properties)[0] ?? [];
    const value = def ? (propertyValues(def)?.[0] ?? '') : '';
    const key = name ? `${name}=${value}` : 'property=value';
    const appearance = Object.keys(appearances)[0];
    setMap('variants', {
      ...(variants as ConfigObject),
      [Object.hasOwn(variants, key) ? freeName(variants, key) : key]: appearance ? { appearance } : {},
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        {count === null
          ? t('ceBlock.states.countUnknown')
          : t('ceBlock.states.count', { count, appearances: Object.keys(appearances).length })}
      </p>

      <StatesTable title={t('ceBlock.states.properties')} help={t('ceBlock.states.propertiesHelp')} onAdd={addProperty}>
        {Object.entries(properties).map(([name, value], i) => {
          const def = isPlainObject(value) ? value : {};
          const type = canonicalPropertyType(def.type);
          const typeName = typeof def.type === 'string' ? def.type : '';
          const listKey = type === 'int' ? 'range' : 'values';
          const listText =
            type === 'int'
              ? String(def.range ?? (def.min !== undefined ? `${String(def.min)}~${String(def.max)}` : ''))
              : Array.isArray(def.values)
                ? def.values.join(', ')
                : '';
          const setDef = (next: Record<string, unknown>, key: string) =>
            setMap('properties', { ...(properties as ConfigObject), [name]: next as ConfigObject }, key);
          return (
            <div key={i} className="grid grid-cols-[1fr_1fr_5rem_1fr_auto] items-center gap-1.5">
              <Input
                className="h-7"
                aria-label={t('ceBlock.states.propertyName')}
                value={name}
                onChange={(e) => setMap('properties', renameKey(properties, name, e.target.value), `prop-name-${i}`)}
              />
              <NativeSelect
                aria-label={t('ceBlock.states.propertyType')}
                className="w-full"
                value={type ?? typeName}
                onChange={(e) => setDef(newBlockProperty(e.target.value), `prop-type-${i}`)}
              >
                {!type && <NativeSelectOption value={typeName}>{typeName}</NativeSelectOption>}
                {CE_PROPERTY_TYPES.map((id) => (
                  <NativeSelectOption key={id} value={id}>
                    {id}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <Input
                className="h-7"
                aria-label={t('ceBlock.states.propertyDefault')}
                value={def.default === undefined ? '' : String(def.default)}
                onChange={(e) =>
                  setDef(
                    e.target.value === '' ? withoutKey(def, 'default') : { ...def, default: parseDefault(type, e.target.value) },
                    `prop-default-${i}`,
                  )
                }
              />
              {type === 'boolean' ? (
                <span />
              ) : (
                <Input
                  className="h-7"
                  aria-label={t(type === 'int' ? 'ceBlock.states.propertyRange' : 'ceBlock.states.propertyValues')}
                  placeholder={t(type === 'int' ? 'ceBlock.states.rangePlaceholder' : 'ceBlock.states.valuesPlaceholder')}
                  value={listText}
                  onChange={(e) => {
                    const text = e.target.value;
                    const rest = withoutKey(withoutKey(withoutKey(def, 'min'), 'max'), listKey);
                    const values = text
                      .split(',')
                      .map((v) => v.trim())
                      .filter(Boolean);
                    const next = type === 'int' ? { ...rest, range: text } : values.length > 0 ? { ...rest, values } : rest;
                    setDef(text.trim() === '' ? rest : next, `prop-list-${i}`);
                  }}
                />
              )}
              <IconButton
                label={tCommon('remove')}
                size="icon-xs"
                variant="ghost-destructive"
                onClick={() => setMap('properties', withoutKey(properties, name))}
              >
                <Trash2 />
              </IconButton>
            </div>
          );
        })}
      </StatesTable>

      <StatesTable
        title={t('ceBlock.states.appearances')}
        help={t('ceBlock.states.appearancesHelp')}
        onAdd={() =>
          setMap('appearances', {
            ...(appearances as ConfigObject),
            [freeName(appearances, 'look')]: { auto_state: CE_DEFAULT_AUTO_STATE },
          })
        }
      >
        {Object.entries(appearances).map(([name, value], i) => {
          const look = isPlainObject(value) ? value : {};
          const model = isPlainObject(look.model) ? look.model : {};
          const setLook = (next: Record<string, unknown>, key: string) =>
            setMap('appearances', { ...(appearances as ConfigObject), [name]: next as ConfigObject }, key);
          const setModel = (key: string, entry: ConfigValue | undefined, historyKey: string) => {
            const nextModel = entry === undefined ? withoutKey(model, key) : { ...model, [key]: entry };
            setLook(Object.keys(nextModel).length > 0 ? { ...look, model: nextModel } : withoutKey(look, 'model'), historyKey);
          };
          const rotation = (axis: 'x' | 'y') => (
            <NativeSelect
              aria-label={t(axis === 'x' ? 'ceBlock.states.rotationX' : 'ceBlock.states.rotationY')}
              className="w-full"
              value={String(model[axis] ?? 0)}
              onChange={(e) => setModel(axis, e.target.value === '0' ? undefined : Number(e.target.value), `look-${axis}-${i}`)}
            >
              {ROTATIONS.map((r) => (
                <NativeSelectOption key={r} value={r}>
                  {`${axis} ${r}°`}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          );
          return (
            <div key={i} className="grid grid-cols-[1fr_1fr_1.5fr_4.5rem_4.5rem_auto] items-center gap-1.5">
              <Input
                className="h-7"
                aria-label={t('ceBlock.states.appearanceName')}
                value={name}
                onChange={(e) => {
                  const to = e.target.value;
                  // Variants that use the appearance follow its new name
                  const renamed = Object.fromEntries(
                    Object.entries(variants).map(([key, v]) => [
                      key,
                      isPlainObject(v) && v.appearance === name ? { ...v, appearance: to } : v,
                    ]),
                  ) as ConfigObject;
                  editStates((s) => ({ ...s, appearances: renameKey(appearances, name, to), variants: renamed }), `look-name-${i}`);
                }}
              />
              <AutoStateSelect
                label={t('ceBlock.autoState')}
                state={look}
                onChange={(auto) => setLook({ ...look, auto_state: auto }, `look-auto-${i}`)}
              />
              <Input
                className="h-7"
                aria-label={t('ceBlock.states.appearanceModel')}
                placeholder={t('ceBlock.states.modelPlaceholder')}
                value={typeof model.path === 'string' ? model.path : ''}
                onChange={(e) => setModel('path', e.target.value.trim() === '' ? undefined : e.target.value, `look-path-${i}`)}
              />
              {rotation('x')}
              {rotation('y')}
              <IconButton
                label={tCommon('remove')}
                size="icon-xs"
                variant="ghost-destructive"
                onClick={() => setMap('appearances', withoutKey(appearances, name))}
              >
                <Trash2 />
              </IconButton>
            </div>
          );
        })}
      </StatesTable>

      <StatesTable title={t('ceBlock.states.variants')} help={t('ceBlock.states.variantsHelp')} onAdd={addVariant}>
        {Object.entries(variants).map(([key, value], i) => {
          const variant = isPlainObject(value) ? value : {};
          const appearance = typeof variant.appearance === 'string' ? variant.appearance : '';
          return (
            <div key={i} className="grid grid-cols-[1.5fr_1fr_auto_auto] items-center gap-1.5">
              <Input
                className="h-7"
                aria-label={t('ceBlock.states.variantKey')}
                aria-invalid={parseVariantKey(key) === null}
                value={key}
                onChange={(e) => setMap('variants', renameKey(variants, key, e.target.value), `variant-key-${i}`)}
              />
              <NativeSelect
                aria-label={t('ceBlock.states.variantAppearance')}
                className="w-full"
                value={appearance}
                onChange={(e) =>
                  setMap('variants', {
                    ...(variants as ConfigObject),
                    [key]: (e.target.value
                      ? { ...variant, appearance: e.target.value }
                      : withoutKey(variant, 'appearance')) as ConfigObject,
                  })
                }
              >
                <NativeSelectOption value="">{t('ceBlock.states.noAppearance')}</NativeSelectOption>
                {appearance && !Object.hasOwn(appearances, appearance) && (
                  <NativeSelectOption value={appearance}>{appearance}</NativeSelectOption>
                )}
                {Object.keys(appearances).map((look) => (
                  <NativeSelectOption key={look} value={look}>
                    {look}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <span className="text-xs text-muted-foreground">
                {variant.settings !== undefined ? t('ceBlock.states.withSettings') : ''}
              </span>
              <IconButton
                label={tCommon('remove')}
                size="icon-xs"
                variant="ghost-destructive"
                onClick={() => setMap('variants', withoutKey(variants, key))}
              >
                <Trash2 />
              </IconButton>
            </div>
          );
        })}
      </StatesTable>

      <div className="flex flex-wrap gap-2">
        {!Object.hasOwn(properties, 'facing') && (
          <Button size="sm" variant="outline" onClick={() => editStates(withFacing)}>
            {t('ceBlock.states.addFacing')}
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={toSingle}>
          {t('ceBlock.states.toSingle')}
        </Button>
      </div>
    </div>
  );
}

/** A titled list of rows with an add button. */
function StatesTable({ title, help, onAdd, children }: { title: string; help: string; onAdd: () => void; children: React.ReactNode }) {
  const tCommon = useTranslations('common');
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{title}</span>
        <Button size="xs" variant="outline" onClick={onAdd}>
          <Plus /> {tCommon('add')}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{help}</p>
      {children}
    </div>
  );
}
