import { CircleAlert, Info, TriangleAlert } from 'lucide-react';
import type { Issue } from '../../core/types';
import type { ProjectIssue } from '../../core/export/plan';

const ICONS = {
  error: <CircleAlert size={15} />,
  warning: <TriangleAlert size={15} />,
  info: <Info size={15} />,
};

interface IssueListProps {
  issues: Array<Issue | ProjectIssue>;
  onOpenItem?: (itemId: string) => void;
  empty?: string;
  hideInfo?: boolean;
}

export function IssueList({ issues, onOpenItem, empty, hideInfo }: IssueListProps) {
  const order = { error: 0, warning: 1, info: 2 };
  const visible = issues.filter((i) => !hideInfo || i.level !== 'info').sort((a, b) => order[a.level] - order[b.level]);
  if (visible.length === 0) return empty ? <div className="faint small">{empty}</div> : null;
  return (
    <div className="issue-list">
      {visible.map((issue, i) => (
        <div key={i} className={`issue ${issue.level}`}>
          {ICONS[issue.level]}
          <span className="issue-text">{issue.message}</span>
          {onOpenItem && 'itemId' in issue && issue.itemId && (
            <button className="link" onClick={() => onOpenItem(issue.itemId!)}>
              Zum Item
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
