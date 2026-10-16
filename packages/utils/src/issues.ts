/**
 * Check results and errors of core. Their user-facing text lives in the `issues` message namespace
 * (`code` is the key), so the app can show them in the current language.
 *
 * Codes and label keys are typed by the catalogue (a type-only dependency on @resourcepackbuilder/i18n), so the app
 * renders them without casts. Keys built at runtime (from registries such as MEDIA_KINDS or keySegment) go through
 * {@link issueCode}/{@link schemaKey}; core's message-key tests check that every one of them exists.
 */
import type { IssueKey, SchemaKey } from '@resourcepackbuilder/i18n';

export type IssueLevel = 'error' | 'warning' | 'info';

/** A message key in the `issues` namespace: the code of an issue, error or context frame. */
export type IssueCode = IssueKey;

/** A message key in the `schema` namespace: labels, help texts and options of core's Nexo data. */
export type LabelKey = SchemaKey;

/** A code built at runtime (e.g. `${kind}.idInvalid`); the catalogue tests make sure it exists. */
export function issueCode(code: string): IssueCode {
  return code as IssueCode;
}

/** A label key built at runtime (e.g. from keySegment); the message-key tests make sure it exists. */
export function schemaKey(key: string): LabelKey {
  return key as LabelKey;
}

/** A translated label argument: a message key in the `schema` namespace with its own args. */
export interface LabelArg {
  key: LabelKey;
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
  code: IssueCode;
  args?: MessageArgs;
}

export interface Issue {
  level: IssueLevel;
  /** Message key inside the `issues` namespace, e.g. `plan.duplicateFile` */
  code: IssueCode;
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
    readonly code: IssueCode,
    readonly args: MessageArgs = {},
  ) {
    super(code);
    this.name = 'CoreError';
  }
}

export function labelArg(key: LabelKey, args?: Record<string, string | number>): LabelArg {
  return args ? { key, args } : { key };
}

/** Where an issue belongs: the entry it targets and the frames shown in front of its message. */
export interface IssueWhere {
  target?: IssueTarget;
  context?: IssueContext[];
}

/** Reports an issue; `context` frames are appended after the reporter's own ones. */
export type ReportIssue = (level: IssueLevel, code: IssueCode, args?: MessageArgs, context?: IssueContext[]) => void;

/** Builds an issue (args and context are left out when empty). */
export function createIssue(level: IssueLevel, code: IssueCode, args?: MessageArgs, where: IssueWhere = {}): Issue {
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
