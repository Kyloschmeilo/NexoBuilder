import type { PackTargetId } from '../project/target';
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
  /** Top-level config keys that ResourcepackBuilder sets automatically and that do not count as properties */
  managedTopLevelKeys: string[];
  /** The editor tabs that show one property group each, in order (the app adds its fixed tabs around them) */
  tabs: Array<{ id: string; group: PropertyGroup }>;
}
