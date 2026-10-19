/**
 * Picks the lines of a server console that may report a problem: WARN and ERROR lines with the lines that continue
 * them (stack traces, multi-line messages), every line of the plugin that is not one of its ordinary progress lines
 * (Nexo reports config problems at INFO level), and any other line that speaks of an error or failure.
 */

/** A Paper console line: "[12:34:56 WARN]: …" (the thread part is optional). */
const LINE_HEAD = /^\[(\d{2}:\d{2}:\d{2})(?: [^\]]*)? (INFO|WARN|ERROR|DEBUG|FATAL)\]:? ?(.*)$/;
/** Words with which a line describes a problem. */
const PROBLEM_WORDS =
  /\b(error|errors|invalid|unknown|failed|failure|could not|couldn't|cannot|can't|missing|not found|no such|does not exist|illegal|unable|exception|skipping|ignored?|deprecated|overlap\w*|unsupported|not supported)\b/i;

export interface LogRules {
  /** A line of the plugin (its own log prefix) */
  pluginLine: RegExp;
  /** The plugin's ordinary progress lines, which never report a problem */
  ordinary: readonly RegExp[];
  /** Lines that never concern the exported configs (Paper's offline-mode warning …) */
  noise: readonly RegExp[];
  /** Problems the check knows and accepts, each with the reason (listed, not counted); `below`: only on older versions */
  known: ReadonlyArray<{ pattern: RegExp; reason: string; below?: string }>;
}

export interface LogFinding {
  level: string;
  /** The first line, then its continuation lines */
  lines: string[];
  /** Why a known problem is accepted; absent for a finding that counts */
  known?: string;
}

/** The findings of `lines` in order. */
export function scanLog(lines: readonly string[], rules: LogRules): LogFinding[] {
  const findings: LogFinding[] = [];
  let current: LogFinding | null = null;
  for (const line of lines) {
    const head = LINE_HEAD.exec(line);
    if (!head) {
      // A continuation line (stack trace, wrapped message) belongs to the finding before it
      if (current && line.trim()) current.lines.push(line);
      continue;
    }
    current = null;
    const [, , level, message] = head;
    const isPluginLine = rules.pluginLine.test(message);
    const isProblem =
      level === 'WARN' ||
      level === 'ERROR' ||
      level === 'FATAL' ||
      PROBLEM_WORDS.test(message) ||
      (isPluginLine && !rules.ordinary.some((pattern) => pattern.test(message)));
    if (!isProblem || rules.noise.some((pattern) => pattern.test(line))) continue;
    const known = rules.known.find(({ pattern }) => pattern.test(line))?.reason;
    current = { level, lines: [line], ...(known && { known }) };
    findings.push(current);
  }
  return findings;
}

/** The findings as text, one block per finding, continuation lines cut after `maxLines`. */
export function formatFindings(findings: readonly LogFinding[], maxLines = 12): string {
  return findings
    .map(({ lines, known }) =>
      [
        ...(known ? [`(known: ${known})`] : []),
        ...lines.slice(0, maxLines),
        ...(lines.length > maxLines ? [`    … ${lines.length - maxLines} more lines`] : []),
      ].join('\n'),
    )
    .join('\n\n');
}
