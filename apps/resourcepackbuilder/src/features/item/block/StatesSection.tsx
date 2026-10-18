/**
 * The states of a CraftEngine block (UX §4): how the block shows in the world. A block has one state (a free vanilla
 * state of an `auto_state` group, or an exact vanilla state), states from a template that a preset set up (only its
 * arguments are edited), or states written out: properties, appearances and the variants that map property values to
 * an appearance and override settings. Each of these is a compact table; the rarely used keys of an appearance, the
 * settings of a variant and the entity renderer open in a dialog, so every row stays one line.
 */
import { type ReactNode, useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Settings2, SlidersHorizontal, Trash2 } from 'lucide-react';
import {
  appearanceStateSource,
  autoStateGroupOf,
  blockBehaviorForm,
  blockBehaviorTypes,
  blockStates,
  CE_APPEARANCE_MODEL_FIELD,
  CE_APPEARANCE_MODELS_FIELD,
  CE_AUTO_STATE_GROUP_IDS,
  CE_DEFAULT_AUTO_STATE,
  CE_DOCS,
  CE_PLACEMENT_PROPERTY_NAMES,
  CE_PROPERTY_TYPES,
  canonicalPropertyType,
  internalStateCount,
  newBlockProperty,
  parseVariantKey,
  propertyNameHint,
  propertyValues,
  rendererElements,
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
import { activeProperties, emptyPropertyValue, getPropertyValue, propertyById } from '@resourcepackbuilder/core/form';
import { type ConfigObject, type ConfigValue, type Item, toConfigValue } from '@resourcepackbuilder/core/project';
import { isPlainObject } from '@resourcepackbuilder/utils';
import { EmptyHint, FieldGroup, FieldRow, IconButton, MoreOptions, Panel, Section, StatusPill } from '@resourcepackbuilder/ui';
import { cn } from '@resourcepackbuilder/ui/cn';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { setItemProperty, updateCraftEngineBlock } from '../../../commands/items';
import { FieldRenderer } from '../../../components/editor';
import { ObjectFields } from '../../../components/editor/editors/ObjectEditor';
import { FeatureList, featureExpansionKey, PropertyFeatureRow } from '../../../components/features';
import { useOpenProject } from '../../../store/project';
import { useProjectForm } from '../properties/useProjectForm';
import { BlockRendererSection } from './BlockRendererEditor';
import { BlockSettingsRows, useBlockSettings } from './BlockSettingsList';
import { DetailDialog } from './DetailDialog';

/** The section's anchor (SectionNav). */
export const BLOCK_STATES_SECTION_ID = 'block-states';

type StatesEdit = (states: ConfigObject) => ConfigObject;
type LookEdit = (look: ConfigObject) => ConfigObject;
type ItemTranslator = ReturnType<typeof useTranslations<'item'>>;
const ROTATIONS = ['0', '90', '180', '270'];
/** The form group of the template arguments (`block.states.arguments.*`) */
const BLOCK_BEHAVIOR_GROUP = 'blockBehavior';
const ARGUMENT_PREFIX = 'block.states.arguments.';

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
      size="sm"
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
        className="h-7 font-mono"
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
    <FieldGroup>
      <FieldRow
        label={t('ceBlock.states.source')}
        htmlFor={sourceId}
        help={source.kind === 'state' ? t('ceBlock.states.exactStateHelp') : t('ceBlock.states.sourceAutoHelp')}
      >
        <NativeSelect
          id={sourceId}
          className="w-full"
          size="sm"
          value={source.kind}
          onChange={(e) => setLook((l) => withExactState(l, e.target.value === 'state' ? '' : null), 'look-source')}
        >
          <NativeSelectOption value="auto">{t('ceBlock.states.sourceAuto')}</NativeSelectOption>
          <NativeSelectOption value="state">{t('ceBlock.states.sourceState')}</NativeSelectOption>
        </NativeSelect>
      </FieldRow>
      {source.kind === 'auto' && (
        <FieldRow label={t('ceBlock.states.sharedId')} htmlFor={sharedId} help={t('ceBlock.states.sharedIdHelp')} yamlKey="auto_state.id">
          <Input
            id={sharedId}
            className="h-7"
            placeholder={t('ceBlock.states.sharedIdPlaceholder')}
            value={source.id ?? ''}
            onChange={(e) => setLook((l) => withAutoStateId(l, e.target.value), 'look-shared')}
          />
        </FieldRow>
      )}
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
    </FieldGroup>
  );
}

/** The fixed internal id of a state or of the states (CraftEngine picks free ids without one). */
function FixedIdRow({ value, onChange }: { value: unknown; onChange: (id: number | undefined) => void }) {
  const t = useTranslations('item');
  const id = useId();
  return (
    <FieldRow label={t('ceBlock.states.fixedId')} htmlFor={id} help={t('ceBlock.states.fixedIdHelp')} yamlKey="id">
      <Input
        id={id}
        className="h-7 w-32 font-mono"
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
    </FieldRow>
  );
}

/** A small heading above a table: its title, the number of rows and an add button. */
function TableHeading({ title, count, onAdd, addLabel }: { title: string; count: number; onAdd: () => void; addLabel: string }) {
  return (
    <div className="flex min-h-7.5 items-center gap-2">
      <h3 className="m-0 text-label font-semibold text-text">{title}</h3>
      {count > 0 && <span className="text-meta text-text-muted">{count}</span>}
      <Button size="sm" variant="ghost" className="ml-auto text-primary hover:text-primary" onClick={onAdd}>
        <Plus /> {addLabel}
      </Button>
    </div>
  );
}

/** One table of the states: one muted line of help, then column titles over rows separated by hairlines. */
function StatesTable({
  columns,
  header,
  help,
  children,
  label,
}: {
  /** The grid columns of the header and every row */
  columns: string;
  header: string[];
  help: string;
  children: ReactNode[];
  label: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="m-0 text-meta text-text-muted">{help}</p>
      {children.length > 0 && (
        <Panel role="table" aria-label={label} className="divide-y divide-line overflow-hidden">
          <div role="row" className={cn('grid items-center gap-1.5 bg-surface-sunken px-2 py-1 text-meta text-text-muted', columns)}>
            {header.map((cell, i) => (
              <span role="columnheader" key={i} className="truncate">
                {cell}
              </span>
            ))}
          </div>
          {children}
        </Panel>
      )}
    </div>
  );
}

/** The row of a table: the grid of cells, and an optional note below it. */
function TableRow({ columns, children, note }: { columns: string; children: ReactNode; note?: ReactNode }) {
  return (
    <div role="row" className="flex flex-col gap-1 px-2 py-1.5">
      <div className={cn('grid items-center gap-1.5', columns)}>{children}</div>
      {note}
    </div>
  );
}

/** The template arguments of the block's states (`block.states.arguments.*`) as feature rows. */
function TemplateArguments({ item, block }: { item: Item; block: Record<string, unknown> }) {
  const schema = useProjectForm();
  const version = useOpenProject().settings.minecraftVersion;
  // The arguments the presets of the block's behaviors use, and any other argument it has set
  const ids = new Set([
    ...blockBehaviorTypes(block).flatMap((type) => blockBehaviorForm(type)?.properties ?? []),
    ...activeProperties(schema, item, BLOCK_BEHAVIOR_GROUP)
      .filter((def) => def.id.startsWith(ARGUMENT_PREFIX))
      .map((def) => def.id),
  ]);
  const defs = [...ids].flatMap((id) => {
    const def = propertyById(schema, id);
    return def ? [def] : [];
  });
  if (defs.length === 0) return null;
  return (
    <FeatureList>
      {defs.map((def) => (
        <PropertyFeatureRow
          key={def.id}
          def={def}
          value={getPropertyValue(item, def)}
          version={version}
          expansionKey={featureExpansionKey(`${item.id}/states`, def.id)}
          onChange={(value) => setItemProperty(item.id, def, toConfigValue(value) ?? emptyPropertyValue(def))}
          onRemove={() => setItemProperty(item.id, def, undefined)}
        />
      ))}
    </FeatureList>
  );
}

/** The entity renderer as one row: how many elements it shows, and a dialog to edit it. */
function RendererRow({
  item,
  looks,
  edit,
}: {
  item: Item;
  looks: Array<[string, Record<string, unknown>]>;
  edit: (name: string, next: (state: ConfigObject) => ConfigObject, historyKey?: string) => void;
}) {
  const t = useTranslations('item');
  const [isOpen, setOpen] = useState(false);
  const count = looks.reduce((sum, [, look]) => sum + rendererElements(look).length, 0);
  return (
    <FieldRow
      label={t('ceBlock.renderer.title')}
      help={t('ceBlock.renderer.help')}
      docs={{ url: CE_DOCS.entityRenderer, target: 'craftengine' }}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-label text-text-muted">
          {count > 0 ? t('block.states.rendererElements', { count }) : t('block.states.rendererNone')}
        </span>
        <Button size="sm" variant="outline" className="ml-auto" onClick={() => setOpen(true)}>
          <SlidersHorizontal /> {t('block.states.editRenderer')}
        </Button>
      </div>
      <DetailDialog
        open={isOpen}
        onOpenChange={setOpen}
        title={t('ceBlock.renderer.title')}
        description={t('ceBlock.renderer.help')}
        size="wide"
      >
        <BlockRendererSection item={item} looks={looks} edit={edit} />
      </DetailDialog>
    </FieldRow>
  );
}

/** The summary of the states shown next to the section title. */
function statesSummary(block: Record<string, unknown>, t: ItemTranslator): string {
  const states = blockStates(block);
  if (!states) return t('block.states.single');
  const template = statesTemplate(states);
  if (template) return t('block.states.templateSummary', { template: template.replace(/^default:block_state\//, '') });
  const count = internalStateCount(statesMap(states, 'properties'));
  return count === null ? t('block.states.multiUnknown') : t('block.states.multiSummary', { count });
}

/**
 * The block's states: one state with its `auto_state` group, the arguments of a template, or several states written
 * out (properties, appearances and the variants that map property values to an appearance and override settings).
 */
export function StatesSection({ item, block }: { item: Item; block: Record<string, unknown> }) {
  const t = useTranslations('item');
  const selectId = useId();
  const states = blockStates(block);
  const editBlock = (next: (block: ConfigObject) => ConfigObject, historyKey?: string) => updateCraftEngineBlock(item.id, next, historyKey);
  const template = states && statesTemplate(states);

  let body: ReactNode;
  if (!states) {
    const state = isPlainObject(block.state) ? block.state : {};
    const editState = (next: LookEdit, historyKey?: string) =>
      editBlock((b) => ({ ...b, state: next(isPlainObject(b.state) ? (b.state as ConfigObject) : {}) }), historyKey);
    body = (
      <FieldGroup>
        <FieldRow label={t('ceBlock.autoState')} htmlFor={selectId} help={t('ceBlock.autoStateHelp')} yamlKey="state.auto_state">
          <LookStateInput id={selectId} look={state} setLook={(edit, key) => editState(edit, `state-${key}`)} />
        </FieldRow>
        <RendererRow item={item} looks={[['state', state]]} edit={(_name, next, historyKey) => editState(next, historyKey)} />
        <MoreOptions hasValue={state.id !== undefined || isPlainObject(state.model) || state.models !== undefined}>
          <FieldGroup>
            <LookDetails look={state} setLook={(edit, key) => editState(edit, `state-${key}`)} />
            <FixedIdRow value={state.id} onChange={(id) => editState((s) => withFixedId(s, id), 'state-id')} />
          </FieldGroup>
        </MoreOptions>
        <div>
          <Button size="sm" variant="outline" onClick={() => editBlock(toMultiState)}>
            {t('ceBlock.states.toMulti')}
          </Button>
        </div>
      </FieldGroup>
    );
  } else if (template) {
    body = (
      <div className="flex flex-col gap-3">
        <p className="m-0 text-meta text-text-muted">{t('ceBlock.states.template', { template })}</p>
        <TemplateArguments item={item} block={block} />
      </div>
    );
  } else {
    const editStates = (next: StatesEdit, historyKey?: string) =>
      editBlock((b) => ({ ...b, states: next(isPlainObject(b.states) ? (b.states as ConfigObject) : {}) }), historyKey);
    body = (
      <MultiStateEditor
        item={item}
        states={states}
        editStates={editStates}
        toSingle={() => editBlock((b) => toSingleState(b, { auto_state: CE_DEFAULT_AUTO_STATE }))}
      />
    );
  }

  return (
    <Section
      id={BLOCK_STATES_SECTION_ID}
      title={t('block.states.title')}
      description={t('ceBlock.model')}
      meta={<StatusPill tone="muted" label={statesSummary(block, t)} />}
    >
      {body}
    </Section>
  );
}

/** The settings a variant overrides, in a dialog: the block settings scoped to the variant. */
function VariantSettingsButton({ item, variantKey }: { item: Item; variantKey: string }) {
  const t = useTranslations('item');
  const form = useProjectForm();
  const [isOpen, setOpen] = useState(false);
  const schema = { ...form, properties: variantSettingsProperties(variantKey) };
  const scope = `variant:${variantKey}`;
  const settings = useBlockSettings(item, schema, scope);
  const count = settings.active.length;
  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className={cn('min-w-0 justify-start', count > 0 ? 'text-text' : 'text-text-muted')}
        onClick={() => setOpen(true)}
        aria-label={t('block.states.variantSettingsOf', { variant: variantKey })}
      >
        <Settings2 />{' '}
        <span className="truncate">{count > 0 ? t('block.states.settingsCount', { count }) : t('block.states.noSettings')}</span>
      </Button>
      <DetailDialog
        open={isOpen}
        onOpenChange={setOpen}
        title={t('block.states.variantSettingsOf', { variant: variantKey })}
        description={t('ceBlock.states.variantSettingsHelp')}
      >
        <div className="flex flex-col gap-3">
          <div className="flex justify-end">{settings.button}</div>
          <BlockSettingsRows
            item={item}
            active={settings.active}
            scope={scope}
            version={settings.version}
            empty={t('block.states.variantSettingsEmpty')}
            onAdd={settings.open}
          />
        </div>
        {settings.dialog}
      </DetailDialog>
    </>
  );
}

/** The keys of an appearance the row leaves out, in a dialog. */
function AppearanceDetailsButton({
  name,
  look,
  setLook,
}: {
  name: string;
  look: Record<string, unknown>;
  setLook: (edit: LookEdit, key: string) => void;
}) {
  const t = useTranslations('item');
  const [isOpen, setOpen] = useState(false);
  return (
    <>
      <IconButton label={t('block.states.appearanceDetails', { name })} size="icon-xs" variant="ghost" onClick={() => setOpen(true)}>
        <SlidersHorizontal />
      </IconButton>
      <DetailDialog open={isOpen} onOpenChange={setOpen} title={t('block.states.appearanceDetails', { name })}>
        <LookDetails look={look} setLook={setLook} />
      </DetailDialog>
    </>
  );
}

const PROPERTY_COLUMNS = 'grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1.2fr)_1.75rem]';
const APPEARANCE_COLUMNS = 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)_4.5rem_4.5rem_3.5rem]';
const VARIANT_COLUMNS = 'grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_1.75rem]';

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
  const addAppearance = () =>
    setMap('appearances', {
      ...(appearances as ConfigObject),
      [freeName(appearances, 'look')]: { auto_state: CE_DEFAULT_AUTO_STATE },
    });
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
  const editAppearance = (name: string, edit: LookEdit, historyKey?: string) =>
    editStates((s) => {
      const current = statesMap(s, 'appearances');
      const before = current[name];
      return { ...s, appearances: { ...current, [name]: edit(isPlainObject(before) ? (before as ConfigObject) : {}) } as ConfigObject };
    }, historyKey);

  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-meta text-text-muted">
        {count === null
          ? t('ceBlock.states.countUnknown')
          : t('ceBlock.states.count', { count, appearances: Object.keys(appearances).length })}
      </p>

      <div>
        <TableHeading
          title={t('ceBlock.states.properties')}
          count={Object.keys(properties).length}
          onAdd={addProperty}
          addLabel={t('block.states.addProperty')}
        />
        <datalist id={namesId}>
          {CE_PLACEMENT_PROPERTY_NAMES.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <StatesTable
          label={t('ceBlock.states.properties')}
          help={t('ceBlock.states.propertiesHelp')}
          columns={PROPERTY_COLUMNS}
          header={[
            t('ceBlock.states.propertyName'),
            t('ceBlock.states.propertyType'),
            t('ceBlock.states.propertyDefault'),
            t('block.states.propertyValuesColumn'),
            '',
          ]}
        >
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
              <TableRow
                key={i}
                columns={PROPERTY_COLUMNS}
                note={
                  hint && (
                    <p className={cn('m-0 text-meta', hint.fits ? 'text-text-muted' : 'text-danger')}>
                      {/* The names come from core at runtime; a test checks each has a hint in en and de */}
                      {t(`ceBlock.states.nameHints.${hint.name}` as never)}
                    </p>
                  )
                }
              >
                <Input
                  className="h-7 font-mono"
                  list={namesId}
                  aria-label={t('ceBlock.states.propertyName')}
                  value={name}
                  onChange={(e) => setMap('properties', renameKey(properties, name, e.target.value), `prop-name-${i}`)}
                />
                <NativeSelect
                  aria-label={t('ceBlock.states.propertyType')}
                  className="w-full"
                  size="sm"
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
                  className="h-7 font-mono"
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
                  <span className="truncate px-1 font-mono text-meta text-text-faint">true, false</span>
                ) : (
                  <Input
                    className="h-7 font-mono"
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
              </TableRow>
            );
          })}
        </StatesTable>
      </div>

      <div>
        <TableHeading
          title={t('ceBlock.states.appearances')}
          count={Object.keys(appearances).length}
          onAdd={addAppearance}
          addLabel={t('block.states.addAppearance')}
        />
        <StatesTable
          label={t('ceBlock.states.appearances')}
          help={t('ceBlock.states.appearancesHelp')}
          columns={APPEARANCE_COLUMNS}
          header={[
            t('ceBlock.states.appearanceName'),
            t('ceBlock.states.source'),
            t('ceBlock.states.appearanceModel'),
            t('block.states.rotationXColumn'),
            t('block.states.rotationYColumn'),
            '',
          ]}
        >
          {Object.entries(appearances).map(([name, value], i) => {
            const look = isPlainObject(value) ? value : {};
            const model = isPlainObject(look.model) ? look.model : {};
            const setLook = (next: Record<string, unknown>, key: string) =>
              setMap('appearances', { ...(appearances as ConfigObject), [name]: next as ConfigObject }, key);
            // Edits from the details, applied to the look as it is when they run
            const editLook = (edit: LookEdit, key: string) => editAppearance(name, edit, `${key}-${i}`);
            const setModel = (key: string, entry: ConfigValue | undefined, historyKey: string) => {
              const nextModel = entry === undefined ? withoutKey(model, key) : { ...model, [key]: entry };
              setLook(Object.keys(nextModel).length > 0 ? { ...look, model: nextModel } : withoutKey(look, 'model'), historyKey);
            };
            const rotation = (axis: 'x' | 'y') => (
              <NativeSelect
                aria-label={t(axis === 'x' ? 'ceBlock.states.rotationX' : 'ceBlock.states.rotationY')}
                className="w-full"
                size="sm"
                value={String(model[axis] ?? 0)}
                onChange={(e) => setModel(axis, e.target.value === '0' ? undefined : Number(e.target.value), `look-${axis}-${i}`)}
              >
                {ROTATIONS.map((r) => (
                  <NativeSelectOption key={r} value={r}>
                    {`${r}°`}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            );
            return (
              <TableRow key={i} columns={APPEARANCE_COLUMNS}>
                <Input
                  className="h-7 font-mono"
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
                  className="h-7 font-mono"
                  aria-label={t('ceBlock.states.appearanceModel')}
                  placeholder={t('ceBlock.states.modelPlaceholder')}
                  value={typeof model.path === 'string' ? model.path : ''}
                  onChange={(e) => setModel('path', e.target.value.trim() === '' ? undefined : e.target.value, `look-path-${i}`)}
                />
                {rotation('x')}
                {rotation('y')}
                <div className="flex items-center">
                  <AppearanceDetailsButton name={name} look={look} setLook={editLook} />
                  <IconButton
                    label={tCommon('remove')}
                    size="icon-xs"
                    variant="ghost-destructive"
                    onClick={() => setMap('appearances', withoutKey(appearances, name))}
                  >
                    <Trash2 />
                  </IconButton>
                </div>
              </TableRow>
            );
          })}
        </StatesTable>
      </div>

      <div>
        <TableHeading
          title={t('ceBlock.states.variants')}
          count={Object.keys(variants).length}
          onAdd={addVariant}
          addLabel={t('block.states.addVariant')}
        />
        <StatesTable
          label={t('ceBlock.states.variants')}
          help={t('ceBlock.states.variantsHelp')}
          columns={VARIANT_COLUMNS}
          header={[t('ceBlock.states.variantKey'), t('ceBlock.states.variantAppearance'), t('block.states.settingsColumn'), '']}
        >
          {Object.entries(variants).map(([key, value], i) => {
            const variant = isPlainObject(value) ? value : {};
            const appearance = typeof variant.appearance === 'string' ? variant.appearance : '';
            return (
              <TableRow key={i} columns={VARIANT_COLUMNS}>
                <Input
                  className="h-7 font-mono"
                  aria-label={t('ceBlock.states.variantKey')}
                  aria-invalid={parseVariantKey(key) === null}
                  value={key}
                  onChange={(e) => setMap('variants', renameKey(variants, key, e.target.value), `variant-key-${i}`)}
                />
                <NativeSelect
                  aria-label={t('ceBlock.states.variantAppearance')}
                  className="w-full"
                  size="sm"
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
                <VariantSettingsButton item={item} variantKey={key} />
                <IconButton
                  label={tCommon('remove')}
                  size="icon-xs"
                  variant="ghost-destructive"
                  onClick={() => setMap('variants', withoutKey(variants, key))}
                >
                  <Trash2 />
                </IconButton>
              </TableRow>
            );
          })}
        </StatesTable>
        {Object.keys(variants).length === 0 && <EmptyHint>{t('block.states.noVariants')}</EmptyHint>}
      </div>

      <FieldGroup>
        <RendererRow
          item={item}
          looks={Object.entries(appearances).map(([name, value]) => [name, isPlainObject(value) ? value : {}])}
          edit={(name, next, historyKey) => editAppearance(name, next, historyKey)}
        />
        <MoreOptions hasValue={states.id !== undefined}>
          <FixedIdRow value={states.id} onChange={(id) => editStates((s) => withFixedId(s, id), 'states-id')} />
        </MoreOptions>
      </FieldGroup>

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
