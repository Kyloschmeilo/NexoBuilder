import type { PackTargetId } from '../project/target';
import type { ConfigObject } from '../project/types';
import type { PropertyDef, PropertyGroup } from './build';

/**
 * Everything the item editor needs to know about a target's properties. Each target (e.g. `NEXO_FORM` in
 * core/nexo) provides one value; the helpers in this module take it as their first argument.
 */
export interface FormSchema {
  target: PackTargetId;
  /** `label` and `description` are message keys in the `messages` namespace */
  groups: Array<{ id: PropertyGroup; label: string; description: string }>;
  /** All properties, grouped by `group` and in display order */
  properties: PropertyDef[];
  /** i18n namespace of the label, description, help and option keys ('schema' for Nexo) */
  messages: string;
  /**
   * Config paths that ResourcepackBuilder sets automatically and that no property may use, dotted for nested keys
   * (Nexo's `itemname`, CraftEngine's `data.item_name`)
   */
  managedPaths: string[];
  /**
   * The editor tabs that show one property group each, in order (the app adds its fixed tabs around them). `only`
   * limits a tab to the property ids an item's config can use (CraftEngine's block events only on a block).
   */
  tabs: Array<{ id: string; group: PropertyGroup; only?: (config: ConfigObject) => string[] }>;
}
