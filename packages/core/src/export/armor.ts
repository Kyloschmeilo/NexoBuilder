/**
 * Equipment models of armor sets: all items with the same set ID share one equipment model
 * (assets/<ns>/equipment/<set>.json) with one texture per layer.
 */
import type { Issue, IssueContext } from '../issues';
import { compareVersions } from '../minecraft/versions';
import { NAMESPACE_PATTERN } from '../minecraft/resourceLocation';
import { validateTexture } from '../model/textures';
import type { ModelTexture } from '../model/types';
import { ARMOR_LAYERS, armorTexture, type ArmorGroup } from '../nexo/armor';
import { resolveAsset } from '../project/assets';
import type { Item, Project } from '../project/types';
import { armorLayerFrame, itemFrame, itemTarget } from './frames';
import type { PackWriter } from './packWriter';
import { equipmentModelFile, equipmentTextureFile } from './paths';

interface ArmorSet {
  id: string;
  /** Layer type (humanoid, wings, wolf_body …) → texture */
  textures: Map<string, ModelTexture>;
  groups: Set<ArmorGroup>;
  /** Slot from the layers (null = player armor, slot comes from the material) */
  slot: string | null;
  entities: string[];
  /** Elytra wings: item needs the glider component */
  glider: boolean;
  items: Item[];
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
    const report = (level: Issue['level'], code: string, args: Issue['args'] = {}, context: IssueContext[] = []) =>
      issues.push({ level, code, args, target: itemTarget(item), context: [itemFrame(item), ...context] });
    const setId = armorSetId(item);
    if (!setId) {
      report('error', 'plan.armorSetIdMissing');
      continue;
    }
    if (!NAMESPACE_PATTERN.test(setId)) {
      report('error', 'plan.armorSetIdInvalid', { set: setId });
      continue;
    }
    const set: ArmorSet = sets.get(setId) ?? { id: setId, textures: new Map(), groups: new Set(), slot: null, entities: [], glider: false, items: [] };
    sets.set(setId, set);
    set.items.push(item);
    for (const layer of ARMOR_LAYERS) {
      const texture = resolveAsset(item, armorTexture(item.armor, layer));
      if (!texture) continue;
      const frame = armorLayerFrame(layer.label);
      for (const issue of validateTexture(texture)) report(issue.level, issue.code, issue.args, [frame]);
      if (layer.minVersion && compareVersions(targetVersion, layer.minVersion) < 0) {
        report('error', 'plan.armorLayerNeedsVersion', { version: layer.minVersion, target: targetVersion }, [frame]);
      }
      if (layer.group === 'player' && texture.width && texture.height && texture.width !== texture.height * 2) {
        report('warning', 'plan.armorLayerAspect', { width: texture.width, height: texture.height }, [frame]);
      }
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

/** Derives slot, animals and glider of a set from its layers and reports contradicting layers. */
function finishSet(set: ArmorSet, issues: Issue[]): void {
  if (set.textures.size === 0) {
    for (const item of set.items) {
      issues.push({ level: 'error', code: 'plan.armorSetWithoutTexture', args: { set: set.id }, target: itemTarget(item), context: [itemFrame(item)] });
    }
    return;
  }
  if (set.groups.has('elytra') && set.groups.has('player')) {
    issues.push({ level: 'warning', code: 'plan.armorSetElytraAndPlayer', args: { set: set.id } });
  }
  if (set.groups.has('player')) return;
  set.slot = set.groups.has('elytra') ? 'CHEST' : set.groups.has('mob') ? 'BODY' : set.groups.has('saddle') ? 'SADDLE' : null;
  if (set.groups.has('mob') && set.groups.has('saddle')) {
    issues.push({ level: 'warning', code: 'plan.armorSetMobAndSaddle', args: { set: set.id } });
  }
  // Only the animals of the chosen slot
  set.entities = ARMOR_LAYERS.filter((l) => l.slot === set.slot && set.textures.has(l.equipment)).flatMap((l) => l.entities ?? []);
  set.glider = set.groups.has('elytra');
}

/** Writes the equipment model and layer textures of every set. */
export function writeArmorSets(writer: PackWriter, project: Project, sets: Map<string, ArmorSet>): void {
  const ns = project.namespace;
  for (const set of sets.values()) {
    if (set.textures.size === 0) continue;
    const layers: Record<string, Array<{ texture: string }>> = {};
    for (const [equipment, texture] of set.textures) {
      writer.texture(equipmentTextureFile(ns, equipment, set.id), texture);
      layers[equipment] = [{ texture: `${ns}:${set.id}` }];
    }
    writer.json(equipmentModelFile(ns, set.id), { layers });
  }
}

/** What the item configuration needs to know about the item's armor set. */
export interface ItemArmor {
  /** Equipment asset (namespace:set) */
  assetId: string;
  slot: string | null;
  entities: string[];
  glider: boolean;
}

/** The armor of an item for its configuration (null = no usable set). */
export function itemArmor(item: Item, project: Project, sets: Map<string, ArmorSet>): ItemArmor | null {
  const setId = armorSetId(item);
  const set = setId ? sets.get(setId) : undefined;
  if (!set || set.textures.size === 0) return null;
  return { assetId: `${project.namespace}:${set.id}`, slot: set.slot, entities: set.entities, glider: set.glider };
}
