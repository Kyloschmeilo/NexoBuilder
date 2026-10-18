/**
 * The Block section of the item editor (UX §2.3, §4) for both targets. Its first panel says what the item places, as
 * one choice of Nothing, Block or Furniture (CraftEngine's `block` and `furniture` definitions, Nexo's custom_block
 * and furniture mechanics). For a block, the panels below edit it:
 *  - CraftEngine: the behaviors (typed cards with a catalog of every behavior), the states and the block settings
 *    (a feature list with a catalog);
 *  - Nexo: the custom block's type and plain keys, its parts as features, and its extra models.
 * Furniture is edited in the Furniture section; this section then only says so.
 */
import { useTranslations } from 'next-intl';
import { craftEngineBlock, craftEngineFurniture } from '@resourcepackbuilder/core/craftEngine';
import { getPath, type Item, type PackTargetId } from '@resourcepackbuilder/core/project';
import { FieldGroup, FieldRow, Section, SegmentedControl, StatusPill } from '@resourcepackbuilder/ui';
import { type ItemPlaces, NEXO_BLOCK_PROPERTY, NEXO_FURNITURE_PROPERTY, setItemPlaces } from '../../../commands/items';
import { confirm } from '../../../store/dialogs';
import { useOpenProject } from '../../../store/project';
import { useProjectForm } from '../properties/useProjectForm';
import { BehaviorsSection } from './BehaviorsSection';
import { BlockModelsSection } from './BlockModelsSection';
import { BLOCK_SETTINGS_GROUP, BlockSettingsRows, useBlockSettings } from './BlockSettingsList';
import { NexoBlockBasics, NexoBlockFeatures } from './NexoBlock';
import { StatesSection } from './StatesSection';

/** The anchor of the Block section's first panel (SectionNav); the further panels have their own. */
export const BLOCK_SECTION_ID = 'block';
/** The anchor of the block settings panel. */
export const BLOCK_SETTINGS_SECTION_ID = 'block-settings';

const PLACES: readonly ItemPlaces[] = ['nothing', 'block', 'furniture'];

/** What the item places: CraftEngine's block or furniture definition, Nexo's custom_block or furniture mechanic. */
export function itemPlaces(item: Pick<Item, 'config'>, target: PackTargetId): ItemPlaces {
  if (target === 'craftengine') {
    if (craftEngineBlock(item.config)) return 'block';
    return craftEngineFurniture(item.config) ? 'furniture' : 'nothing';
  }
  const mechanic = (id: string) => getPath(item.config, id.split('.')) !== undefined;
  if (mechanic(NEXO_BLOCK_PROPERTY)) return 'block';
  return mechanic(NEXO_FURNITURE_PROPERTY) ? 'furniture' : 'nothing';
}

/** The YAML key of what the item places, for the key rail. */
function placesKey(places: ItemPlaces, target: PackTargetId): string | undefined {
  if (places === 'nothing') return undefined;
  if (target === 'craftengine') return places;
  return places === 'block' ? NEXO_BLOCK_PROPERTY : NEXO_FURNITURE_PROPERTY;
}

/** The Nothing / Block / Furniture choice; leaving a block or furniture asks first, since that removes it. */
export function PlacesControl({ item }: { item: Item }) {
  const t = useTranslations('item');
  const target = useOpenProject().target;
  const places = itemPlaces(item, target);
  const choose = async (next: ItemPlaces) => {
    if (next === places) return;
    if (places !== 'nothing') {
      const ok = await confirm({
        title: t(`block.leave.${places}.title`),
        message: t(`block.leave.${places}.message`),
        confirmLabel: t(`block.leave.${places}.confirm`),
        destructive: true,
      });
      if (!ok) return;
    }
    setItemPlaces(item.id, next);
  };
  return (
    <SegmentedControl
      aria-label={t('block.places')}
      value={places}
      options={PLACES.map((value) => ({ value, label: t(`block.placesOptions.${value}`) }))}
      onChange={(next) => void choose(next)}
    />
  );
}

/** CraftEngine's block settings as a feature list with "Add setting". */
function BlockSettingsSection({ item }: { item: Item }) {
  const t = useTranslations('item');
  const schema = useProjectForm();
  const settings = useBlockSettings(item, schema, 'block');
  return (
    <Section
      id={BLOCK_SETTINGS_SECTION_ID}
      title={t('block.settings.title')}
      description={t('block.settings.description')}
      meta={settings.active.length > 0 && <StatusPill tone="muted" label={String(settings.active.length)} />}
      actions={settings.button}
    >
      <BlockSettingsRows
        item={item}
        active={settings.active}
        scope="block"
        version={settings.version}
        empty={t('block.settings.empty')}
        onAdd={settings.open}
      />
      {settings.dialog}
    </Section>
  );
}

/** The Block section: what the item places, and for a block its behaviors, states and settings (see the module). */
export function BlockSection({ item }: { item: Item }) {
  const t = useTranslations('item');
  const target = useOpenProject().target;
  const places = itemPlaces(item, target);
  const block = target === 'craftengine' ? craftEngineBlock(item.config) : null;
  return (
    <>
      <Section id={BLOCK_SECTION_ID} title={t('block.title')} description={t(`block.description.${target}`)}>
        <FieldGroup>
          <FieldRow label={t('block.places')} help={t('block.placesHelp')} yamlKey={placesKey(places, target)}>
            <div data-testid="item-places">
              <PlacesControl item={item} />
            </div>
          </FieldRow>
          {places !== 'block' && <p className="m-0 text-meta text-text-muted">{t(`block.placesNote.${places}`)}</p>}
          {places === 'block' && target === 'nexo' && <NexoBlockBasics item={item} />}
        </FieldGroup>
      </Section>
      {block && (
        <>
          <BehaviorsSection item={item} block={block} />
          <StatesSection item={item} block={block} />
          <BlockSettingsSection item={item} />
        </>
      )}
      {places === 'block' && target === 'nexo' && (
        <>
          <NexoBlockFeatures item={item} />
          <BlockModelsSection item={item} />
        </>
      )}
    </>
  );
}

/** Whether the project's form has CraftEngine's block settings. */
export const hasBlockSettings = (groups: Array<{ id: string }>) => groups.some((group) => group.id === BLOCK_SETTINGS_GROUP);
