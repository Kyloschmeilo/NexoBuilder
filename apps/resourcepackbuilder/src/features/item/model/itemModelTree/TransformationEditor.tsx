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
import { FieldGroup, FieldRow, Help, IconButton, StatusPill } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { humanizeKey } from '../../../../components/catalog';
import { TextInput } from '../../../../components/editor/inputs/TextInput';
import { useSchemaText } from '../../../../components/useSchemaText';
import type { NodeChange } from './NodeEditor';
import { NodeBlock } from './NodeBlock';
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
  const meta = (
    <>
      <Help>{t('itemModel.ui.transformationHelp')}</Help>
      <StatusPill tone="info" label={t('itemModel.ui.fromVersion', { version: ITEM_MODEL_TRANSFORMATION_VERSION })} />
    </>
  );
  if (value === undefined) {
    const identity = Object.fromEntries(ITEM_MODEL_TRANSFORMATION_KEYS.map(({ key, identity: start }) => [key, [...start]]));
    return (
      <NodeBlock
        title={t('itemModel.ui.transformation')}
        meta={meta}
        actions={
          <Button
            variant="ghost"
            size="sm"
            className="text-primary hover:text-primary"
            onClick={() => onChange({ ...node, transformation: identity })}
          >
            <Plus /> {t('itemModel.ui.addTransformation')}
          </Button>
        }
      />
    );
  }
  const remove = () => {
    const rest: ItemModelNode = { ...node };
    delete rest.transformation;
    onChange(rest);
  };
  const removeButton = (
    <IconButton label={t('itemModel.ui.removeEntry')} variant="ghost-destructive" onClick={remove}>
      <Trash2 />
    </IconButton>
  );
  if (!isPlainObject(value)) {
    // A matrix: edited as YAML
    return (
      <NodeBlock title={t('itemModel.ui.transformation')} meta={meta} actions={removeButton}>
        <YamlValue
          id={`${pathKey}.transformation`}
          value={value}
          onChange={(next) => onChange({ ...node, transformation: next ?? [] }, `${pathKey}.transformation`)}
        />
      </NodeBlock>
    );
  }
  const object = value as ConfigObject;
  return (
    <NodeBlock title={t('itemModel.ui.transformation')} meta={meta} actions={removeButton}>
      <FieldGroup>
        {ITEM_MODEL_TRANSFORMATION_KEYS.map(({ key, size }) => {
          const current = object[key];
          const invalid = current !== undefined && !(Array.isArray(current) && current.length === size);
          const id = `${pathKey}.transformation.${key}`;
          return (
            <FieldRow key={key} label={humanizeKey(key)} htmlFor={id} yamlKey={key} help={text(itemModelMessages.transformation(key))}>
              <TextInput
                id={id}
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
            </FieldRow>
          );
        })}
      </FieldGroup>
    </NodeBlock>
  );
}
