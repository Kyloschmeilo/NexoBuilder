import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import type { Item } from '@resourcepackbuilder/core/project/types';
import { getPath } from '@resourcepackbuilder/core/nexo/configPath';
import { CONNECT_SLOTS, FURNITURE_MODEL_SLOTS, PLACEMENT_SLOTS, stateDef, type VariantSlot } from '@resourcepackbuilder/core/nexo/variants';
import { isPlainObject } from '@resourcepackbuilder/core/object';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Card, CardContent } from '@resourcepackbuilder/ui/components/card';
import { addFurnitureState } from '../../../commands/items';
import { prompt } from '../../../store/dialogs';
import { EditorSection } from '../EditorSection';
import { ModelSlot } from './ModelSlot';

/** Keys of Mechanics.furniture.states that are settings, not states. */
const RESERVED_STATE_KEYS = new Set(['next_after', 'reset_after', 'condition']);
const STATE_NAME_PATTERN = /^[A-Za-z0-9_-]+$/;

const CONNECT_DEFS = FURNITURE_MODEL_SLOTS.filter((def) => CONNECT_SLOTS.some((c) => c.slot === def.slot));
const PLACEMENT_DEFS = FURNITURE_MODEL_SLOTS.filter((def) => PLACEMENT_SLOTS.some((p) => p.slot === def.slot));
const LIGHT_SLOT: VariantSlot = 'light_on';
const LIGHT_DEFS = FURNITURE_MODEL_SLOTS.filter((def) => def.slot === LIGHT_SLOT);

function SlotGroup({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <div className="font-heading text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,10rem),1fr))] gap-2">{children}</div>
    </div>
  );
}

/** Furniture models (connecting, placement, light, states) – only shown when the furniture mechanic is active. */
export function FurnitureModelsSection({ item }: { item: Item }) {
  const t = useTranslations('item');
  const tCommon = useTranslations('common');
  const furniture = getPath(item.config, ['Mechanics', 'furniture']);
  if (!isPlainObject(furniture)) return null;
  const states = isPlainObject(furniture.states) ? Object.keys(furniture.states).filter((key) => !RESERVED_STATE_KEYS.has(key)) : [];

  const addState = async () => {
    const name = await prompt({
      title: t('slots.newState'),
      label: t('slots.stateName'),
      initial: '',
      confirmLabel: tCommon('create'),
      validate: (value) => {
        const trimmed = value.trim();
        if (!trimmed) return t('slots.nameRequired');
        if (!STATE_NAME_PATTERN.test(trimmed)) return t('slots.nameInvalid');
        if (RESERVED_STATE_KEYS.has(trimmed) || states.includes(trimmed)) return t('slots.nameTaken');
        return null;
      },
    });
    if (name !== null) addFurnitureState(item.id, name.trim());
  };

  return (
    <EditorSection title={t('slots.furnitureTitle')}>
      <Card className="rounded-lg py-0">
        <CardContent className="flex flex-col gap-5 py-5">
          <SlotGroup title={t('slots.connectable')} description={t('slots.connectableHelp')}>
            {CONNECT_DEFS.map((def) => (
              <ModelSlot key={def.slot} item={item} def={def} />
            ))}
          </SlotGroup>
          <SlotGroup title={t('slots.placements')} description={t('slots.placementsHelp')}>
            {PLACEMENT_DEFS.map((def) => (
              <ModelSlot key={def.slot} item={item} def={def} />
            ))}
          </SlotGroup>
          <SlotGroup title={t('slots.lights')} description={t('slots.lightsHelp')}>
            {LIGHT_DEFS.map((def) => (
              <ModelSlot key={def.slot} item={item} def={def} />
            ))}
          </SlotGroup>
          <SlotGroup title={t('slots.states')} description={t('slots.statesHelp')}>
            {states.map((name) => (
              <ModelSlot key={name} item={item} def={stateDef(name)} />
            ))}
            <Button
              variant="outline"
              className="h-auto min-h-30 flex-col border-dashed font-heading text-xs tracking-[0.08em] text-muted-foreground uppercase"
              onClick={() => void addState()}
            >
              <Plus className="size-4.5" />
              {t('slots.addState')}
            </Button>
          </SlotGroup>
        </CardContent>
      </Card>
    </EditorSection>
  );
}
