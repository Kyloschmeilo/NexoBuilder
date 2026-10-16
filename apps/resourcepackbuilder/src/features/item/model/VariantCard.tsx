import { useFormatter, useTranslations } from 'next-intl';
import { Trash2 } from 'lucide-react';
import type { ImportedModel } from '@resourcepackbuilder/minecraft';
import { type Item, itemMaterial, variantConfigPath, type VariantDef, variantPathSuffix } from '@resourcepackbuilder/core/project';
import { DropZone, IconButton, pickFiles, SectionCard, Tip } from '@resourcepackbuilder/ui';
import { Alert, AlertDescription } from '@resourcepackbuilder/ui/components/alert';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { removeVariant, setVariantModels, updateItem } from '../../../commands/items';
import { moveInArray, removeAt, replaceAt } from '../../../components/editor';
import { MODEL_ACCEPT } from '../../../components/modelFiles';
import { useSchemaText } from '../../../components/useSchemaText';
import { useModelImport } from './useModelImport';
import { VariantModelRow } from './VariantModelRow';

/** Where the variant ends up: a Pack option, an own ItemModel or the custom block's stack stages. */
function VariantKindBadge({ def }: { def: VariantDef }) {
  const t = useTranslations('item');
  const path = variantConfigPath(def);
  if (path) {
    return (
      <Tip label={t('properties.pathInYaml')}>
        <Badge variant="outline" className="font-mono">
          {path.join('.')}
        </Badge>
      </Tip>
    );
  }
  return def.kind === 'definition' ? (
    <Badge variant="outline" className="font-mono">
      {t('variants.ownItemModel')}
    </Badge>
  ) : null;
}

/** Warning when the variant only exists for other materials, with a button to switch to the first of them. */
function MaterialAlert({ item, materials }: { item: Item; materials: readonly string[] }) {
  const t = useTranslations('item');
  const format = useFormatter();
  const material = itemMaterial(item);
  const [suggested] = materials;
  if (suggested === undefined || materials.includes(material)) return null;
  return (
    <Alert variant="warning">
      <AlertDescription>
        {t('variants.wrongMaterial', { materials: format.list(materials, { type: 'disjunction' }), material })}
      </AlertDescription>
      <Button
        variant="outline"
        size="sm"
        className="mt-1.5 justify-self-start"
        onClick={() =>
          updateItem(item.id, (d) => {
            d.config.material = suggested;
          })
        }
      >
        {t('variants.setMaterial', { material: suggested })}
      </Button>
    </Alert>
  );
}

interface VariantCardProps {
  item: Item;
  def: VariantDef;
  /** Offers removing the whole variant (not for slots that exist because of a mechanic). */
  removable?: boolean;
}

/** One variant of the item with its models (one, or an ordered list) and a drop zone for more. */
export function VariantCard({ item, def, removable = true }: VariantCardProps) {
  const t = useTranslations('item');
  const tSchema = useSchemaText();
  const { importModels } = useModelImport();
  const models = item.variants?.[def.slot] ?? [];
  const setModels = (next: ImportedModel[]) => setVariantModels(item.id, def.slot, next);

  const add = async (files: File[]) => {
    const imported = await importModels(files);
    if (imported.length === 0) return;
    setModels(def.multiple ? [...models, ...imported] : imported.slice(0, 1));
  };
  const replace = async (index: number) => {
    const files = await pickFiles(MODEL_ACCEPT);
    if (!files.length) return;
    const [replacement] = await importModels(files);
    if (replacement) setModels(replaceAt(models, index, replacement));
  };

  return (
    <SectionCard
      title={tSchema(def.label)}
      badges={<VariantKindBadge def={def} />}
      description={tSchema(def.description)}
      actions={
        removable && (
          <IconButton label={t('variants.remove')} variant="ghost-destructive" onClick={() => removeVariant(item.id, def.slot)}>
            <Trash2 />
          </IconButton>
        )
      }
    >
      <div className="flex flex-col gap-3">
        {def.materials && <MaterialAlert item={item} materials={def.materials} />}
        {def.hint && (
          <Alert variant="info">
            <AlertDescription>{tSchema(def.hint)}</AlertDescription>
          </Alert>
        )}
        {models.length > 0 && (
          <div className="flex flex-col gap-2">
            {models.map((model, index) => (
              <VariantModelRow
                key={index}
                model={model}
                label={variantPathSuffix(def, index)}
                position={def.multiple ? { index, count: models.length } : undefined}
                onMove={(to) => setModels(moveInArray(models, index, to))}
                onReplace={() => void replace(index)}
                onRemove={() => setModels(removeAt(models, index))}
              />
            ))}
          </div>
        )}
        {(def.multiple || models.length === 0) && (
          <DropZone
            onFiles={(files) => void add(files)}
            accept={MODEL_ACCEPT}
            title={def.multiple ? t('variants.dropMany') : t('model.dropTitle')}
            subtitle={def.multiple ? t('variants.dropManySubtitle') : t('variants.dropOneSubtitle')}
            compact
          />
        )}
      </div>
    </SectionCard>
  );
}
