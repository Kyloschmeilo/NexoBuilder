/** The tints of a model node: one tint source per `tintindex`, each with its type and keys. */
import { useTranslations } from 'next-intl';
import { Plus, Trash2 } from 'lucide-react';
import {
  type ConfigObject,
  type ConfigValue,
  fullId,
  ITEM_MODEL_TINT_TYPES,
  type ItemModelNode,
  itemModelMessages,
  itemModelTintType,
  newTint,
  withTintType,
} from '@resourcepackbuilder/core/project';
import { isPlainObject } from '@resourcepackbuilder/utils';
import { IconButton } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { useSchemaText } from '../../../../components/useSchemaText';
import type { NodeChange } from './NodeEditor';
import { ParamList } from './ParamField';

/** The tint source a new tint starts with (the dyed color, as leather armor has). */
const FIRST_TINT = 'minecraft:dye';

/** The list of tint sources of a model node; an empty list removes the key. */
export function TintsEditor({ node, onChange, pathKey }: { node: ItemModelNode; onChange: NodeChange; pathKey: string }) {
  const t = useTranslations('schema');
  const text = useSchemaText();
  const tints = Array.isArray(node.tints) ? node.tints : [];
  const setTints = (next: ConfigValue[], key?: string) => {
    const rest: ItemModelNode = { ...node };
    delete rest.tints;
    onChange(next.length > 0 ? { ...rest, tints: next } : rest, key);
  };
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-muted-foreground">{t('itemModel.ui.tints')}</span>
      {tints.map((entry, i) => {
        const tint: ConfigObject = isPlainObject(entry) ? (entry as ConfigObject) : {};
        const id = typeof tint.type === 'string' ? fullId(tint.type) : '';
        const def = itemModelTintType(id);
        const setTint = (next: ConfigObject, key?: string) =>
          setTints(
            tints.map((e, j) => (j === i ? next : e)),
            key,
          );
        return (
          <div key={i} className="flex flex-col gap-2 border-l-2 pl-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs">#{i}</span>
              <NativeSelect
                size="sm"
                aria-label={t('itemModel.ui.type')}
                value={def ? def.id : ''}
                onChange={(e) => setTint(id ? withTintType(tint, e.target.value) : newTint(e.target.value))}
              >
                {!def && <NativeSelectOption value="">{id || t('itemModel.ui.unset')}</NativeSelectOption>}
                {ITEM_MODEL_TINT_TYPES.map((option) => (
                  <NativeSelectOption key={option.id} value={option.id}>
                    {option.id}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <IconButton
                className="ml-auto"
                label={t('itemModel.ui.removeEntry')}
                variant="ghost-destructive"
                onClick={() => setTints(tints.filter((_, j) => j !== i))}
              >
                <Trash2 />
              </IconButton>
            </div>
            {def && <p className="text-xs text-muted-foreground">{text(itemModelMessages.tint(def.id))}</p>}
            {def && (
              <ParamList
                params={def.params}
                owner={tint}
                update={(key, value) => {
                  const next = { ...tint };
                  if (value === undefined) delete next[key];
                  else next[key] = value;
                  setTint(next, `${pathKey}.tints.${i}.${key}`);
                }}
              />
            )}
          </div>
        );
      })}
      <Button variant="outline" size="sm" className="self-start" onClick={() => setTints([...tints, newTint(FIRST_TINT)])}>
        <Plus /> {t('itemModel.ui.addTint')}
      </Button>
    </div>
  );
}
