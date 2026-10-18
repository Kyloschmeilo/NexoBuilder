/**
 * The models of one variant slot (a special appearance such as pulling a bow, a stack stage or a directional face):
 * where the slot ends up in the YAML, its docs, a warning when the item's material does not have the state, the
 * models as rows and a drop zone for more. `VariantModels` is that content; `VariantCard` puts it in a sub-section
 * of its own for lists that show every slot at once.
 */
import { useFormatter, useTranslations } from 'next-intl';
import { Trash2 } from 'lucide-react';
import type { ImportedModel } from '@resourcepackbuilder/minecraft';
import { CE_DOCS } from '@resourcepackbuilder/core/craftEngine';
import { nexoVariantDocs } from '@resourcepackbuilder/core/nexo';
import { type Item, itemMaterial, variantConfigPath, type VariantDef, variantPathSuffix } from '@resourcepackbuilder/core/project';
import { DocsLink, type DocsRef, DropZone, Help, IconButton, pickFiles, SubSection } from '@resourcepackbuilder/ui';
import { Alert, AlertDescription } from '@resourcepackbuilder/ui/components/alert';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { removeVariant, setVariantModels, updateItem } from '../../../commands/items';
import { moveInArray, removeAt, replaceAt } from '../../../components/editor';
import { MODEL_ACCEPT } from '../../../components/modelFiles';
import { useSchemaText } from '../../../components/useSchemaText';
import { useOpenProject } from '../../../store/project';
import { useModelImport } from './useModelImport';
import { VariantModelRow } from './VariantModelRow';

/** CraftEngine writes the generated models of the special appearance slots into the item's `models` list. */
const CE_VARIANTS_KEY = 'models';

/**
 * Where the variant ends up in the YAML: its config path (Nexo's `Pack.<slot>`, CraftEngine's `models`), or "own
 * ItemModel" for slots written as definitions.
 */
export function useVariantKey(): (def: VariantDef) => string | null {
  const t = useTranslations('item');
  const target = useOpenProject().target;
  return (def) => {
    if (target === 'craftengine' && def.kind === 'pack') return CE_VARIANTS_KEY;
    return variantConfigPath(def)?.join('.') ?? (def.kind === 'definition' ? t('variants.ownItemModel') : null);
  };
}

/** The docs page of a variant slot for the open project's plugin. */
export function useVariantDocs(): (def: VariantDef) => DocsRef {
  const target = useOpenProject().target;
  return (def) => (target === 'craftengine' ? { url: CE_DOCS.itemModels, target } : { url: nexoVariantDocs(def.slot), target });
}

/** Whether the item's material has the state the variant needs (variants without a material list fit every item). */
export function fitsMaterial(item: Item, def: VariantDef): boolean {
  return !def.materials || def.materials.includes(itemMaterial(item));
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

interface VariantModelsProps {
  item: Item;
  def: VariantDef;
  /** Shows the slot's description, hint and docs link in a line above the models (lists whose rows lack them). */
  showInfo?: boolean;
}

/** The content of one variant: its description line, the material warning, its models (one, or an ordered list) and a drop zone. */
export function VariantModels({ item, def, showInfo = true }: VariantModelsProps) {
  const t = useTranslations('item');
  const tSchema = useSchemaText();
  const docs = useVariantDocs();
  const { importModels } = useModelImport();
  const models = item.variants?.[def.slot] ?? [];
  const setModels = (next: ImportedModel[]) => setVariantModels(item.id, def.slot, next);
  const label = tSchema(def.label, def.params);

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
    <div data-slot="variant-models" className="flex min-w-0 flex-col gap-3">
      {showInfo && (
        <div className="flex min-w-0 items-center gap-1.5 text-meta text-text-muted">
          <span className="min-w-0 flex-1">{tSchema(def.description, def.params)}</span>
          {def.hint && <Help>{tSchema(def.hint, def.params)}</Help>}
          <DocsLink {...docs(def)} label={label} />
        </div>
      )}
      {def.materials && <MaterialAlert item={item} materials={def.materials} />}
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
  );
}

interface VariantCardProps {
  item: Item;
  def: VariantDef;
  /** Offers removing the whole variant (not for slots that exist because of a mechanic). */
  removable?: boolean;
}

/** One variant as a sub-section: label, YAML key, docs and the hint in its header, its models below. */
export function VariantCard({ item, def, removable = true }: VariantCardProps) {
  const t = useTranslations('item');
  const tSchema = useSchemaText();
  const variantKey = useVariantKey();
  const docs = useVariantDocs();
  const key = variantKey(def);
  const label = tSchema(def.label, def.params);
  return (
    <SubSection
      title={label}
      description={tSchema(def.description, def.params)}
      meta={
        <>
          {key && <code className="truncate font-mono text-micro text-text-faint">{key}</code>}
          <DocsLink {...docs(def)} label={label} />
          {def.hint && <Help>{tSchema(def.hint, def.params)}</Help>}
        </>
      }
      actions={
        removable && (
          <IconButton label={t('variants.remove')} variant="ghost-destructive" onClick={() => removeVariant(item.id, def.slot)}>
            <Trash2 />
          </IconButton>
        )
      }
    >
      <VariantModels item={item} def={def} showInfo={false} />
    </SubSection>
  );
}
