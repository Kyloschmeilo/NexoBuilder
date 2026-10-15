/**
 * Additional models for which ResourcepackBuilder writes ItemModels (assets/<ns>/items/…) itself:
 * custom inventory icon, connectable furniture, placement, light and state models of furniture
 * as well as stack stages of blocks. The matching values in the item configuration are supplied too.
 */
import type { ConfigObject, IssueLevel, Item, JavaModelJson, Project } from '../types';
import { getPath } from '../nexo/configPath';
import { CONNECT_SLOTS, PLACEMENT_SLOTS, stateDef, type VariantSlot } from '../nexo/variants';
import { compareVersions, isPlainObject } from '../util';
import type { FileContent } from './plan';

export interface ExtraConfig {
  path: string[];
  value: unknown;
  /** Only set if the user has not entered anything there themselves */
  ifMissing?: boolean;
}

export interface ExtraModelsResult {
  /** Custom ItemModel for the item (Components.item_model) */
  itemModel: string | null;
  config: ExtraConfig[];
}

interface ExtraModelsContext {
  project: Project;
  item: Item;
  ns: string;
  modelKey: string | null;
  /** Path of the main model, e.g. item/moebel/sofa */
  modelPath: string;
  folderSlugs: string[];
  writeModel: (model: NonNullable<Item['model']>, modelPath: string, what: string) => { key: string; json: JavaModelJson };
  packFiles: Map<string, FileContent>;
  add: (level: IssueLevel, message: string) => void;
  variantKeys: Partial<Record<VariantSlot, string | string[]>>;
}

type ItemModelNode = Record<string, unknown>;

const modelRef = (key: string): ItemModelNode => ({ type: 'minecraft:model', model: key });

function json(value: unknown): string {
  return JSON.stringify(value, null, 2) + '\n';
}

export function planExtraModels(ctx: ExtraModelsContext): ExtraModelsResult {
  const { project, item, ns, modelKey, modelPath, packFiles, add } = ctx;
  const result: ExtraModelsResult = { itemModel: null, config: [] };
  const variants = item.variants ?? {};
  const has = (slot: VariantSlot) => (variants[slot]?.length ?? 0) > 0;
  const version = project.settings.minecraftVersion;
  const atLeast = (v: string) => compareVersions(version, v) >= 0;
  const defBase = [...ctx.folderSlugs, item.nexoId].join('/');
  const writeDefinition = (path: string, model: ItemModelNode, extra: Record<string, unknown> = {}) => {
    packFiles.set(`assets/${ns}/items/${path}.json`, json({ model, ...extra }));
    return `${ns}:${path}`;
  };
  const writeSlot = (slot: VariantSlot, suffix: string, what: string): string | null => {
    const model = variants[slot]?.[0];
    return model ? ctx.writeModel(model, `${modelPath}-${suffix}`, what).key : null;
  };

  const stateSlots = (Object.keys(variants) as VariantSlot[]).filter((s) => s.startsWith('state:') && has(s));
  const furnitureSlots = [
    ...CONNECT_SLOTS.map((c) => c.slot),
    ...PLACEMENT_SLOTS.map((p) => p.slot),
    'light_on' as const,
    ...stateSlots,
  ].filter(has);
  const used = [...furnitureSlots, ...(has('gui_model') ? ['gui_model' as const] : []), ...(has('stack_models') ? ['stack_models' as const] : [])];
  if (used.length === 0) return result;
  if (!modelKey) {
    add('error', 'GUI Model, Furniture-Modelle und Stackable brauchen ein Hauptmodell. Bitte zuerst ein Modell importieren.');
    return result;
  }

  const config = item.config as ConfigObject;
  const furniture = getPath(config, ['Mechanics', 'furniture']);
  const furnitureActive = isPlainObject(furniture);
  if (furnitureSlots.length > 0 && !furnitureActive) {
    add('warning', 'Es sind Furniture-Modelle hochgeladen, aber die Mechanic „Furniture“ fehlt – sie werden nicht exportiert.');
  }

  /* ------------------------------------------------ Main ItemModel: connectable + inventory icon */
  let main: ItemModelNode | null = null;
  if (furnitureActive) {
    const connect = CONNECT_SLOTS.map((c) => ({ ...c, key: has(c.slot) ? writeSlot(c.slot, c.state, `Connectable (${c.state})`) : null })).filter(
      (c): c is typeof c & { key: string } => c.key !== null,
    );
    if (connect.length > 0) {
      if (!atLeast('1.21.4')) add('error', 'Connectable mit eigenen Modellen braucht mindestens Minecraft 1.21.4.');
      if (connect.length < CONNECT_SLOTS.length) {
        add('info', `Connectable: ${CONNECT_SLOTS.length - connect.length} von 5 Modellen fehlen – dort wird das Hauptmodell angezeigt.`);
      }
      const userType = isPlainObject(furniture) && isPlainObject(furniture.connectable) ? furniture.connectable.type : undefined;
      if (userType && userType !== 'ITEM_MODEL') {
        add('warning', `Connectable ist auf „${String(userType)}“ eingestellt – für die hochgeladenen Modelle wird ITEM_MODEL verwendet.`);
      }
      result.config.push({ path: ['Mechanics', 'furniture', 'connectable', 'type'], value: 'ITEM_MODEL' });
      main = {
        type: 'minecraft:select',
        property: 'minecraft:block_state',
        block_state_property: 'connectable',
        cases: connect.map((c) => ({ when: c.state, model: modelRef(c.key) })),
        fallback: modelRef(modelKey),
      };
    }
  }
  if (has('gui_model')) {
    const guiKey = writeSlot('gui_model', 'gui', 'GUI Model');
    if (guiKey) {
      main = {
        type: 'minecraft:select',
        property: 'minecraft:display_context',
        cases: [{ when: 'gui', model: modelRef(guiKey) }],
        fallback: main ?? modelRef(modelKey),
      };
    }
  }
  if (main) {
    if (!atLeast('1.21.4')) add('error', 'Ein GUI Model braucht mindestens Minecraft 1.21.4 (ItemModels).');
    const packVariants = Object.keys(ctx.variantKeys);
    if (packVariants.length > 0) {
      add('warning', `Mit GUI Model bzw. Connectable-Modellen wirken ${packVariants.join(', ')} nicht mehr.`);
    }
    const oversized = getPath(config, ['Pack', 'oversized_in_gui']) === true ? { oversized_in_gui: true } : {};
    result.itemModel = writeDefinition(defBase, main, oversized);
  }

  /* ------------------------------------------------ Furniture: placement, light, states */
  if (furnitureActive) {
    const needItemModel = (what: string) => {
      if (!atLeast('1.21.2')) add('error', `${what}: eigene Furniture-Modelle brauchen mindestens Minecraft 1.21.2.`);
    };
    for (const { slot, placement } of PLACEMENT_SLOTS) {
      if (!has(slot)) continue;
      const key = writeSlot(slot, `placement_${placement}`, `Placement (${placement})`);
      if (!key) continue;
      needItemModel('Placements');
      const itemModel = writeDefinition(`${defBase}-placement_${placement}`, modelRef(key));
      result.config.push({ path: ['Mechanics', 'furniture', 'placements', placement, 'item_model'], value: itemModel, ifMissing: true });
    }
    if (has('light_on')) {
      const key = writeSlot('light_on', 'light_on', 'Toggled (Light On)');
      if (key) {
        needItemModel('Toggled (Light On)');
        const itemModel = writeDefinition(`${defBase}-light_on`, modelRef(key));
        result.config.push({ path: ['Mechanics', 'furniture', 'lights', 'toggled_item_model'], value: itemModel, ifMissing: true });
        result.config.push({ path: ['Mechanics', 'furniture', 'lights', 'toggleable'], value: true, ifMissing: true });
      }
    }
    const states = isPlainObject(furniture) && isPlainObject(furniture.states) ? furniture.states : {};
    for (const slot of stateSlots) {
      const name = slot.slice('state:'.length);
      const def = stateDef(name);
      const state = states[name];
      if (!isPlainObject(state)) {
        add('warning', `Für den State „${name}“ ist ein Modell hochgeladen, den State gibt es aber nicht mehr – das Modell wird nicht exportiert.`);
        continue;
      }
      const type = typeof state.type === 'string' ? state.type : undefined;
      if (type && type !== 'ITEM_MODEL' && type !== 'FURNITURE') {
        add('warning', `State „${name}“ ist vom Typ ${type} – das hochgeladene Modell wird dafür nicht verwendet.`);
        continue;
      }
      const key = writeSlot(slot, def.suffix, `State „${name}“`);
      if (!key) continue;
      needItemModel(`State „${name}“`);
      const itemModel = writeDefinition(`${defBase}-${def.suffix}`, modelRef(key));
      result.config.push({ path: ['Mechanics', 'furniture', 'states', name, 'type'], value: 'ITEM_MODEL', ifMissing: true });
      result.config.push({ path: ['Mechanics', 'furniture', 'states', name, 'item_model'], value: itemModel, ifMissing: true });
    }
  }

  /* ------------------------------------------------ Blocks: stack stages */
  if (has('stack_models')) {
    const block = getPath(config, ['Mechanics', 'custom_block']);
    if (!isPlainObject(block)) {
      add('warning', 'Es sind Stackable-Modelle hochgeladen, aber die Mechanic „Custom Block“ fehlt – sie werden nicht exportiert.');
    } else {
      if (block.type !== 'STRINGBLOCK') add('warning', 'Stackable funktioniert nur mit dem Block-Typ STRINGBLOCK.');
      const keys = (variants.stack_models ?? []).map((m, i) => ctx.writeModel(m, `${modelPath}-stack_${i + 1}`, `Stackable ${i + 1}`).key);
      result.config.push({ path: ['Mechanics', 'custom_block', 'stackable'], value: keys.map((model) => ({ model })), ifMissing: true });
    }
  }
  return result;
}
