/**
 * The seam between the shared export (models, textures, armor, the pack) and a pack target
 * (Nexo, CraftEngine): the target builds the item configs and every file of its plugin folder.
 */
import type { Issue } from '@resourcepackbuilder/utils';
import type { Item, ItemArmor, PackTargetId, Project, VariantSlot } from '@resourcepackbuilder/core/project';
import type { ItemModelsResult } from '../itemModels';
import type { PackWriter } from '../packWriter';
import type { MultiExportPlan } from '../selection';
import type { ExportPlan, ItemExport, ItemPlan } from '../types';

/** Model keys of an item's variants by slot (several models for slots like pulling_models). */
export type VariantKeys = Partial<Record<VariantSlot, string | string[]>>;

/** What the shared steps wrote for an item and the target builds its config from. */
export interface WrittenItemModels {
  /** Key of the main model (null = the item has none) */
  mainKey: string | null;
  variantKeys: VariantKeys;
  /** Item model definition written by ResourcepackBuilder (inventory icon, connectable furniture …) */
  itemModel: string | null;
  /** Values that additional models need in the config */
  extraConfig: ItemModelsResult['config'];
}

/** State that the items of one export share. */
export interface ItemShared {
  armor: ItemArmor | null;
  /** Custom block variations already used by earlier items ("TYPE:variation" → item) */
  usedVariations: Map<string, Item>;
}

/** What a target adds to the plan besides the items. */
export type TargetPluginFiles = Pick<ExportPlan, 'pluginFiles' | 'nexo'>;

export interface PackTarget {
  id: PackTargetId;
  /** File (relative to `layout.pluginDir`) that holds the config of `item` in the folder `folderSlugs`. */
  itemFile(project: Project, folderSlugs: string[], item: Item): string;
  /** Writes the variant models the target builds into the item config and returns their keys. */
  writeVariants(itemExport: ItemExport, hasMainModel: boolean): VariantKeys;
  /** Builds the item's config from the written models and checks it; reports through itemExport. */
  buildItem(itemExport: ItemExport, written: WrittenItemModels, shared: ItemShared): Record<string, unknown>;
  /** Item key in the YAML: Nexo `itemId`, CraftEngine `<namespace>:<itemId>`. */
  yamlKey(project: Project, item: Item): string;
  /** Every plugin-side file (item YAML, recipes, media …) relative to `layout.pluginDir`; writes media into the pack. */
  planPluginFiles(project: Project, plans: ItemPlan[], writer: PackWriter, issues: Issue[]): TargetPluginFiles;
  layout: TargetLayout;
}

export interface TargetLayout {
  /** The plugin folder on a server, e.g. 'plugins/Nexo' */
  pluginDir: string;
  /** Where the resource pack goes inside pluginDir (Nexo: pack/external_packs/<name>[/|.zip]) */
  packLocation(project: Project, asZip: boolean): string;
  /** The install guide of a full export; `rootFiles` are the files shared by all projects of the archive. */
  installGuide(multi: MultiExportPlan, rootFiles: Map<string, string>): string;
  /** Reloads the plugin's configuration and rebuilds the resource pack */
  reloadCommand: string;
}
