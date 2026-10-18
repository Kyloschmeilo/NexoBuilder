/**
 * The Furniture section of the item editor for both targets: a CraftEngine item's `furniture` (variants, settings,
 * behaviors) or a Nexo item's furniture mechanic (`Mechanics.furniture`: hitboxes, seats, options, models). The item
 * editor's "Places" control decides whether an item places furniture; without furniture the section renders nothing.
 */
import { useTranslations } from 'next-intl';
import { CE_DOCS } from '@resourcepackbuilder/core/craftEngine';
import { NEXO_DOCS } from '@resourcepackbuilder/core/nexo';
import type { Item } from '@resourcepackbuilder/core/project';
import { DocsLink, Section } from '@resourcepackbuilder/ui';
import { useOpenProject } from '../../../store/project';
import { CraftEngineFurnitureEditor } from './CraftEngineFurnitureSection';
import { itemFurniture } from './model';
import { NexoFurnitureEditor } from './NexoFurnitureEditor';

/** The section id `sections.ts` and the section nav use. */
export const FURNITURE_SECTION_ID = 'furniture';

/** The item's furniture section, for the open project's target; nothing while the item places no furniture. */
export function FurnitureSection({ item, id = FURNITURE_SECTION_ID }: { item: Item; id?: string }) {
  const t = useTranslations('item.furniture');
  const { target } = useOpenProject();
  const furniture = itemFurniture(item, target);
  if (!furniture) return null;
  const isCraftEngine = target === 'craftengine';
  const docs = isCraftEngine ? CE_DOCS.furniture : NEXO_DOCS.furniture.page;
  return (
    <Section
      id={id}
      title={t('title')}
      description={isCraftEngine ? t('descriptionCraftEngine') : t('descriptionNexo')}
      actions={<DocsLink url={docs} target={target} label={t('title')} />}
    >
      {isCraftEngine ? (
        <CraftEngineFurnitureEditor item={item} furniture={furniture} />
      ) : (
        <NexoFurnitureEditor item={item} furniture={furniture} />
      )}
    </Section>
  );
}
