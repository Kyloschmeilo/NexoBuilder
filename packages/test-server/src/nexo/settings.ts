/** Nexo's settings.yml as the test server needs it: the resource pack served locally (localhost). */
import { patchYamlSettings, type YamlSetting } from '../yamlSettings';

export interface NexoServerSettings {
  /** Port over which Nexo serves the resource pack */
  packPort: number;
}

/** Values that ResourcepackBuilder sets in plugins/Nexo/settings.yml */
function settingsOverrides(options: NexoServerSettings): YamlSetting[] {
  return [
    // Serve the pack directly from the local machine instead of via an upload service
    [['Pack', 'server', 'type'], 'SELFHOST'],
    [['Pack', 'server', 'selfhost', 'port'], options.packPort],
    [['Pack', 'server', 'selfhost', 'public_address'], '127.0.0.1'],
    // After /nexo reload, send the new pack to all players immediately
    [['Pack', 'dispatch', 'send_on_reload'], true],
    // Unnecessary for testing, slows down generation and uses a cache that can break
    [['Pack', 'obfuscation', 'type'], 'NONE'],
  ];
}

/**
 * Sets the required settings in settings.yml. Everything else (including comments) is preserved.
 * If the file does not exist yet, a small file is created – Nexo fills in the rest on startup.
 * If all values are already correct, the file is returned unchanged (Nexo reformats it itself –
 * that must not count as a change, otherwise Nexo would be reloaded constantly).
 */
export function patchNexoSettings(current: string | null, options: NexoServerSettings): string {
  return patchYamlSettings(current, settingsOverrides(options), {
    header: ' Created by ResourcepackBuilder – Nexo adds the remaining settings on startup.',
    version: '1.1',
  });
}
