/**
 * Equipment models of armor sets: all items with the same set ID share one equipment model
 * (assets/<ns>/equipment/<set>.json) with one texture per layer, optionally dyeable, with an undyed overlay texture
 * or (wings) with the player's own texture. CraftEngine gets the same layers as an `equipments:` entry.
 */
import { createIssue, issueReporter, type Issue } from '@resourcepackbuilder/utils';
import {
  compareVersions,
  formatResourceLocation,
  type ModelTexture,
  NAMESPACE_PATTERN,
  validateTexture,
} from '@resourcepackbuilder/minecraft';
import {
  ARMOR_LAYERS,
  armorColorInt,
  type ArmorEquipmentType,
  type ArmorGroup,
  armorLayerFrame,
  armorOverlayTexture,
  armorTexture,
  type Item,
  type ItemArmor,
  itemFrame,
  itemTarget,
  type Project,
  resolveAsset,
} from '@resourcepackbuilder/core/project';
import type { PackWriter } from './packWriter';
import { equipmentModelFile, equipmentTextureFile } from './paths';

export interface ArmorSet {
  id: string;
  /** Layer type (humanoid, wings, wolf_body …) → texture */
  textures: Map<string, ModelTexture>;
  /** Layer type → overlay texture, drawn over the layer's texture and never dyed */
  overlays: Map<string, ModelTexture>;
  groups: Set<ArmorGroup>;
  /** Slot from the layers (null = player armor, slot comes from the material) */
  slot: string | null;
  entities: string[];
  /** Elytra wings: item needs the glider component */
  glider: boolean;
  /** The layers take the item's dye color */
  dyeable: boolean;
  /** Color of the dyeable layers while undyed (signed ARGB), null = the game's default */
  undyedColor: number | null;
  /** The wings show the player's own elytra or cape texture */
  usePlayerTexture: boolean;
  /** CraftEngine's equipment type */
  type: ArmorEquipmentType;
  items: Item[];
}

/** One layer entry of an equipment model */
export interface EquipmentLayer {
  texture: string;
  dyeable?: { color_when_undyed?: number };
  use_player_texture?: true;
}

/** The trimmed set ID of an armor item, null if it has none. */
function armorSetId(item: Item): string | null {
  return item.armor?.set.trim() || null;
}

/** Collects the armor sets of all items and checks their layers. */
export function collectArmorSets(items: Item[], targetVersion: string, issues: Issue[]): Map<string, ArmorSet> {
  const sets = new Map<string, ArmorSet>();
  for (const item of items) {
    if (!item.armor) continue;
    const report = issueReporter(issues, { target: itemTarget(item), context: [itemFrame(item)] });
    const setId = armorSetId(item);
    if (!setId) {
      report('error', 'plan.armorSetIdMissing');
      continue;
    }
    if (!NAMESPACE_PATTERN.test(setId)) {
      report('error', 'plan.armorSetIdInvalid', { set: setId });
      continue;
    }
    const set: ArmorSet = sets.get(setId) ?? {
      id: setId,
      textures: new Map(),
      overlays: new Map(),
      groups: new Set(),
      slot: null,
      entities: [],
      glider: false,
      dyeable: false,
      undyedColor: null,
      usePlayerTexture: false,
      type: 'component',
      items: [],
    };
    sets.set(setId, set);
    set.items.push(item);
    addOptions(set, item);
    for (const layer of ARMOR_LAYERS) {
      const texture = resolveAsset(item, armorTexture(item.armor, layer));
      const overlay = resolveAsset(item, armorOverlayTexture(item.armor, layer));
      if (!texture && !overlay) continue;
      const frame = armorLayerFrame(layer.label);
      for (const issue of [...(texture ? validateTexture(texture) : []), ...(overlay ? validateTexture(overlay) : [])]) {
        report(issue.level, issue.code, issue.args, [frame]);
      }
      if (layer.minVersion && compareVersions(targetVersion, layer.minVersion) < 0) {
        report('error', 'plan.armorLayerNeedsVersion', { version: layer.minVersion, target: targetVersion }, [frame]);
      }
      if (layer.group === 'player' && layer.sizeHint && texture?.width && texture.height && texture.width !== texture.height * 2) {
        report('warning', 'plan.armorLayerAspect', { width: texture.width, height: texture.height }, [frame]);
      }
      if (overlay?.dataUrl && !set.overlays.has(layer.equipment)) set.overlays.set(layer.equipment, overlay);
      if (!texture) continue;
      const existing = set.textures.get(layer.equipment);
      if (existing && existing.dataUrl !== texture.dataUrl) {
        report('warning', 'plan.armorLayerConflict', { set: setId }, [frame]);
      } else if (!existing && texture.dataUrl) {
        set.textures.set(layer.equipment, texture);
        set.groups.add(layer.group);
        for (const entity of layer.entities ?? []) if (!set.entities.includes(entity)) set.entities.push(entity);
      }
    }
  }
  for (const set of sets.values()) finishSet(set, issues);
  return sets;
}

/** Adds the layer options of an item to its set: any item can switch them on, the first undyed color counts. */
function addOptions(set: ArmorSet, item: Item): void {
  const armor = item.armor;
  if (!armor) return;
  if (armor.dyeable) set.dyeable = true;
  if (set.undyedColor === null && armor.color_when_undyed) set.undyedColor = armorColorInt(armor.color_when_undyed);
  if (armor.use_player_texture) set.usePlayerTexture = true;
  if (armor.type === 'trim') set.type = 'trim';
}

/** Derives slot, animals and glider of a set from its layers and reports contradicting layers. */
function finishSet(set: ArmorSet, issues: Issue[]): void {
  if (set.textures.size === 0) {
    for (const item of set.items) {
      issueReporter(issues, { target: itemTarget(item), context: [itemFrame(item)] })('error', 'plan.armorSetWithoutTexture', {
        set: set.id,
      });
    }
    return;
  }
  if (set.groups.has('elytra') && set.groups.has('player')) {
    issues.push(createIssue('warning', 'plan.armorSetElytraAndPlayer', { set: set.id }));
  }
  if (set.groups.has('player')) return;
  set.slot = set.groups.has('elytra') ? 'CHEST' : set.groups.has('mob') ? 'BODY' : set.groups.has('saddle') ? 'SADDLE' : null;
  if (set.groups.has('mob') && set.groups.has('saddle')) {
    issues.push(createIssue('warning', 'plan.armorSetMobAndSaddle', { set: set.id }));
  }
  // Only the animals of the chosen slot
  set.entities = ARMOR_LAYERS.filter((l) => l.slot === set.slot && set.textures.has(l.equipment)).flatMap((l) => l.entities ?? []);
  set.glider = set.groups.has('elytra');
}

/** The texture name of a set's overlay layers (textures/entity/equipment/<layer>/<set>_overlay.png). */
const overlayName = (setId: string) => `${setId}_overlay`;

/**
 * The layers of a set's equipment model in the model's order: per layer type the set's texture (with the dye and
 * player texture options) and its overlay.
 */
export function armorLayerEntries(set: ArmorSet, namespace: string): Array<[equipment: string, layers: EquipmentLayer[]]> {
  return [...set.textures.keys()].map((equipment) => {
    const main: EquipmentLayer = { texture: formatResourceLocation(namespace, set.id) };
    if (set.dyeable) main.dyeable = set.undyedColor === null ? {} : { color_when_undyed: set.undyedColor };
    if (set.usePlayerTexture && equipment === 'wings') main.use_player_texture = true;
    const overlay = set.overlays.has(equipment) ? [{ texture: formatResourceLocation(namespace, overlayName(set.id)) }] : [];
    return [equipment, [main, ...overlay]];
  });
}

/** Writes the equipment model and layer textures of every set. */
export function writeArmorSets(writer: PackWriter, project: Project, sets: Map<string, ArmorSet>): void {
  const ns = project.namespace;
  for (const set of sets.values()) {
    if (set.textures.size === 0) continue;
    for (const [equipment, texture] of set.textures) writer.texture(equipmentTextureFile(ns, equipment, set.id), texture);
    for (const [equipment, texture] of set.overlays) {
      if (set.textures.has(equipment)) writer.texture(equipmentTextureFile(ns, equipment, overlayName(set.id)), texture);
    }
    writer.json(equipmentModelFile(ns, set.id), { layers: Object.fromEntries(armorLayerEntries(set, ns)) });
  }
}

/** The armor of an item for its configuration (null = no usable set). */
export function itemArmor(item: Item, project: Project, sets: Map<string, ArmorSet>): ItemArmor | null {
  const setId = armorSetId(item);
  const set = setId ? sets.get(setId) : undefined;
  if (!set || set.textures.size === 0) return null;
  return { assetId: formatResourceLocation(project.namespace, set.id), slot: set.slot, entities: set.entities, glider: set.glider };
}

/** The equipment layer types CraftEngine knows (its `EquipmentLayerType`); it skips any other layer. */
const CRAFT_ENGINE_LAYERS = new Set([
  'humanoid',
  'humanoid_leggings',
  'humanoid_baby',
  'wings',
  'wolf_body',
  'horse_body',
  'llama_body',
  'nautilus_body',
  'happy_ghast_body',
  'pig_saddle',
  'strider_saddle',
  'camel_saddle',
  'camel_husk_saddle',
  'horse_saddle',
  'donkey_saddle',
  'mule_saddle',
  'skeleton_horse_saddle',
  'zombie_horse_saddle',
]);

/** The layers trim-based CraftEngine equipment uses */
const TRIM_LAYERS = ['humanoid', 'humanoid_leggings'];

/**
 * The `equipments:` entry of a set for CraftEngine. A component equipment lists each layer as the asset ID, as a
 * layer object when it has options, or as a list with its overlay. A trim equipment names the full texture paths of
 * the two player armor layers. What CraftEngine cannot use is left out with a warning on the set's first item.
 */
export function craftEngineEquipment(set: ArmorSet, namespace: string, issues: Issue[]): Record<string, unknown> {
  const report = issueReporter(issues, { target: itemTarget(set.items[0]), context: [itemFrame(set.items[0])] });
  if (set.type === 'trim') {
    const layers = TRIM_LAYERS.filter((equipment) => set.textures.has(equipment));
    if (set.textures.size > layers.length || set.overlays.size > 0 || set.dyeable || set.usePlayerTexture) {
      report('warning', 'ce.armorTrimLayers', { set: set.id });
    }
    const texture = (equipment: string) => formatResourceLocation(namespace, `entity/equipment/${equipment}/${set.id}`);
    return { type: 'trim', ...Object.fromEntries(layers.map((equipment) => [equipment, texture(equipment)])) };
  }
  const out: Record<string, unknown> = { type: 'component' };
  for (const [equipment, layers] of armorLayerEntries(set, namespace)) {
    if (!CRAFT_ENGINE_LAYERS.has(equipment)) {
      report('warning', 'ce.armorLayerUnsupported', { layer: equipment });
      continue;
    }
    const [main] = layers;
    out[equipment] = layers.length > 1 ? layers : Object.keys(main).length > 1 ? main : main.texture;
  }
  return out;
}
