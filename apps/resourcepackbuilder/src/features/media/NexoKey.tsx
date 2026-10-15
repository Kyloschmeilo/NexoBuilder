/**
 * The name of a Nexo config option, e.g. "Frame Count". It is deliberately not translated: it is the name the Nexo
 * documentation and the exported YAML use. The explanation next to it (hover help, hint) is translated.
 */
export function NexoKey({ children }: { children: string }) {
  return <span translate="no">{children}</span>;
}
