/**
 * One node of the item model tree and, recursively, its children: its type, its own keys, the property it reads with
 * that property's keys, and per type the composite's models, the condition's branches, the select's cases, the range
 * dispatch's entries, the fallback, the special model, the tints and the transformation.
 */
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowDown, ArrowUp, ExternalLink, Plus, Trash2 } from 'lucide-react';
import {
  type ConfigObject,
  type ConfigValue,
  fullId,
  ITEM_MODEL_PROPERTIES,
  ITEM_MODEL_SPECIAL_TYPES,
  ITEM_MODEL_TYPES,
  type ItemModelNode,
  itemModelMessages,
  itemModelNodeAt,
  type ItemModelPathStep,
  itemModelProperty,
  itemModelSpecialType,
  itemModelTypeDef,
  type ItemModelType,
  modelNode,
  newSpecialModel,
  updateItemModelAt,
  withNodeType,
  withProperty,
  withSpecialType,
} from '@resourcepackbuilder/core/project';
import { isPlainObject, MODEL_TOKEN } from '@resourcepackbuilder/utils';
import { IconButton } from '@resourcepackbuilder/ui';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { NumberInput } from '../../../../components/editor/inputs/NumberInput';
import { TextInput } from '../../../../components/editor/inputs/TextInput';
import { useSchemaText } from '../../../../components/useSchemaText';
import { ParamField, ParamList } from './ParamField';
import { TintsEditor } from './TintsEditor';
import { TransformationEditor } from './TransformationEditor';
import { useItemModelDocs } from './useItemModelDocs';

/** Reports the changed node; `historyKey` joins quick edits of one field into one undo step. */
export type NodeChange = (next: ItemModelNode, historyKey?: string) => void;

interface NodeEditorProps {
  node: ItemModelNode;
  onChange: NodeChange;
  /** The slot the node sits in (root, fallback, case …) */
  label: ReactNode;
  /** Actions of the slot (remove, move), shown in the header */
  actions?: ReactNode;
  /** Path of the node, for the undo steps of its fields */
  pathKey: string;
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

/** Remove / move buttons of a list entry. */
function EntryActions({ index, count, move, remove }: { index: number; count: number; move: (to: number) => void; remove: () => void }) {
  const t = useTranslations('schema');
  return (
    <>
      <IconButton label={t('itemModel.ui.moveUp')} disabled={index === 0} onClick={() => move(index - 1)}>
        <ArrowUp />
      </IconButton>
      <IconButton label={t('itemModel.ui.moveDown')} disabled={index === count - 1} onClick={() => move(index + 1)}>
        <ArrowDown />
      </IconButton>
      <IconButton label={t('itemModel.ui.removeEntry')} variant="ghost-destructive" onClick={remove}>
        <Trash2 />
      </IconButton>
    </>
  );
}

/** The list at `key` with one entry moved. */
function moved(list: ConfigValue[], from: number, to: number): ConfigValue[] {
  const next = [...list];
  const [entry] = next.splice(from, 1);
  next.splice(to, 0, entry);
  return next;
}

/** The node's type, the docs link and the slot's actions. */
function NodeHeader({ node, onChange, label, actions }: Pick<NodeEditorProps, 'node' | 'onChange' | 'label' | 'actions'>) {
  const t = useTranslations('schema');
  const text = useSchemaText();
  const docs = useItemModelDocs();
  const type = fullId(node.type);
  const known = itemModelTypeDef(type) !== undefined;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium">{label}</span>
      <NativeSelect
        size="sm"
        aria-label={t('itemModel.ui.type')}
        value={known ? type : ''}
        onChange={(e) => onChange(withNodeType(node, e.target.value as ItemModelType))}
      >
        {!known && <NativeSelectOption value="">{node.type}</NativeSelectOption>}
        {ITEM_MODEL_TYPES.map((option) => (
          <NativeSelectOption key={option} value={option}>
            {text(itemModelMessages.typeLabel(option))}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <div className="ml-auto flex items-center gap-1">
        {known && (
          <IconButton
            label={t('itemModel.ui.docs', { type: text(itemModelMessages.typeLabel(type)) })}
            render={<a href={docs(type)} target="_blank" rel="noreferrer" />}
          >
            <ExternalLink />
          </IconButton>
        )}
        {actions}
      </div>
    </div>
  );
}

/** A child slot of the node: the child's editor, or a button that adds it. */
function ChildSlot({
  node,
  path,
  label,
  onChange,
  pathKey,
  actions,
}: {
  node: ItemModelNode;
  path: ItemModelPathStep[];
  label: ReactNode;
  onChange: NodeChange;
  pathKey: string;
  actions?: ReactNode;
}) {
  const child = itemModelNodeAt(node, path);
  if (!child) return null;
  return (
    <NodeEditor
      node={child}
      label={label}
      actions={actions}
      pathKey={`${pathKey}.${path.join('.')}`}
      onChange={(next, key) =>
        onChange(
          updateItemModelAt(node, path, () => next),
          key,
        )
      }
    />
  );
}

/** The cases of a select: their values and models. */
function SelectCases({ node, onChange, pathKey }: { node: ItemModelNode; onChange: NodeChange; pathKey: string }) {
  const t = useTranslations('schema');
  const cases = listOf(node, 'cases');
  const def = typeof node.property === 'string' ? itemModelProperty('select', node.property) : undefined;
  const setCases = (next: ConfigValue[], key?: string) => onChange({ ...node, cases: next }, key);
  return (
    <div className="flex flex-col gap-3">
      <span className="text-xs font-medium text-muted-foreground">{t('itemModel.ui.cases')}</span>
      {cases.map((entry, i) => {
        const value = isPlainObject(entry) ? (entry as ConfigObject) : {};
        const when = value.when;
        const text = Array.isArray(when) ? when.join(', ') : when === undefined ? '' : String(when);
        return (
          <div key={i} className="flex flex-col gap-2 border-l-2 pl-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium">{t('itemModel.ui.when')}</span>
              <TextInput
                mono
                value={text}
                placeholder={t('itemModel.ui.whenPlaceholder')}
                suggestions={def?.values?.map((v) => ({ value: v, text: v }))}
                onChange={(next) => {
                  const values = (next ?? '')
                    .split(',')
                    .map((v) => v.trim())
                    .filter(Boolean);
                  const nextWhen = values.length > 1 ? values : (values[0] ?? '');
                  setCases(
                    cases.map((c, j) => (j === i ? withKey(value, 'when', nextWhen) : c)),
                    `${pathKey}.cases.${i}.when`,
                  );
                }}
              />
            </label>
            <ChildSlot
              node={node}
              path={['cases', i, 'model']}
              label={`#${i + 1}`}
              onChange={onChange}
              pathKey={pathKey}
              actions={
                <EntryActions
                  index={i}
                  count={cases.length}
                  move={(to) => setCases(moved(cases, i, to))}
                  remove={() => setCases(cases.filter((_, j) => j !== i))}
                />
              }
            />
          </div>
        );
      })}
      <Button variant="outline" size="sm" className="self-start" onClick={() => setCases([...cases, { when: '', model: modelNode() }])}>
        <Plus /> {t('itemModel.ui.addCase')}
      </Button>
    </div>
  );
}

/** The entries of a range dispatch: their thresholds and models. */
function RangeEntries({ node, onChange, pathKey }: { node: ItemModelNode; onChange: NodeChange; pathKey: string }) {
  const t = useTranslations('schema');
  const entries = listOf(node, 'entries');
  const setEntries = (next: ConfigValue[], key?: string) => onChange({ ...node, entries: next }, key);
  return (
    <div className="flex flex-col gap-3">
      <span className="text-xs font-medium text-muted-foreground">{t('itemModel.ui.entries')}</span>
      {entries.map((entry, i) => {
        const value = isPlainObject(entry) ? (entry as ConfigObject) : {};
        const threshold = value.threshold;
        return (
          <div key={i} className="flex flex-col gap-2 border-l-2 pl-3">
            <label className="flex max-w-48 flex-col gap-1">
              <span className="text-xs font-medium">{t('itemModel.ui.threshold')}</span>
              <NumberInput
                value={typeof threshold === 'number' || typeof threshold === 'string' ? threshold : undefined}
                label={t('itemModel.ui.threshold')}
                onChange={(next) =>
                  setEntries(
                    entries.map((e, j) => (j === i ? withKey(value, 'threshold', next) : e)),
                    `${pathKey}.entries.${i}.threshold`,
                  )
                }
              />
            </label>
            <ChildSlot
              node={node}
              path={['entries', i, 'model']}
              label={`#${i + 1}`}
              onChange={onChange}
              pathKey={pathKey}
              actions={
                <EntryActions
                  index={i}
                  count={entries.length}
                  move={(to) => setEntries(moved(entries, i, to))}
                  remove={() => setEntries(entries.filter((_, j) => j !== i))}
                />
              }
            />
          </div>
        );
      })}
      <Button
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => {
          const last = entries.at(-1);
          const threshold = isPlainObject(last) && typeof last.threshold === 'number' ? last.threshold + 1 : 0;
          setEntries([...entries, { threshold, model: modelNode() }]);
        }}
      >
        <Plus /> {t('itemModel.ui.addEntry')}
      </Button>
    </div>
  );
}

/** The optional fallback of a select or range dispatch. */
function Fallback({ node, onChange, pathKey }: { node: ItemModelNode; onChange: NodeChange; pathKey: string }) {
  const t = useTranslations('schema');
  if (node.fallback === undefined) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs text-muted-foreground">{t('itemModel.ui.noFallback')}</p>
        <Button variant="outline" size="sm" onClick={() => onChange({ ...node, fallback: modelNode() })}>
          <Plus /> {t('itemModel.ui.addFallback')}
        </Button>
      </div>
    );
  }
  return (
    <ChildSlot
      node={node}
      path={['fallback']}
      label={t('itemModel.ui.fallback')}
      onChange={onChange}
      pathKey={pathKey}
      actions={
        <IconButton
          label={t('itemModel.ui.removeEntry')}
          variant="ghost-destructive"
          onClick={() => onChange(withKey(node, 'fallback', undefined))}
        >
          <Trash2 />
        </IconButton>
      }
    />
  );
}

/** The property a condition, select or range dispatch reads, with its description and keys. */
function PropertyPicker({ node, onChange, pathKey }: { node: ItemModelNode; onChange: NodeChange; pathKey: string }) {
  const t = useTranslations('schema');
  const text = useSchemaText();
  const kind = itemModelTypeDef(node.type)?.property;
  if (!kind) return null;
  const property = typeof node.property === 'string' ? fullId(node.property) : '';
  const def = itemModelProperty(kind, property);
  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1">
        <span className="font-mono text-xs font-medium">property</span>
        <NativeSelect
          size="sm"
          className="w-full"
          value={def ? def.id : ''}
          onChange={(e) => onChange(withProperty(node, kind, e.target.value))}
        >
          {!def && <NativeSelectOption value="">{property || t('itemModel.ui.unset')}</NativeSelectOption>}
          {ITEM_MODEL_PROPERTIES[kind].map((option) => (
            <NativeSelectOption key={option.id} value={option.id}>
              {option.id}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </label>
      {def && (
        <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {text(itemModelMessages.property(kind, def.id))}
          {def.minVersion && <Badge variant="outline">{t('itemModel.ui.fromVersion', { version: def.minVersion })}</Badge>}
        </p>
      )}
      {def && (
        <ParamList params={def.params} owner={node} update={(key, value) => onChange(withKey(node, key, value), `${pathKey}.${key}`)} />
      )}
    </div>
  );
}

/** The special model of a special node: its type and keys. */
function SpecialModel({ node, onChange, pathKey }: { node: ItemModelNode; onChange: NodeChange; pathKey: string }) {
  const t = useTranslations('schema');
  const text = useSchemaText();
  const special: ConfigObject = isPlainObject(node.model) ? (node.model as ConfigObject) : {};
  const id = typeof special.type === 'string' ? fullId(special.type) : '';
  const def = itemModelSpecialType(id);
  const setSpecial = (next: ConfigObject, key?: string) => onChange({ ...node, model: next }, key);
  return (
    <div className="flex flex-col gap-2 border-l-2 pl-3">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium">{t('itemModel.ui.specialModel')}</span>
        <NativeSelect
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
      </label>
      {def && (
        <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {text(itemModelMessages.special(def.id))}
          {def.minVersion && <Badge variant="outline">{t('itemModel.ui.fromVersion', { version: def.minVersion })}</Badge>}
          {def.removedIn && <Badge variant="outline">{t('itemModel.ui.removedIn', { version: def.removedIn })}</Badge>}
        </p>
      )}
      {def && (
        <ParamList
          params={def.params}
          owner={special}
          update={(key, value) => setSpecial(withKey(special, key, value), `${pathKey}.model.${key}`)}
        />
      )}
    </div>
  );
}

/** The node's own keys (model, base, scale), with a shortcut to the item's own model for model references. */
function OwnKeys({ node, onChange, pathKey }: { node: ItemModelNode; onChange: NodeChange; pathKey: string }) {
  const t = useTranslations('schema');
  const def = itemModelTypeDef(node.type);
  if (!def || def.params.length === 0) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {def.params.map((param) => (
        <div key={param.key} className="flex flex-col gap-1">
          <ParamField
            param={param}
            value={node[param.key]}
            onChange={(value) => onChange(withKey(node, param.key, value), `${pathKey}.${param.key}`)}
          />
          {param.kind === 'resource' && node[param.key] !== MODEL_TOKEN && (
            <Button variant="ghost" size="sm" className="self-start" onClick={() => onChange(withKey(node, param.key, MODEL_TOKEN))}>
              {t('itemModel.ui.useMainModel')}
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

/** The editor of one node and its children. */
export function NodeEditor({ node, onChange, label, actions, pathKey }: NodeEditorProps) {
  const t = useTranslations('schema');
  const text = useSchemaText();
  const type = fullId(node.type);
  const def = itemModelTypeDef(type);
  const models = listOf(node, 'models');
  const setModels = (next: ConfigValue[]) => onChange({ ...node, models: next });
  return (
    <div className="flex flex-col gap-3 rounded-md border p-3">
      <NodeHeader node={node} onChange={onChange} label={label} actions={actions} />
      {def ? (
        <p className="text-xs text-muted-foreground">{text(itemModelMessages.typeDescription(type))}</p>
      ) : (
        <p className="text-xs text-muted-foreground">{t('itemModel.ui.unknownType')}</p>
      )}
      <OwnKeys node={node} onChange={onChange} pathKey={pathKey} />
      <PropertyPicker node={node} onChange={onChange} pathKey={pathKey} />
      {type === 'minecraft:special' && <SpecialModel node={node} onChange={onChange} pathKey={pathKey} />}
      {def?.tints && <TintsEditor node={node} onChange={onChange} pathKey={pathKey} />}
      {type === 'minecraft:composite' && (
        <div className="flex flex-col gap-3">
          <span className="text-xs font-medium text-muted-foreground">{t('itemModel.ui.models')}</span>
          {models.map((_, i) => (
            <ChildSlot
              key={i}
              node={node}
              path={['models', i]}
              label={`#${i + 1}`}
              onChange={onChange}
              pathKey={pathKey}
              actions={
                <EntryActions
                  index={i}
                  count={models.length}
                  move={(to) => setModels(moved(models, i, to))}
                  remove={() => setModels(models.filter((__, j) => j !== i))}
                />
              }
            />
          ))}
          <Button variant="outline" size="sm" className="self-start" onClick={() => setModels([...models, modelNode()])}>
            <Plus /> {t('itemModel.ui.addModel')}
          </Button>
        </div>
      )}
      {type === 'minecraft:condition' &&
        (['on_true', 'on_false'] as const).map((branch) =>
          isPlainObject(node[branch]) ? (
            <ChildSlot
              key={branch}
              node={node}
              path={[branch]}
              label={t(branch === 'on_true' ? 'itemModel.ui.onTrue' : 'itemModel.ui.onFalse')}
              onChange={onChange}
              pathKey={pathKey}
            />
          ) : (
            <Button
              key={branch}
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() => onChange({ ...node, [branch]: modelNode() })}
            >
              <Plus /> {t(branch === 'on_true' ? 'itemModel.ui.onTrue' : 'itemModel.ui.onFalse')}
            </Button>
          ),
        )}
      {type === 'minecraft:select' && <SelectCases node={node} onChange={onChange} pathKey={pathKey} />}
      {type === 'minecraft:range_dispatch' && <RangeEntries node={node} onChange={onChange} pathKey={pathKey} />}
      {(type === 'minecraft:select' || type === 'minecraft:range_dispatch') && (
        <Fallback node={node} onChange={onChange} pathKey={pathKey} />
      )}
      {def?.transformation && <TransformationEditor node={node} onChange={onChange} pathKey={pathKey} />}
    </div>
  );
}
