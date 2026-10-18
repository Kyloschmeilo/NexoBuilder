/**
 * The transformation of a node (26.1+) in its decomposed form: translation, left rotation, scale and right rotation as
 * comma-separated numbers. A matrix (written in the additional YAML or by hand) is edited as YAML text.
 */
import { useTranslations } from 'next-intl';
import { Plus, Trash2 } from 'lucide-react';
import {
  type ConfigObject,
  type ConfigValue,
  ITEM_MODEL_TRANSFORMATION_KEYS,
  ITEM_MODEL_TRANSFORMATION_VERSION,
  type ItemModelNode,
  itemModelMessages,
} from '@resourcepackbuilder/core/project';
import { isPlainObject } from '@resourcepackbuilder/utils';
import { IconButton } from '@resourcepackbuilder/ui';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { TextInput } from '../../../../components/editor/inputs/TextInput';
import { useSchemaText } from '../../../../components/useSchemaText';
import type { NodeChange } from './NodeEditor';
import { YamlValue } from './ParamField';

/** A list of numbers as `a, b, c` (other values as they are written). */
const formatVector = (value: ConfigValue | undefined) =>
  Array.isArray(value) ? value.join(', ') : value === undefined ? '' : String(value);

/** `a, b, c` as a list of `size` numbers; undefined when the text is no such list. */
function parseVector(text: string, size: number): number[] | undefined {
  const parts = text
    .split(/[,\s]+/)
    .filter(Boolean)
    .map(Number);
  return parts.length === size && parts.every(Number.isFinite) ? parts : undefined;
}

/** The node's transformation, or a button that adds the identity transformation. */
export function TransformationEditor({ node, onChange, pathKey }: { node: ItemModelNode; onChange: NodeChange; pathKey: string }) {
  const t = useTranslations('schema');
  const text = useSchemaText();
  const value = node.transformation;
  const badge = <Badge variant="outline">{t('itemModel.ui.fromVersion', { version: ITEM_MODEL_TRANSFORMATION_VERSION })}</Badge>;
  if (value === undefined) {
    const identity = Object.fromEntries(ITEM_MODEL_TRANSFORMATION_KEYS.map(({ key, identity: start }) => [key, [...start]]));
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onChange({ ...node, transformation: identity })}>
          <Plus /> {t('itemModel.ui.addTransformation')}
        </Button>
        {badge}
      </div>
    );
  }
  const remove = () => {
    const rest: ItemModelNode = { ...node };
    delete rest.transformation;
    onChange(rest);
  };
  const header = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">{t('itemModel.ui.transformation')}</span>
      {badge}
      <IconButton className="ml-auto" label={t('itemModel.ui.removeEntry')} variant="ghost-destructive" onClick={remove}>
        <Trash2 />
      </IconButton>
    </div>
  );
  if (!isPlainObject(value)) {
    // A matrix: edited as YAML
    return (
      <div className="flex flex-col gap-2 border-l-2 pl-3">
        {header}
        <YamlValue
          id={`${pathKey}.transformation`}
          value={value}
          onChange={(next) => onChange({ ...node, transformation: next ?? [] }, `${pathKey}.transformation`)}
        />
      </div>
    );
  }
  const object = value as ConfigObject;
  return (
    <div className="flex flex-col gap-2 border-l-2 pl-3">
      {header}
      <p className="text-xs text-muted-foreground">{t('itemModel.ui.transformationHelp')}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {ITEM_MODEL_TRANSFORMATION_KEYS.map(({ key, size }) => {
          const current = object[key];
          const invalid = current !== undefined && !(Array.isArray(current) && current.length === size);
          return (
            <label key={key} className="flex flex-col gap-1">
              <span className="font-mono text-xs font-medium">{key}</span>
              <TextInput
                mono
                invalid={invalid}
                value={formatVector(current)}
                commitOnBlur
                onChange={(next) => {
                  const vector = next === undefined ? undefined : parseVector(next, size);
                  if (next !== undefined && !vector) return;
                  const updated = { ...object };
                  if (vector) updated[key] = vector;
                  else delete updated[key];
                  onChange({ ...node, transformation: updated }, `${pathKey}.transformation.${key}`);
                }}
              />
              <span className="text-xs text-muted-foreground">{text(itemModelMessages.transformation(key))}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
