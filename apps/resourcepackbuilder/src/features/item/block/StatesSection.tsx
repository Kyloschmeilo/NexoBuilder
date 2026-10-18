import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2 } from 'lucide-react';
import {
  appearanceStateSource,
  autoStateGroupOf,
  blockStates,
  CE_APPEARANCE_MODEL_FIELD,
  CE_APPEARANCE_MODELS_FIELD,
  CE_AUTO_STATE_GROUP_IDS,
  CE_DEFAULT_AUTO_STATE,
  CE_PLACEMENT_PROPERTY_NAMES,
  CE_PROPERTY_TYPES,
  canonicalPropertyType,
  internalStateCount,
  newBlockProperty,
  parseVariantKey,
  propertyNameHint,
  propertyValues,
  stateAutoState,
  statesMap,
  statesTemplate,
  toMultiState,
  toSingleState,
  variantSettingsProperties,
  withAutoStateId,
  withExactState,
  withFacing,
  withFixedId,
} from '@resourcepackbuilder/core/craftEngine';
import { activeProperties } from '@resourcepackbuilder/core/form';
import { type ConfigObject, type ConfigValue, type Item, toConfigValue } from '@resourcepackbuilder/core/project';
import { CollapsibleSection, IconButton } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Field, FieldDescription, FieldLabel } from '@resourcepackbuilder/ui/components/field';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { isPlainObject } from '@resourcepackbuilder/utils';
import { setItemProperty, updateCraftEngineBlock } from '../../../commands/items';
import { FieldRenderer } from '../../../components/editor';
import { ObjectFields } from '../../../components/editor/editors/ObjectEditor';
import { AddPropertyButton } from '../properties/AddPropertyButton';
import { PropertyCard } from '../properties/PropertyCard';
import { useProjectForm } from '../properties/useProjectForm';
import { BlockRendererSection } from './BlockRendererEditor';

type StatesEdit = (states: ConfigObject) => ConfigObject;
type LookEdit = (look: ConfigObject) => ConfigObject;
const ROTATIONS = ['0', '90', '180', '270'];
/** The group of the block settings, whose properties a variant's settings take */
const BLOCK_SETTINGS_GROUP = 'blockSettings';

/** A map with one key renamed in place (the order of the keys stays). */
function renameKey(map: Record<string, unknown>, from: string, to: string): ConfigObject {
  return Object.fromEntries(Object.entries(map).map(([key, value]) => [key === from ? to : key, value])) as ConfigObject;
}

/** A map without one key. */
function withoutKey(map: Record<string, unknown>, key: string): ConfigObject {
  return Object.fromEntries(Object.entries(map).filter(([name]) => name !== key)) as ConfigObject;
}

/** A map with a key set, or without it when the value is empty (undefined, an empty object or list). */
function withValue(map: Record<string, unknown>, key: string, value: unknown): ConfigObject {
  const empty =
    value === undefined || (Array.isArray(value) && value.length === 0) || (isPlainObject(value) && Object.keys(value).length === 0);
  return empty ? withoutKey(map, key) : ({ ...map, [key]: toConfigValue(value) } as ConfigObject);
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

/** The vanilla state of a look: its `auto_state` group, or the exact vanilla state when it names one. */
function LookStateInput({
  look,
  setLook,
  id,
}: {
  look: Record<string, unknown>;
  setLook: (edit: LookEdit, key: string) => void;
  id?: string;
}) {
  const t = useTranslations('item');
  const source = appearanceStateSource(look);
  if (source.kind === 'state') {
    return (
      <Input
        id={id}
        className="h-7"
        aria-label={t('ceBlock.states.exactState')}
        placeholder={t('ceBlock.states.exactStatePlaceholder')}
        value={source.state}
        onChange={(e) => setLook((l) => withExactState(l, e.target.value), 'look-state')}
      />
    );
  }
  return (
    <AutoStateSelect
      id={id}
      label={t('ceBlock.autoState')}
      state={look}
      onChange={(auto) => setLook((l) => ({ ...l, auto_state: auto }), 'look-auto')}
    />
  );
}

/**
 * The keys of a look the compact rows leave out: where its vanilla state comes from (a group, one shared by id, or
 * an exact vanilla state), the model's textures, z rotation and uvlock, and a weighted list of models.
 */
function LookDetails({ look, setLook }: { look: Record<string, unknown>; setLook: (edit: LookEdit, key: string) => void }) {
  const t = useTranslations('item');
  const sourceId = useId();
  const sharedId = useId();
  const source = appearanceStateSource(look);
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field className="gap-1.5">
          <FieldLabel htmlFor={sourceId}>{t('ceBlock.states.source')}</FieldLabel>
          <NativeSelect
            id={sourceId}
            className="w-full"
            value={source.kind}
            onChange={(e) => setLook((l) => withExactState(l, e.target.value === 'state' ? '' : null), 'look-source')}
          >
            <NativeSelectOption value="auto">{t('ceBlock.states.sourceAuto')}</NativeSelectOption>
            <NativeSelectOption value="state">{t('ceBlock.states.sourceState')}</NativeSelectOption>
          </NativeSelect>
          <FieldDescription className="text-xs">
            {source.kind === 'state' ? t('ceBlock.states.exactStateHelp') : t('ceBlock.states.sourceAutoHelp')}
          </FieldDescription>
        </Field>
        {source.kind === 'auto' && (
          <Field className="gap-1.5">
            <FieldLabel htmlFor={sharedId}>{t('ceBlock.states.sharedId')}</FieldLabel>
            <Input
              id={sharedId}
              className="h-7"
              placeholder={t('ceBlock.states.sharedIdPlaceholder')}
              value={source.id ?? ''}
              onChange={(e) => setLook((l) => withAutoStateId(l, e.target.value), 'look-shared')}
            />
            <FieldDescription className="text-xs">{t('ceBlock.states.sharedIdHelp')}</FieldDescription>
          </Field>
        )}
      </div>
      <ObjectFields
        field={CE_APPEARANCE_MODEL_FIELD}
        value={isPlainObject(look.model) ? look.model : {}}
        onChange={(model) => setLook((l) => withValue(l, 'model', model), 'look-model')}
      />
      <FieldRenderer
        field={CE_APPEARANCE_MODELS_FIELD}
        value={look.models}
        onChange={(models) => setLook((l) => withValue(l, 'models', models), 'look-models')}
      />
    </div>
  );
}

/** The fixed internal id of a state or of the states (CraftEngine picks free ids without one). */
function FixedIdInput({ value, onChange }: { value: unknown; onChange: (id: number | undefined) => void }) {
  const t = useTranslations('item');
  const id = useId();
  return (
    <Field className="gap-1.5">
      <FieldLabel htmlFor={id}>{t('ceBlock.states.fixedId')}</FieldLabel>
      <Input
        id={id}
        className="h-7 w-32"
        type="number"
        min={0}
        step={1}
        placeholder={t('ceBlock.states.fixedIdPlaceholder')}
        value={typeof value === 'number' ? String(value) : ''}
        onChange={(e) => {
          const text = e.target.value.trim();
          onChange(/^\d+$/.test(text) ? Number(text) : undefined);
        }}
      />
      <FieldDescription className="text-xs">{t('ceBlock.states.fixedIdHelp')}</FieldDescription>
    </Field>
  );
}

/**
 * The block's states: one state with its `auto_state` group, or several (properties, appearances and the variants
 * that map property values to an appearance and override settings). States from a template are set by the behavior's
 * form.
 */
export function CraftEngineStatesEditor({ item, block }: { item: Item; block: Record<string, unknown> }) {
  const t = useTranslations('item');
  const selectId = useId();
  const states = blockStates(block);
  const editBlock = (next: (block: ConfigObject) => ConfigObject, historyKey?: string) => updateCraftEngineBlock(item.id, next, historyKey);

  if (!states) {
    const state = isPlainObject(block.state) ? block.state : {};
    const editState = (next: LookEdit, historyKey?: string) =>
      editBlock((b) => ({ ...b, state: next(isPlainObject(b.state) ? (b.state as ConfigObject) : {}) }), historyKey);
    return (
      <div className="flex flex-col gap-3">
        <Field className="gap-1.5">
          <FieldLabel htmlFor={selectId}>{t('ceBlock.autoState')}</FieldLabel>
          <LookStateInput id={selectId} look={state} setLook={(edit, key) => editState(edit, `state-${key}`)} />
          <FieldDescription className="text-xs">{t('ceBlock.autoStateHelp')}</FieldDescription>
        </Field>
        <CollapsibleSection title={t('ceBlock.states.details')}>
          <div className="flex flex-col gap-3">
            <LookDetails look={state} setLook={(edit, key) => editState(edit, `state-${key}`)} />
            <FixedIdInput value={state.id} onChange={(id) => editState((s) => withFixedId(s, id), 'state-id')} />
          </div>
        </CollapsibleSection>
        <div>
          <Button size="sm" variant="outline" onClick={() => editBlock(toMultiState)}>
            {t('ceBlock.states.toMulti')}
          </Button>
        </div>
        <BlockRendererSection item={item} looks={[['state', state]]} edit={(_name, next, historyKey) => editState(next, historyKey)} />
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
        item={item}
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

/** The settings a variant overrides for the states it matches: the block settings, scoped to the variant. */
function VariantSettings({ item, variantKey }: { item: Item; variantKey: string }) {
  const t = useTranslations('item');
  const form = useProjectForm();
  const schema = { ...form, properties: variantSettingsProperties(variantKey) };
  const active = activeProperties(schema, item, BLOCK_SETTINGS_GROUP);
  return (
    <CollapsibleSection
      title={t('ceBlock.states.variantSettings')}
      meta={active.length > 0 ? <span className="text-xs text-muted-foreground">{active.length}</span> : undefined}
      actions={
        <AddPropertyButton
          schema={schema}
          item={item}
          group={BLOCK_SETTINGS_GROUP}
          onAdd={(def) => setItemProperty(item.id, def, def.defaultValue())}
        />
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-xs text-muted-foreground">{t('ceBlock.states.variantSettingsHelp')}</p>
        {active.map((def) => (
          <PropertyCard key={def.id} item={item} def={def} onRemove={() => setItemProperty(item.id, def, undefined)} />
        ))}
      </div>
    </CollapsibleSection>
  );
}

function MultiStateEditor({
  item,
  states,
  editStates,
  toSingle,
}: {
  item: Item;
  states: Record<string, unknown>;
  editStates: (next: StatesEdit, historyKey?: string) => void;
  toSingle: () => void;
}) {
  const t = useTranslations('item');
  const tCommon = useTranslations('common');
  const namesId = useId();
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
        <datalist id={namesId}>
          {CE_PLACEMENT_PROPERTY_NAMES.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        {Object.entries(properties).map(([name, value], i) => {
          const def = isPlainObject(value) ? value : {};
          const type = canonicalPropertyType(def.type);
          const typeName = typeof def.type === 'string' ? def.type : '';
          const listKey = type === 'int' ? 'range' : 'values';
          const hint = propertyNameHint(name, type);
          const listText =
            type === 'int'
              ? String(def.range ?? (def.min !== undefined ? `${String(def.min)}~${String(def.max)}` : ''))
              : Array.isArray(def.values)
                ? def.values.join(', ')
                : '';
          const setDef = (next: Record<string, unknown>, key: string) =>
            setMap('properties', { ...(properties as ConfigObject), [name]: next as ConfigObject }, key);
          return (
            <div key={i} className="flex flex-col gap-1">
              <div className="grid grid-cols-[1fr_1fr_5rem_1fr_auto] items-center gap-1.5">
                <Input
                  className="h-7"
                  list={namesId}
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
              {hint && (
                <p className={hint.fits ? 'text-xs text-muted-foreground' : 'text-xs text-destructive'}>
                  {/* The names come from core at runtime; a test checks each has a hint in en and de */}
                  {t(`ceBlock.states.nameHints.${hint.name}` as never)}
                </p>
              )}
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
          // Edits from the details, applied to the look as it is when they run
          const editLook = (edit: LookEdit, key: string) =>
            editStates((s) => {
              const current = statesMap(s, 'appearances');
              const before = current[name];
              return {
                ...s,
                appearances: { ...current, [name]: edit(isPlainObject(before) ? (before as ConfigObject) : {}) } as ConfigObject,
              };
            }, `${key}-${i}`);
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
            <div key={i} className="flex flex-col gap-1.5">
              <div className="grid grid-cols-[1fr_1fr_1.5fr_4.5rem_4.5rem_auto] items-center gap-1.5">
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
                <LookStateInput look={look} setLook={editLook} />
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
              <CollapsibleSection title={t('ceBlock.states.details')}>
                <LookDetails look={look} setLook={editLook} />
              </CollapsibleSection>
            </div>
          );
        })}
      </StatesTable>

      <StatesTable title={t('ceBlock.states.variants')} help={t('ceBlock.states.variantsHelp')} onAdd={addVariant}>
        {Object.entries(variants).map(([key, value], i) => {
          const variant = isPlainObject(value) ? value : {};
          const appearance = typeof variant.appearance === 'string' ? variant.appearance : '';
          return (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="grid grid-cols-[1.5fr_1fr_auto] items-center gap-1.5">
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
                <IconButton
                  label={tCommon('remove')}
                  size="icon-xs"
                  variant="ghost-destructive"
                  onClick={() => setMap('variants', withoutKey(variants, key))}
                >
                  <Trash2 />
                </IconButton>
              </div>
              <VariantSettings item={item} variantKey={key} />
            </div>
          );
        })}
      </StatesTable>

      <FixedIdInput value={states.id} onChange={(id) => editStates((s) => withFixedId(s, id), 'states-id')} />

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
