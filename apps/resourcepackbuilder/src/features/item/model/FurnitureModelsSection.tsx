import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import {
  CONNECT_SLOTS,
  FURNITURE_MODEL_SLOTS,
  furnitureConfig,
  furnitureStateNames,
  type Item,
  PLACEMENT_SLOTS,
  stateDef,
  stateNameError,
  type StateNameError,
  type VariantSlot,
} from '@resourcepackbuilder/core/project';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Card, CardContent } from '@resourcepackbuilder/ui/components/card';
import { AutoGrid } from '@resourcepackbuilder/ui';
import { addFurnitureState } from '../../../commands/items';
import { prompt } from '../../../store/dialogs';
import { Section } from '../../../components/Section';
import { ModelSlot } from './ModelSlot';

const CONNECT_DEFS = FURNITURE_MODEL_SLOTS.filter((def) => CONNECT_SLOTS.some((c) => c.slot === def.slot));
const PLACEMENT_DEFS = FURNITURE_MODEL_SLOTS.filter((def) => PLACEMENT_SLOTS.some((p) => p.slot === def.slot));
const LIGHT_SLOT: VariantSlot = 'light_on';
const LIGHT_DEFS = FURNITURE_MODEL_SLOTS.filter((def) => def.slot === LIGHT_SLOT);

/** Message key below `item.slots` per state name error. */
const STATE_NAME_ERROR_KEYS = {
  required: 'nameRequired',
  invalid: 'nameInvalid',
  taken: 'nameTaken',
} as const satisfies Record<StateNameError, string>;

function SlotGroup({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <Section title={title} description={description} className="gap-2">
      <AutoGrid min="10rem" className="gap-2">
        {children}
      </AutoGrid>
    </Section>
  );
}

/** Furniture models (connecting, placement, light, states) – only shown when the furniture mechanic is active. */
export function FurnitureModelsSection({ item }: { item: Item }) {
  const t = useTranslations('item');
  const tCommon = useTranslations('common');
  if (!furnitureConfig(item.config)) return null;
  const states = furnitureStateNames(item.config);

  const addState = async () => {
    const name = await prompt({
      title: t('slots.newState'),
      label: t('slots.stateName'),
      initial: '',
      confirmLabel: tCommon('create'),
      validate: (value) => {
        const error = stateNameError(item.config, value);
        return error && t(`slots.${STATE_NAME_ERROR_KEYS[error]}`);
      },
    });
    if (name !== null) addFurnitureState(item.id, name.trim());
  };

  return (
    <Section title={t('slots.furnitureTitle')}>
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
    </Section>
  );
}
