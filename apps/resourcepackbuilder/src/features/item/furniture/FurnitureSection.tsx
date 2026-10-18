/**
 * The Furniture section of the item editor for both targets: a CraftEngine item's `furniture` (variants, settings,
 * behaviors) or a Nexo item's furniture mechanic (`Mechanics.furniture`: hitboxes, seats, options, models). While the
 * item places no furniture, the section says so and offers to place furniture (unless it places a block).
 */
import { useTranslations } from 'next-intl';
import { CE_DOCS } from '@resourcepackbuilder/core/craftEngine';
import { NEXO_DOCS } from '@resourcepackbuilder/core/nexo';
import type { Item } from '@resourcepackbuilder/core/project';
import { DocsLink, EmptyHint, Section } from '@resourcepackbuilder/ui';
import { addProperty, setCraftEngineFurniture } from '../../../commands/items';
import { useOpenProject } from '../../../store/project';
import { CraftEngineFurnitureEditor } from './CraftEngineFurnitureSection';
import { itemFurniture, NEXO_FURNITURE_PROPERTY, placesBlock } from './model';
import { NexoFurnitureEditor } from './NexoFurnitureEditor';

/** The section id `sections.ts` and the section nav use. */
export const FURNITURE_SECTION_ID = 'furniture';

/** The item's furniture section, for the open project's target. */
export function FurnitureSection({ item, id = FURNITURE_SECTION_ID }: { item: Item; id?: string }) {
  const t = useTranslations('item.furniture');
  const { target } = useOpenProject();
  const furniture = itemFurniture(item, target);
  const isCraftEngine = target === 'craftengine';
  const docs = isCraftEngine ? CE_DOCS.furniture : NEXO_DOCS.furniture.page;
  const blocked = !furniture && placesBlock(item, target);
  const place = () => (isCraftEngine ? setCraftEngineFurniture(item.id, true) : addProperty(item.id, NEXO_FURNITURE_PROPERTY));
  return (
    <Section
      id={id}
      title={t('title')}
      description={isCraftEngine ? t('descriptionCraftEngine') : t('descriptionNexo')}
      actions={<DocsLink url={docs} target={target} label={t('title')} />}
    >
      {!furniture ? (
        <EmptyHint actionLabel={blocked ? undefined : t('place')} onAction={place}>
          {blocked ? t('blockedByBlock') : t('none')}
        </EmptyHint>
      ) : isCraftEngine ? (
        <CraftEngineFurnitureEditor item={item} furniture={furniture} />
      ) : (
        <NexoFurnitureEditor item={item} furniture={furniture} />
      )}
    </Section>
  );
}
