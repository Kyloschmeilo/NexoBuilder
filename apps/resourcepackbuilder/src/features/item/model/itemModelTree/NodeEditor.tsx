/**
 * The card of the selected node of the item model tree, beside the outline. The header names the node (its slot, its
 * type with icon and help, the type id in the key rail, the docs link) and has a `⋯` menu (move, copy YAML, remove).
 * The body edits what belongs to the node: the key of its slot in the parent (a case's `when`, an entry's
 * `threshold`), its type, its own keys, the property it reads with that property's keys, its special model, the rows
 * of its children (cases, entries, models, branches and the fallback, which open the child), its tints and its
 * transformation.
 */
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowDown, ArrowUp, ChevronRight, CircleAlert, Copy, Ellipsis, Plus, Trash2, TriangleAlert } from 'lucide-react';
import {
  type ConfigObject,
  type ConfigValue,
  formatWhen,
  fullId,
  isSimpleWhen,
  ITEM_MODEL_PROPERTIES,
  ITEM_MODEL_SPECIAL_TYPES,
  ITEM_MODEL_TYPES,
  type ItemModelNode,
  itemModelMessages,
  itemModelNodeAt,
  type ItemModelPath,
  itemModelProperty,
  itemModelSpecialType,
  itemModelTypeDef,
  type ItemModelType,
  modelNode,
  newSpecialModel,
  parseWhen,
  updateItemModelAt,
  withNodeType,
  withProperty,
  withSpecialType,
} from '@resourcepackbuilder/core/project';
import { toYaml } from '@resourcepackbuilder/core/yaml';
import { isPlainObject, MODEL_TOKEN } from '@resourcepackbuilder/utils';
import { cn } from '@resourcepackbuilder/ui/cn';
import { DocsLink, FieldGroup, FieldRow, Help, IconButton, MenuEntries, type MenuEntry, StatusPill, Tip } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@resourcepackbuilder/ui/components/dropdown-menu';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { NumberInput } from '../../../../components/editor/inputs/NumberInput';
import { TextInput } from '../../../../components/editor/inputs/TextInput';
import { useSchemaText } from '../../../../components/useSchemaText';
import { useOpenProject } from '../../../../store/project';
import { NodeBlock } from './NodeBlock';
import { NodeIcon, NodeValue, useNodeSummary, useSlotLabel, useTypeLabel } from './nodeLabels';
import { ParamField, ParamList, YamlValue } from './ParamField';
import { TintsEditor } from './TintsEditor';
import { TransformationEditor } from './TransformationEditor';
import { moveNodeAt, nodeSlot, pathKey, removeNodeAt, slotListLength } from './treePaths';
import { useItemModelDocs } from './useItemModelDocs';
import type { NodeIssue } from './useNodeIssues';

/** Reports the changed node; `historyKey` joins quick edits of one field into one undo step. */
export type NodeChange = (next: ItemModelNode, historyKey?: string) => void;

interface NodeEditorProps {
  /** The root node of the tree. */
  root: ItemModelNode;
  /** Path of the node this card edits. */
  path: ItemModelPath;
  /** Reports the changed tree. */
  onChange: (root: ItemModelNode, historyKey?: string) => void;
  /** Selects another node (a child, or the parent after a removal). */
  onSelect: (path: ItemModelPath) => void;
  /** The export's problems with this node. */
  issues?: NodeIssue[];
}

/** Sets or removes one key of an object. */
function withKey<T extends ConfigObject>(object: T, key: string, value: ConfigValue | undefined): T {
  const next = { ...object } as ConfigObject;
  if (value === undefined) delete next[key];
  else next[key] = value;
  return next as T;
}

/** A list of the node (models, cases, entries) or an empty one. */
const listOf = (node: ItemModelNode, key: string): ConfigValue[] => (Array.isArray(node[key]) ? (node[key] as ConfigValue[]) : []);

/** The ghost "add" button of a block heading. */
function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="ghost" size="sm" className="text-primary hover:text-primary" onClick={onClick}>
      <Plus /> {label}
    </Button>
  );
}

/** A row that opens a child node: its slot, type and value, with move and remove buttons on hover. */
function ChildRow({
  root,
  path,
  onSelect,
  actions,
}: {
  root: ItemModelNode;
  path: ItemModelPath;
  onSelect: (path: ItemModelPath) => void;
  actions?: ReactNode;
}) {
  const t = useTranslations('item');
  const slotLabel = useSlotLabel();
  const typeLabel = useTypeLabel();
  const summary = useNodeSummary();
  const child = itemModelNodeAt(root, path);
  if (!child) return null;
  const label = slotLabel(root, path);
  const value = summary(child);
  return (
    <li data-slot="child-row" className="group/child flex min-h-9 min-w-0 items-center gap-1 rounded-md pr-1 hover:bg-muted">
      <button
        type="button"
        aria-label={t('modelTree.open', { name: label })}
        className="flex min-h-9 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md px-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => onSelect(path)}
      >
        <NodeIcon type={child.type} size="sm" />
        <span className="max-w-[45%] flex-none truncate text-label text-text-muted">{label}</span>
        <span className="min-w-0 flex-1 truncate text-label font-medium text-text">
          {typeLabel(child.type)}
          <NodeValue value={value} />
        </span>
        <ChevronRight className="size-3.5 flex-none text-text-faint" aria-hidden />
      </button>
      {actions && (
        <div className="flex w-18 flex-none items-center justify-end opacity-0 transition-opacity group-focus-within/child:opacity-100 group-hover/child:opacity-100">
          {actions}
        </div>
      )}
    </li>
  );
}

/** Move and remove buttons of a child row. */
function ChildActions({
  root,
  path,
  onChange,
}: {
  root: ItemModelNode;
  path: ItemModelPath;
  onChange: (root: ItemModelNode, historyKey?: string) => void;
}) {
  const t = useTranslations('schema');
  const slot = nodeSlot(path);
  const count = slotListLength(root, slot);
  return (
    <>
      {'list' in slot && (
        <>
          <IconButton
            label={t('itemModel.ui.moveUp')}
            size="icon-xs"
            disabled={slot.index === 0}
            onClick={() => onChange(moveNodeAt(root, path, slot.index - 1).root)}
          >
            <ArrowUp />
          </IconButton>
          <IconButton
            label={t('itemModel.ui.moveDown')}
            size="icon-xs"
            disabled={slot.index === count - 1}
            onClick={() => onChange(moveNodeAt(root, path, slot.index + 1).root)}
          >
            <ArrowDown />
          </IconButton>
        </>
      )}
      <IconButton
        label={t('itemModel.ui.removeEntry')}
        size="icon-xs"
        variant="ghost-destructive"
        onClick={() => onChange(removeNodeAt(root, path))}
      >
        <Trash2 />
      </IconButton>
    </>
  );
}

/** The fields of the node's slot that live in the parent: a case's `when`, an entry's `threshold`. */
function SlotFields({ root, path, onChange }: { root: ItemModelNode; path: ItemModelPath; onChange: NodeEditorProps['onChange'] }) {
  const t = useTranslations('schema');
  const slot = nodeSlot(path);
  if (slot.kind !== 'case' && slot.kind !== 'entry') return null;
  const parent = itemModelNodeAt(root, slot.parent);
  const list = parent ? listOf(parent, slot.list) : [];
  const entry = isPlainObject(list[slot.index]) ? (list[slot.index] as ConfigObject) : {};
  const setKey = (key: 'when' | 'threshold', value: ConfigValue | undefined) =>
    onChange(
      updateItemModelAt(root, slot.entry, (old) => withKey(isPlainObject(old) ? (old as ConfigObject) : {}, key, value)),
      `${pathKey(slot.entry)}.${key}`,
    );
  const id = `${pathKey(path)}.slot`;
  if (slot.kind === 'entry') {
    const threshold = entry.threshold;
    return (
      <FieldRow label={t('itemModel.ui.threshold')} htmlFor={id} yamlKey="threshold">
        <NumberInput
          id={id}
          className="max-w-40"
          value={typeof threshold === 'number' || typeof threshold === 'string' ? threshold : undefined}
          label={t('itemModel.ui.threshold')}
          onChange={(next) => setKey('threshold', next)}
        />
      </FieldRow>
    );
  }
  const when = entry.when;
  const property = parent && typeof parent.property === 'string' ? itemModelProperty('select', parent.property) : undefined;
  return (
    <FieldRow label={t('itemModel.ui.when')} htmlFor={isSimpleWhen(when) ? id : undefined} yamlKey="when">
      {isSimpleWhen(when) ? (
        // Committed on Enter or blur, so commas and spaces can be typed; unchanged values keep their type
        <TextInput
          id={id}
          mono
          commitOnBlur
          value={formatWhen(when)}
          placeholder={t('itemModel.ui.whenPlaceholder')}
          suggestions={property?.values?.map((v) => ({ value: v, text: v }))}
          onChange={(next) => setKey('when', parseWhen(next ?? '', when))}
        />
      ) : (
        // Values a text field cannot show (component values that are objects) are edited as YAML
        <YamlValue id={id} value={when} onChange={(next) => setKey('when', next)} />
      )}
    </FieldRow>
  );
}

/** The property a condition, select or range dispatch reads, with its description and keys. */
function PropertyFields({ node, setNode, pathId }: { node: ItemModelNode; setNode: NodeChange; pathId: string }) {
  const t = useTranslations('schema');
  const tItem = useTranslations('item');
  const text = useSchemaText();
  const kind = itemModelTypeDef(node.type)?.property;
  if (!kind) return null;
  const property = typeof node.property === 'string' ? fullId(node.property) : '';
  const def = itemModelProperty(kind, property);
  const id = `${pathId}.property`;
  return (
    <>
      <FieldRow
        label={tItem('modelTree.property')}
        htmlFor={id}
        yamlKey="property"
        help={def ? text(itemModelMessages.property(kind, def.id)) : undefined}
        badges={def?.minVersion && <StatusPill tone="info" label={t('itemModel.ui.fromVersion', { version: def.minVersion })} />}
      >
        <NativeSelect
          id={id}
          size="sm"
          className="w-full"
          value={def ? def.id : ''}
          onChange={(e) => setNode(withProperty(node, kind, e.target.value))}
        >
          {!def && <NativeSelectOption value="">{property || t('itemModel.ui.unset')}</NativeSelectOption>}
          {ITEM_MODEL_PROPERTIES[kind].map((option) => (
            <NativeSelectOption key={option.id} value={option.id}>
              {option.id}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </FieldRow>
      {def && (
        <ParamList params={def.params} owner={node} update={(key, value) => setNode(withKey(node, key, value), `${pathId}.${key}`)} />
      )}
    </>
  );
}

/** The special model of a special node: its type and keys. */
function SpecialFields({ node, setNode, pathId }: { node: ItemModelNode; setNode: NodeChange; pathId: string }) {
  const t = useTranslations('schema');
  const text = useSchemaText();
  const special: ConfigObject = isPlainObject(node.model) ? (node.model as ConfigObject) : {};
  const id = typeof special.type === 'string' ? fullId(special.type) : '';
  const def = itemModelSpecialType(id);
  const setSpecial = (next: ConfigObject, key?: string) => setNode({ ...node, model: next }, key);
  const selectId = `${pathId}.special`;
  return (
    <>
      <FieldRow
        label={t('itemModel.ui.specialModel')}
        htmlFor={selectId}
        yamlKey="model.type"
        help={def ? text(itemModelMessages.special(def.id)) : undefined}
        badges={
          <>
            {def?.minVersion && <StatusPill tone="info" label={t('itemModel.ui.fromVersion', { version: def.minVersion })} />}
            {def?.removedIn && <StatusPill tone="warning" label={t('itemModel.ui.removedIn', { version: def.removedIn })} />}
          </>
        }
      >
        <NativeSelect
          id={selectId}
          size="sm"
          className="w-full"
          value={def ? def.id : ''}
          onChange={(e) => setSpecial(id ? withSpecialType(special, e.target.value) : newSpecialModel(e.target.value))}
        >
          {!def && <NativeSelectOption value="">{id || t('itemModel.ui.unset')}</NativeSelectOption>}
          {ITEM_MODEL_SPECIAL_TYPES.map((option) => (
            <NativeSelectOption key={option.id} value={option.id}>
              {option.id}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </FieldRow>
      {def && (
        <ParamList
          params={def.params}
          owner={special}
          update={(key, value) => setSpecial(withKey(special, key, value), `${pathId}.model.${key}`)}
        />
      )}
    </>
  );
}

/** The node's own keys (model, base, scale), with a shortcut to the item's own model for model references. */
function OwnKeys({ node, setNode, pathId }: { node: ItemModelNode; setNode: NodeChange; pathId: string }) {
  const t = useTranslations('schema');
  const def = itemModelTypeDef(node.type);
  if (!def || def.params.length === 0) return null;
  return (
    <>
      {def.params.map((param) => (
        <ParamField
          key={param.key}
          param={param}
          value={node[param.key]}
          onChange={(value) => setNode(withKey(node, param.key, value), `${pathId}.${param.key}`)}
        >
          {param.kind === 'resource' && node[param.key] !== MODEL_TOKEN && (
            <Button variant="ghost" size="sm" className="self-start" onClick={() => setNode(withKey(node, param.key, MODEL_TOKEN))}>
              {t('itemModel.ui.useMainModel')}
            </Button>
          )}
        </ParamField>
      ))}
    </>
  );
}

/** The rows of the node's children with the buttons that add more, by node type. */
function Children({ root, path, onChange, onSelect }: Omit<NodeEditorProps, 'issues'>) {
  const t = useTranslations('schema');
  const tItem = useTranslations('item');
  const node = itemModelNodeAt(root, path);
  if (!node) return null;
  const type = fullId(node.type);
  /** Adds a child with `update` and opens it. */
  const addChild = (next: ItemModelNode, childPath: ItemModelPath) => {
    onChange(updateItemModelAt(root, path, () => next));
    onSelect([...path, ...childPath]);
  };
  const row = (childPath: ItemModelPath) => {
    const full = [...path, ...childPath];
    return (
      <ChildRow
        key={pathKey(full)}
        root={root}
        path={full}
        onSelect={onSelect}
        actions={<ChildActions root={root} path={full} onChange={onChange} />}
      />
    );
  };
  const rows = (children: ReactNode[]) =>
    children.length > 0 ? (
      <ul className="m-0 flex list-none flex-col gap-px p-0">{children}</ul>
    ) : (
      <p className="m-0 text-meta text-text-muted">{tItem('modelTree.noChildren')}</p>
    );
  const fallback = () =>
    node.fallback === undefined ? (
      <div className="flex flex-wrap items-center gap-1">
        <AddButton label={t('itemModel.ui.addFallback')} onClick={() => addChild({ ...node, fallback: modelNode() }, ['fallback'])} />
        <Help>{t('itemModel.ui.noFallback')}</Help>
      </div>
    ) : (
      <ul className="m-0 flex list-none flex-col gap-px p-0">{row(['fallback'])}</ul>
    );

  switch (type) {
    case 'minecraft:composite': {
      const models = listOf(node, 'models');
      return (
        <NodeBlock
          title={t('itemModel.ui.models')}
          actions={
            <AddButton
              label={t('itemModel.ui.addModel')}
              onClick={() => addChild({ ...node, models: [...models, modelNode()] }, ['models', models.length])}
            />
          }
        >
          {rows(models.map((_, i) => row(['models', i])))}
        </NodeBlock>
      );
    }
    case 'minecraft:condition':
      return (
        <NodeBlock title={tItem('modelTree.branches')}>
          <ul className="m-0 flex list-none flex-col gap-px p-0">
            {(['on_true', 'on_false'] as const).map((branch) =>
              isPlainObject(node[branch]) ? (
                row([branch])
              ) : (
                <li key={branch}>
                  <AddButton
                    label={t(branch === 'on_true' ? 'itemModel.ui.onTrue' : 'itemModel.ui.onFalse')}
                    onClick={() => addChild({ ...node, [branch]: modelNode() }, [branch])}
                  />
                </li>
              ),
            )}
          </ul>
        </NodeBlock>
      );
    case 'minecraft:select': {
      const cases = listOf(node, 'cases');
      return (
        <NodeBlock
          title={t('itemModel.ui.cases')}
          actions={
            <AddButton
              label={t('itemModel.ui.addCase')}
              onClick={() => addChild({ ...node, cases: [...cases, { when: '', model: modelNode() }] }, ['cases', cases.length, 'model'])}
            />
          }
        >
          {rows(cases.map((_, i) => row(['cases', i, 'model'])))}
          {fallback()}
        </NodeBlock>
      );
    }
    case 'minecraft:range_dispatch': {
      const entries = listOf(node, 'entries');
      const last = entries.at(-1);
      const threshold = isPlainObject(last) && typeof last.threshold === 'number' ? last.threshold + 1 : 0;
      return (
        <NodeBlock
          title={t('itemModel.ui.entries')}
          actions={
            <AddButton
              label={t('itemModel.ui.addEntry')}
              onClick={() =>
                addChild({ ...node, entries: [...entries, { threshold, model: modelNode() }] }, ['entries', entries.length, 'model'])
              }
            />
          }
        >
          {rows(entries.map((_, i) => row(['entries', i, 'model'])))}
          {fallback()}
        </NodeBlock>
      );
    }
    default:
      return null;
  }
}

/** The `⋯` menu of the node: move within its list, copy its YAML, remove it (not the root). */
function NodeMenu({ root, path, onChange, onSelect, name }: Omit<NodeEditorProps, 'issues'> & { name: string }) {
  const t = useTranslations('schema');
  const tItem = useTranslations('item');
  const tFeature = useTranslations('editor.feature');
  const node = itemModelNodeAt(root, path);
  const slot = nodeSlot(path);
  const count = slotListLength(root, slot);
  const move = (to: number) => {
    const moved = moveNodeAt(root, path, to);
    onChange(moved.root);
    onSelect(moved.path);
  };
  const entries: MenuEntry[] = [
    ...('list' in slot
      ? ([
          { icon: <ArrowUp />, label: t('itemModel.ui.moveUp'), disabled: slot.index === 0, onSelect: () => move(slot.index - 1) },
          {
            icon: <ArrowDown />,
            label: t('itemModel.ui.moveDown'),
            disabled: slot.index >= count - 1,
            onSelect: () => move(slot.index + 1),
          },
        ] satisfies MenuEntry[])
      : []),
    { icon: <Copy />, label: tFeature('copyYaml'), onSelect: () => void navigator.clipboard?.writeText(toYaml(node ?? {})) },
    ...(slot.kind === 'root'
      ? []
      : ([
          'separator',
          {
            icon: <Trash2 />,
            label: tItem('modelTree.removeNode'),
            destructive: true,
            onSelect: () => {
              onChange(removeNodeAt(root, path));
              onSelect(slot.parent);
            },
          },
        ] satisfies MenuEntry[])),
  ];
  return (
    <DropdownMenu>
      <Tip label={tFeature('actions', { name })}>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={tFeature('actions', { name })} />}>
          <Ellipsis />
        </DropdownMenuTrigger>
      </Tip>
      <DropdownMenuContent align="end" className="w-auto min-w-44">
        <MenuEntries entries={entries} kind="dropdown" />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The card of one node of the tree. */
export function NodeEditor({ root, path, onChange, onSelect, issues = [] }: NodeEditorProps) {
  const t = useTranslations('schema');
  const text = useSchemaText();
  const docs = useItemModelDocs();
  const target = useOpenProject().target;
  const slotLabel = useSlotLabel();
  const typeLabel = useTypeLabel();
  const node = itemModelNodeAt(root, path);
  if (!node) return null;
  const type = fullId(node.type);
  const def = itemModelTypeDef(type);
  const pathId = pathKey(path);
  const label = typeLabel(node.type);
  const setNode: NodeChange = (next, key) =>
    onChange(
      updateItemModelAt(root, path, () => next),
      key,
    );
  const typeId = `${pathId}.type`;
  return (
    <div
      data-slot="item-model-node"
      data-type={type}
      className="@container/node flex min-w-0 flex-col rounded-xl border border-line bg-surface"
    >
      <header className="flex min-h-12 min-w-0 items-center gap-2 border-b border-line px-3 py-1.5">
        <NodeIcon type={node.type} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-micro text-text-muted">{slotLabel(root, path)}</span>
          <span className="flex min-w-0 items-center gap-1.5">
            <h3 className="m-0 truncate text-label font-semibold text-text">{label}</h3>
            {def && <Help>{text(itemModelMessages.typeDescription(type))}</Help>}
          </span>
        </div>
        <code data-slot="yaml-key" className="hidden max-w-48 flex-none truncate font-mono text-micro text-text-faint @md/node:block">
          {node.type}
        </code>
        {def && <DocsLink url={docs(type)} target={target} label={label} />}
        <NodeMenu root={root} path={path} onChange={onChange} onSelect={onSelect} name={label} />
      </header>
      <div className="flex min-w-0 flex-col gap-3 p-3">
        {issues.length > 0 && (
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {issues.map((issue, i) => {
              const Icon = issue.level === 'error' ? CircleAlert : TriangleAlert;
              return (
                <li key={i} className={cn('flex items-start gap-1.5 text-meta', issue.level === 'error' ? 'text-danger' : 'text-warning')}>
                  <Icon className="mt-0.5 size-3.5 flex-none" aria-hidden />
                  <span>{issue.message}</span>
                </li>
              );
            })}
          </ul>
        )}
        <FieldGroup>
          <SlotFields root={root} path={path} onChange={onChange} />
          <FieldRow
            label={t('itemModel.ui.type')}
            htmlFor={typeId}
            yamlKey="type"
            warning={def ? undefined : t('itemModel.ui.unknownType')}
          >
            <NativeSelect
              id={typeId}
              size="sm"
              className="w-full"
              value={def ? type : ''}
              onChange={(e) => setNode(withNodeType(node, e.target.value as ItemModelType))}
            >
              {!def && <NativeSelectOption value="">{node.type}</NativeSelectOption>}
              {ITEM_MODEL_TYPES.map((option) => (
                <NativeSelectOption key={option} value={option}>
                  {text(itemModelMessages.typeLabel(option))}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FieldRow>
          <OwnKeys node={node} setNode={setNode} pathId={pathId} />
          <PropertyFields node={node} setNode={setNode} pathId={pathId} />
          {type === 'minecraft:special' && <SpecialFields node={node} setNode={setNode} pathId={pathId} />}
        </FieldGroup>
        <Children root={root} path={path} onChange={onChange} onSelect={onSelect} />
        {def?.tints && <TintsEditor node={node} onChange={setNode} pathKey={pathId} />}
        {def?.transformation && <TransformationEditor node={node} onChange={setNode} pathKey={pathId} />}
      </div>
    </div>
  );
}
