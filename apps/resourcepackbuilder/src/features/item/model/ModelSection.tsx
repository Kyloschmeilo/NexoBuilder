/**
 * The Model section of the item editor: three panels under one anchor. The model itself (preview, hold style,
 * shading, check) or a drop zone while there is none, the special appearance (extra models per state, filtered by the
 * project's target), and the item model tree.
 */
import type { Item } from '@resourcepackbuilder/core/project';
import { ItemModelTreeSection } from './itemModelTree';
import { ModelCard, NoModelCard } from './ModelCard';
import { VariantsSection } from './VariantsSection';

interface ModelSectionProps {
  item: Item;
  /** Anchor of the section for the section navigation (`data-section-id`); `model` by default. */
  id?: string;
}

/** The item's model, its special appearance and its item model tree. */
export function ModelSection({ item, id = 'model' }: ModelSectionProps) {
  const model = item.model;
  return (
    <div id={id} data-section-id={id} className="flex min-w-0 scroll-mt-4 flex-col gap-3">
      {model ? <ModelCard item={item} model={model} /> : <NoModelCard item={item} />}
      {model && <VariantsSection item={item} />}
      <ItemModelTreeSection item={item} />
    </div>
  );
}
