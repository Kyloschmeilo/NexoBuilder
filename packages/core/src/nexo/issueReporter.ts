import type { Issue, IssueContext, IssueLevel, IssueTarget, MessageArgs } from '../issues';

export type ReportIssue = (level: IssueLevel, code: string, args?: MessageArgs) => void;

/** Reports issues into `issues` that all share the same target and context frames (e.g. one glyph). */
export function issueReporter(issues: Issue[], where: { target?: IssueTarget; context?: IssueContext[] }): ReportIssue {
  return (level, code, args) => issues.push({ level, code, ...(args && { args }), ...where });
}
