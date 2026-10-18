/**
 * The Model and Textures sections of the item editor, put together from the model parts (model card, variants, extra
 * models, item model tree and CraftEngine's model keys). The model task replaces both with its own `ModelSection` and
 * `TexturesSection`; `sections.ts` then imports those instead.
 */
import { useTranslations } from 'next-intl';
import { type Item, itemMaterial } from '@resourcepackbuilder/core/project';
import { DropZone, Section } from '@resourcepackbuilder/ui';
import { setItemModel } from '../../../commands/items';
import { MODEL_ACCEPT, MODEL_FORMATS } from '../../../components/modelFiles';
import { BlockModelsSection } from '../model/BlockModelsSection';
import { FurnitureModelsSection } from '../model/FurnitureModelsSection';
import { ItemModelTreeSection } from '../model/itemModelTree';
import { ModelCard } from '../model/ModelCard';
import { TexturesSection as ModelTextures } from '../model/TexturesSection';
import { useModelImport } from '../model/useModelImport';
import { VariantsSection } from '../model/VariantsSection';
import { PropertyGroupPanel } from '../properties/PropertyGroupPanel';
import { useProjectForm } from '../properties/useProjectForm';

/** CraftEngine's item keys around the model (oversized_in_gui, item_model …) */
const MODEL_GROUP = 'model';

/** The item has no model yet: a drop zone for one. */
function NoModel({ item }: { item: Item }) {
  const t = useTranslations('item');
  const { importModel } = useModelImport();
  return (
    <Section title={t('model.noneTitle')} description={t('model.noneDescription', { material: itemMaterial(item) })}>
      <DropZone
        onFiles={async (files) => {
          const model = await importModel(files);
          if (model) setItemModel(item.id, model);
        }}
        accept={MODEL_ACCEPT}
        title={t('model.dropTitle')}
        subtitle={t('model.dropSubtitle')}
        formats={MODEL_FORMATS}
      />
    </Section>
  );
}

/** The item's model, its variants and extra models, the item model tree and the form's model keys. */
export function ModelSection({ item }: { item: Item }) {
  const model = item.model;
  const hasModelGroup = useProjectForm().groups.some((group) => group.id === MODEL_GROUP);
  return (
    <div className="flex flex-col gap-3">
      {model ? (
        <>
          <ModelCard item={item} model={model} />
          <VariantsSection item={item} />
          <FurnitureModelsSection item={item} />
          <BlockModelsSection item={item} />
        </>
      ) : (
        <NoModel item={item} />
      )}
      <ItemModelTreeSection item={item} />
      {hasModelGroup && <PropertyGroupPanel item={item} group={MODEL_GROUP} />}
    </div>
  );
}

/** The textures of the item's model (the section is offered only while the item has a model). */
export function TexturesSection({ item }: { item: Item }) {
  return item.model ? <ModelTextures itemId={item.id} model={item.model} /> : null;
}
