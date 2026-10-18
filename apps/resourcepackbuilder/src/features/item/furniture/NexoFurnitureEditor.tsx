/**
 * The body of a Nexo item's Furniture section (the furniture mechanic, `Mechanics.furniture`). A preview of the
 * furniture with its hitboxes and seats sits beside the hitbox and seat lists; below come the further options as
 * collapsed feature rows (only the ones the furniture sets, more through "Add option") and the extra models.
 */
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { type Field, type ObjectField, propertyById } from '@resourcepackbuilder/core/form';
import { NEXO_DOCS, nexoHitboxEntries } from '@resourcepackbuilder/core/nexo';
import type { ConfigObject, ConfigValue, Item } from '@resourcepackbuilder/core/project';
import { EmptyHint } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { CatalogDialog, type CatalogItem, versionBadges } from '../../../components/catalog';
import { FeatureList } from '../../../components/features';
import { useSchemaText } from '../../../components/useSchemaText';
import { updateNexoFurniture } from '../../../commands/items';
import { useOpenProject } from '../../../store/project';
import { useProjectForm } from '../properties/useProjectForm';
import { NexoFurnitureModels } from './FurnitureModelsSection';
import { NexoFurniturePreview } from './FurniturePreview';
import { withKey } from './DisplayElementsEditor';
import { entryCount, NexoHitboxList, NexoSeatList } from './nexoEntryEditors';
import { NEXO_FURNITURE_PROPERTY } from './model';
import { FieldFeatureRow, FurnitureGroup } from './parts';

/** Keys with a list of their own beside the preview. */
const LISTED_KEYS = new Set(['hitbox', 'seats']);

/** The catalog categories of the furniture's further options, in display order, with their keys. */
const OPTION_CATEGORIES: Record<string, readonly string[]> = {
  look: [
    'properties',
    'rotatable',
    'restricted_rotation',
    'text_entities',
    'connectable',
    'states',
    'placements',
    'item',
    'item_model',
    'modelengine_id',
  ],
  use: ['lights', 'beds', 'storage', 'jukebox', 'door', 'clickActions', 'blocklocker'],
  placing: ['limited_placing', 'preview_placement', 'waterloggable', 'evolution', 'farmland_required'],
  breaking: ['drop', 'block_sounds', 'hardness', 'blast_resistance'],
};
/** Options most furniture sets, offered first. */
const COMMON_OPTIONS = new Set(['properties', 'rotatable', 'restricted_rotation', 'lights', 'drop', 'storage']);

const categoryOf = (key: string) => Object.entries(OPTION_CATEGORIES).find(([, keys]) => keys.includes(key))?.[0];

/** A Nexo furniture's editor; `furniture` is the item's `Mechanics.furniture`. */
export function NexoFurnitureEditor({ item, furniture }: { item: Item; furniture: Record<string, unknown> }) {
  const t = useTranslations('item.furniture');
  const text = useSchemaText();
  const project = useOpenProject();
  const def = propertyById(useProjectForm(), NEXO_FURNITURE_PROPERTY);
  const [isAdding, setIsAdding] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);
  if (!def || def.field.type !== 'object') return null;
  const fields: ObjectField['fields'] = def.field.fields;
  const fieldOf = (key: string) => fields.find((f) => f.key === key);
  const set = (key: string, value: unknown, historyKey?: string) =>
    updateNexoFurniture(item.id, (f) => withKey(f, key, value as ConfigValue | undefined), historyKey && `furniture-${historyKey}`);

  const options = fields.filter((f) => !LISTED_KEYS.has(f.key));
  const shown = options.filter((f) => furniture[f.key] !== undefined);
  const hitboxField = fieldOf('hitbox');
  const seatsField = fieldOf('seats');

  const catalogItems: CatalogItem[] = options.map((f: Field) => ({
    id: f.key,
    label: text(f.label) ?? f.key,
    description: text(f.help),
    yamlKey: `Mechanics.furniture.${f.key}`,
    category: categoryOf(f.key),
    common: COMMON_OPTIONS.has(f.key),
    docs: f.docs ? { url: f.docs, target: 'nexo' } : undefined,
    badges: versionBadges(f, project.settings.minecraftVersion),
    added: furniture[f.key] !== undefined,
  }));
  const categories = Object.keys(OPTION_CATEGORIES).map((id) => ({ id, label: t(`optionCategories.${id}` as never) }));
  return (
    <div className="@container/furniture flex min-w-0 flex-col gap-6">
      <div className="grid min-w-0 gap-5 @2xl/furniture:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="min-w-0 @2xl/furniture:sticky @2xl/furniture:top-3 @2xl/furniture:self-start">
          <NexoFurniturePreview item={item} furniture={furniture} />
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          {hitboxField && (
            <FurnitureGroup
              title={t('hitboxes')}
              count={nexoHitboxEntries(furniture.hitbox).length}
              docs={{ url: NEXO_DOCS.furniture.hitbox, target: 'nexo' }}
            >
              <NexoHitboxList label={t('hitboxes')} value={furniture.hitbox} onChange={(value) => set('hitbox', value, 'hitbox')} />
            </FurnitureGroup>
          )}
          {seatsField && (
            <FurnitureGroup
              title={t('seats')}
              count={entryCount(furniture.seats)}
              docs={{ url: NEXO_DOCS.furniture.seats, target: 'nexo' }}
            >
              <NexoSeatList label={t('seats')} value={furniture.seats} onChange={(value) => set('seats', value, 'seats')} />
            </FurnitureGroup>
          )}
        </div>
      </div>

      <FurnitureGroup
        title={t('options')}
        count={shown.length}
        actions={
          <Button type="button" variant="ghost" size="sm" className="text-primary hover:text-primary" onClick={() => setIsAdding(true)}>
            <Plus /> {t('addOption')}
          </Button>
        }
      >
        {shown.length === 0 ? (
          <EmptyHint actionLabel={t('addOption')} onAction={() => setIsAdding(true)}>
            {t('noOptions')}
          </EmptyHint>
        ) : (
          <FeatureList>
            {shown.map((f) => (
              <FieldFeatureRow
                key={f.key}
                field={f}
                value={furniture[f.key]}
                yamlKey={f.key}
                open={openKey === f.key}
                onOpenChange={(open) => setOpenKey(open ? f.key : null)}
                onChange={(value) => set(f.key, value, f.key)}
                onRemove={() => set(f.key, undefined)}
              />
            ))}
          </FeatureList>
        )}
      </FurnitureGroup>

      {item.model && (
        <FurnitureGroup title={t('models')}>
          <NexoFurnitureModels item={item} />
        </FurnitureGroup>
      )}

      <CatalogDialog
        open={isAdding}
        onOpenChange={setIsAdding}
        title={t('addOptionTitle')}
        items={catalogItems}
        categories={categories}
        addLabel={t('addOption')}
        multi
        onAdd={(keys) => {
          updateNexoFurniture(item.id, (f) =>
            keys.reduce<ConfigObject>((next, key) => {
              const f = fieldOf(key);
              return f && next[key] === undefined ? withKey(next, key, startValue(f)) : next;
            }, f),
          );
          setOpenKey(keys[keys.length - 1] ?? null);
        }}
        onJumpTo={(key) => {
          setOpenKey(key);
          requestAnimationFrame(() =>
            document.querySelector(`[data-feature-id="${CSS.escape(key)}"]`)?.scrollIntoView({ block: 'center' }),
          );
        }}
      />
    </div>
  );
}

/**
 * The value a new option starts with: switches on, a select at its first option, a choice in its first form, sections
 * and lists empty, other values empty until the user types one (kept as null, so the row stays).
 */
export function startValue(field: Field): ConfigValue {
  switch (field.type) {
    case 'boolean':
      return true;
    case 'select':
      return field.options[0]?.value ?? null;
    case 'choice':
      return (field.choices[0]?.newValue() as ConfigValue | undefined) ?? null;
    case 'object':
    case 'map':
    case 'presence':
      return {};
    case 'objectList':
    case 'typedList':
    case 'stringList':
    case 'multiSelect':
      return [];
    default:
      return null;
  }
}
