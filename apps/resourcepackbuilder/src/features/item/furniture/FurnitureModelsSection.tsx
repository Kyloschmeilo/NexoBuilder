/**
 * The extra models of a Nexo furniture: the connecting pieces, the placements on floor, wall and roof, the model while
 * the light is on, and one model per state. Each kind is a collapsed feature row ("2 of 5 set") that opens to one
 * compact row per model with its file, Replace and Remove, or "Add model".
 */
import { useTranslations } from 'next-intl';
import { Box, Plus, RefreshCw, Trash2 } from 'lucide-react';
import {
  CONNECT_SLOTS,
  FURNITURE_MODEL_SLOTS,
  furnitureStateNames,
  type Item,
  PLACEMENT_SLOTS,
  stateDef,
  stateNameError,
  type StateNameError,
  type VariantDef,
} from '@resourcepackbuilder/core/project';
import { IconButton, Panel, pickFiles, Thumb, Tip } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { addFurnitureState, removeVariant, setVariantModels } from '../../../commands/items';
import { FeatureList, FeatureRow } from '../../../components/features';
import { MODEL_ACCEPT } from '../../../components/modelFiles';
import { useSchemaText } from '../../../components/useSchemaText';
import { useThumbnail } from '../../../components/useThumbnail';
import { prompt } from '../../../store/dialogs';
import { useModelImport } from '../model/useModelImport';

const CONNECT_DEFS = FURNITURE_MODEL_SLOTS.filter((def) => CONNECT_SLOTS.some((c) => c.slot === def.slot));
const PLACEMENT_DEFS = FURNITURE_MODEL_SLOTS.filter((def) => PLACEMENT_SLOTS.some((p) => p.slot === def.slot));
const LIGHT_DEFS = FURNITURE_MODEL_SLOTS.filter((def) => def.slot === 'light_on');

/** Message key below `item.slots` per state name error. */
const STATE_NAME_ERROR_KEYS = {
  required: 'nameRequired',
  invalid: 'nameInvalid',
  taken: 'nameTaken',
} as const satisfies Record<StateNameError, string>;

const THUMB_SIZE = 28;

/** One model slot as a row: its name, then the model's file with Replace and Remove, or "Add model". */
function ModelSlotRow({ item, def }: { item: Item; def: VariantDef }) {
  const t = useTranslations('item');
  const tCommon = useTranslations('common');
  const text = useSchemaText();
  const { importModels } = useModelImport();
  const model = item.variants?.[def.slot]?.[0] ?? null;
  const thumb = useThumbnail(model);
  const name = text(def.label, def.params);
  const pick = async () => {
    const files = await pickFiles(MODEL_ACCEPT);
    if (!files.length) return;
    const [imported] = await importModels(files);
    if (imported) setVariantModels(item.id, def.slot, [imported]);
  };
  return (
    <li data-slot="model-slot" className="flex min-h-9 min-w-0 items-center gap-2 px-2 py-1">
      <Tip label={text(def.description, def.params)}>
        <span className="w-32 flex-none truncate text-label text-text">{name}</span>
      </Tip>
      {model ? (
        <>
          <Thumb size={THUMB_SIZE} src={thumb} fallback={<Box className="size-3.5 opacity-60" />} />
          <span className="min-w-0 flex-1 truncate font-mono text-meta text-text-muted">{model.fileName}</span>
          <IconButton label={t('model.replace')} size="icon-xs" onClick={() => void pick()}>
            <RefreshCw />
          </IconButton>
          <IconButton label={tCommon('remove')} size="icon-xs" variant="ghost-destructive" onClick={() => removeVariant(item.id, def.slot)}>
            <Trash2 />
          </IconButton>
        </>
      ) : (
        <Button type="button" variant="ghost" size="sm" className="ml-auto text-primary hover:text-primary" onClick={() => void pick()}>
          <Plus /> {t('furniture.addModel')}
        </Button>
      )}
    </li>
  );
}

function SlotRows({ item, defs }: { item: Item; defs: VariantDef[] }) {
  return (
    <Panel>
      <ul className="m-0 list-none divide-y divide-line p-0">
        {defs.map((def) => (
          <ModelSlotRow key={def.slot} item={item} def={def} />
        ))}
      </ul>
    </Panel>
  );
}

/** The extra models of a Nexo furniture, grouped by what they are for. */
export function NexoFurnitureModels({ item }: { item: Item }) {
  const t = useTranslations('item');
  const tCommon = useTranslations('common');
  const stateDefs = furnitureStateNames(item.config).map(stateDef);
  const setCount = (defs: VariantDef[]) => defs.filter((def) => item.variants?.[def.slot]?.length).length;
  const summary = (defs: VariantDef[]) =>
    defs.length === 0 ? t('furniture.noStates') : t('furniture.modelsSet', { set: setCount(defs), total: defs.length });

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

  const groups: Array<{ id: string; label: string; help: string; defs: VariantDef[] }> = [
    { id: 'connect', label: t('slots.connectable'), help: t('slots.connectableHelp'), defs: CONNECT_DEFS },
    { id: 'placements', label: t('slots.placements'), help: t('slots.placementsHelp'), defs: PLACEMENT_DEFS },
    { id: 'light', label: t('slots.lights'), help: t('slots.lightsHelp'), defs: LIGHT_DEFS },
  ];

  return (
    <FeatureList>
      {groups.map((group) => (
        <FeatureRow key={group.id} featureId={`models-${group.id}`} label={group.label} summary={summary(group.defs)}>
          <p className="mt-0 mb-2 text-meta text-text-muted">{group.help}</p>
          <SlotRows item={item} defs={group.defs} />
        </FeatureRow>
      ))}
      <FeatureRow featureId="models-states" label={t('slots.states')} summary={summary(stateDefs)}>
        <p className="mt-0 mb-2 text-meta text-text-muted">{t('slots.statesHelp')}</p>
        <div className="flex flex-col gap-1.5">
          {stateDefs.length > 0 && <SlotRows item={item} defs={stateDefs} />}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-start text-primary hover:text-primary"
            onClick={() => void addState()}
          >
            <Plus /> {t('slots.addState')}
          </Button>
        </div>
      </FeatureRow>
    </FeatureList>
  );
}
