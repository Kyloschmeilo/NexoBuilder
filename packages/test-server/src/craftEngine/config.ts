/**
 * CraftEngine's config.yml as the test server needs it: the resource pack served locally (localhost), and the
 * attribute system on for projects that use it.
 */
import { patchYamlSettings, type YamlSetting } from '../yamlSettings';

export interface CraftEngineServerConfig {
  /** Port over which CraftEngine serves the resource pack */
  packPort: number;
  /**
   * The open project uses CraftEngine's attribute system: `attribute.enable` is set to true (CraftEngine reads it on
   * startup only). Otherwise the key is left as it is.
   */
  attributes?: boolean;
}

/** Values that ResourcepackBuilder sets in plugins/CraftEngine/config.yml */
function configOverrides(options: CraftEngineServerConfig): YamlSetting[] {
  return [
    // CraftEngine logs in the system language otherwise; the app reads the pack build from the English lines
    [['forced-locale'], 'en'],
    // Serve the pack from this machine; "auto" would pick the public address
    [['resource-pack', 'self-host', 'ip'], '127.0.0.1'],
    [['resource-pack', 'self-host', 'port'], options.packPort],
    // One-time download links break when the client asks for the pack again
    [['resource-pack', 'self-host', 'one_time_token'], false],
    [['resource-pack', 'delivery', 'send-on-join'], true],
    // A declined pack should not lock the tester out of their own server
    [['resource-pack', 'delivery', 'kick-if-declined'], false],
    ...(options.attributes ? [[['attribute', 'enable'], true] satisfies YamlSetting] : []),
  ];
}

/**
 * Sets the required values in config.yml. Everything else (including comments) is preserved. If the file does not
 * exist yet, a small file is created, and CraftEngine adds the rest on startup. If all values are already correct, the
 * file is returned unchanged, so an unchanged config never counts as a change.
 */
export function patchCraftEngineConfig(current: string | null, options: CraftEngineServerConfig): string {
  return patchYamlSettings(current, configOverrides(options), {
    header: ' Created by ResourcepackBuilder. CraftEngine adds the remaining settings on startup.',
  });
}
