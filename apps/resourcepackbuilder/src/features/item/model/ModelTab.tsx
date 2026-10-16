import { useTranslations } from 'next-intl';
import { Box } from 'lucide-react';
import type { Item } from '@resourcepackbuilder/core/project/types';
import { itemMaterial } from '@resourcepackbuilder/core/nexo/material';
import { DropZone, SectionCard } from '@resourcepackbuilder/ui';
import { setItemModel } from '../../../commands/items';
import { PropertiesPanel } from '../properties/PropertiesPanel';
import { BlockModelsSection } from './BlockModelsSection';
import { FurnitureModelsSection } from './FurnitureModelsSection';
import { ModelCard } from './ModelCard';
import { TexturesSection } from './TexturesSection';
import { MODEL_ACCEPT, MODEL_FORMATS } from '../../../components/modelFiles';
import { useModelImport } from './useModelImport';
import { VariantsSection } from './VariantsSection';

function NoModelCard({ item }: { item: Item }) {
  const t = useTranslations('item');
  const { importModel } = useModelImport();
  return (
    <SectionCard
      icon={<Box className="size-4.5" />}
      title={t('model.noneTitle')}
      description={t('model.noneDescription', { material: itemMaterial(item) })}
    >
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
    </SectionCard>
  );
}

/** The item's model with its textures, extra models (variants, furniture, block) and the appearance properties. */
export function ModelTab({ item }: { item: Item }) {
  const model = item.model;
  return (
    <div className="flex flex-col gap-6">
      {model ? (
        <>
          <ModelCard item={item} model={model} />
          <TexturesSection itemId={item.id} model={model} />
          <VariantsSection item={item} />
          <FurnitureModelsSection item={item} />
          <BlockModelsSection item={item} />
        </>
      ) : (
        <NoModelCard item={item} />
      )}
      <PropertiesPanel item={item} group="appearance" />
    </div>
  );
}
