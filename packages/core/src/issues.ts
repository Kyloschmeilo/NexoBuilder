/**
 * Check results and errors of core. Their user-facing text lives in the `issues` message namespace
 * (`code` is the key), so the app can show them in the current language.
 */

export type IssueLevel = 'error' | 'warning' | 'info';

/** A translated label argument: a message key in the `schema` namespace with its own args. */
export interface LabelArg {
  key: string;
  args?: Record<string, string | number>;
}

export type MessageArg = string | number | LabelArg;
export type MessageArgs = Record<string, MessageArg>;

export interface IssueTarget {
  kind: 'item' | 'folder' | 'glyph' | 'sound' | 'painting';
  id: string;
}

/** One "where" frame rendered as a prefix (e.g. in item X › variant Y), code is a key in `issues`. */
export interface IssueContext {
  code: string;
  args?: MessageArgs;
}

export interface Issue {
  level: IssueLevel;
  /** Message key inside the `issues` namespace, e.g. `plan.duplicateFile` */
  code: string;
  args?: MessageArgs;
  /** The entry the issue belongs to (lets the UI jump there) */
  target?: IssueTarget;
  /** Outermost frame first */
  context?: IssueContext[];
  /** Project the issue originates from (only set when exporting several projects) */
  projectId?: string;
}

/** An error whose user-facing text is the message `code` in the `issues` namespace. */
export class CoreError extends Error {
  constructor(
    readonly code: string,
    readonly args: MessageArgs = {},
  ) {
    super(code);
    this.name = 'CoreError';
  }
}

export function labelArg(key: string, args?: Record<string, string | number>): LabelArg {
  return args ? { key, args } : { key };
}

/** Where an issue belongs: the entry it targets and the frames shown in front of its message. */
export interface IssueWhere {
  target?: IssueTarget;
  context?: IssueContext[];
}

/** Reports an issue; `context` frames are appended after the reporter's own ones. */
export type ReportIssue = (level: IssueLevel, code: string, args?: MessageArgs, context?: IssueContext[]) => void;

/** Builds an issue (args and context are left out when empty). */
export function createIssue(level: IssueLevel, code: string, args?: MessageArgs, where: IssueWhere = {}): Issue {
  return {
    level,
    code,
    ...(args && { args }),
    ...(where.target && { target: where.target }),
    ...(where.context?.length && { context: where.context }),
  };
}

/** Reports issues into `issues` that all share the same target and context frames (e.g. one glyph or item). */
export function issueReporter(issues: Issue[], where: IssueWhere = {}): ReportIssue {
  return (level, code, args, context = []) =>
    issues.push(createIssue(level, code, args, { target: where.target, context: [...(where.context ?? []), ...context] }));
}

/** Returns the issue with `frames` put in front of its context (and the target, if it has none). */
export function inContext(issue: Issue, frames: IssueContext[], target?: IssueTarget): Issue {
  return {
    ...issue,
    context: [...frames, ...(issue.context ?? [])],
    ...(target && !issue.target && { target }),
  };
}

export function countIssues(issues: Issue[]): Record<IssueLevel, number> {
  const counts: Record<IssueLevel, number> = { error: 0, warning: 0, info: 0 };
  for (const issue of issues) counts[issue.level]++;
  return counts;
}

export function issuesFor(issues: Issue[], target: IssueTarget): Issue[] {
  return issues.filter((i) => i.target?.kind === target.kind && i.target.id === target.id);
}
