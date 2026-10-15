import { useCallback } from 'react';
import { CircleAlert, Info, TriangleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from 'cn';
import type { Issue, IssueLevel, IssueText } from '@resourcepackbuilder/core/types';
import type { ProjectIssue } from '@resourcepackbuilder/core/export/plan';
import { Alert, AlertAction } from './components/alert';
import { Button } from './components/button';

const ICONS: Record<IssueLevel, typeof CircleAlert> = { error: CircleAlert, warning: TriangleAlert, info: Info };

const LEVEL_CLASSES: Record<IssueLevel, string> = {
  error: 'border-destructive/60 *:[svg]:text-destructive',
  warning: 'border-warning/60 *:[svg]:text-warning',
  info: '*:[svg]:text-info',
};

const ORDER: Record<IssueLevel, number> = { error: 0, warning: 1, info: 2 };

/**
 * Returns a function that renders an issue from core in the current language: the message `code`
 * from the `issues` namespace, labels in `texts` from the `schema` namespace and a wrapped
 * `detail` issue as the `detail` argument.
 */
export function useIssueText(): (issue: Issue) => string {
  const t = useTranslations('issues');
  const tSchema = useTranslations('schema');
  return useCallback(
    function render(issue: Issue): string {
      const args: Record<string, string | number> = { ...issue.params };
      for (const [name, parts] of Object.entries(issue.texts ?? {})) args[name] = joinText(parts, tSchema);
      if (issue.detail) args.detail = render(issue.detail);
      // Codes are runtime keys; a core test keeps every code core emits present in the catalogue.
      return t(issue.code as never, args as never);
    },
    [t, tSchema],
  );
}

type SchemaTranslator = ReturnType<typeof useTranslations<'schema'>>;

/** Joins an {@link IssueText}; a label that is not (yet) a `schema` key is shown as it is. */
function joinText(parts: IssueText, tSchema: SchemaTranslator): string {
  return parts
    .map((part) => (typeof part === 'string' ? part : tSchema.has(part.schema as never) ? tSchema(part.schema as never) : part.schema))
    .join('');
}

interface IssueListProps {
  issues: Array<Issue | ProjectIssue>;
  onOpenItem?: (itemId: string) => void;
  onOpenGlyphs?: () => void;
  /** Shown when there is nothing to list (nothing is rendered without it) */
  empty?: string;
  hideInfo?: boolean;
  /** Whether "Go to item"/"Open glyphs" is offered for this issue (e.g. only for the open project) */
  canOpen?: (issue: Issue | ProjectIssue) => boolean;
}

export function IssueList({ issues, onOpenItem, onOpenGlyphs, empty, hideInfo, canOpen = () => true }: IssueListProps) {
  const t = useTranslations('issues');
  const text = useIssueText();
  const visible = issues.filter((i) => !hideInfo || i.level !== 'info').sort((a, b) => ORDER[a.level] - ORDER[b.level]);
  if (visible.length === 0) return empty ? <div className="text-xs text-muted-foreground">{empty}</div> : null;
  return (
    <div role="list" className="flex flex-col gap-1.5">
      {visible.map((issue, i) => {
        const Icon = ICONS[issue.level];
        const itemId = issue.itemId;
        const glyphId = 'glyphId' in issue ? issue.glyphId : undefined;
        const openItem = onOpenItem && itemId && canOpen(issue);
        const openGlyphs = onOpenGlyphs && glyphId && canOpen(issue);
        return (
          <Alert
            key={i}
            role="listitem"
            className={cn('items-start rounded-md py-1.5 text-[13px] leading-5', LEVEL_CLASSES[issue.level], (openItem || openGlyphs) && 'pr-28')}
          >
            <Icon aria-label={t(`issueList.level.${issue.level}`)} />
            <div className="col-start-2 text-foreground">{text(issue)}</div>
            {(openItem || openGlyphs) && (
              <AlertAction className="top-1 flex">
                {openItem && (
                  <Button variant="link" size="xs" onClick={() => onOpenItem(itemId)}>
                    {t('issueList.openItem')}
                  </Button>
                )}
                {openGlyphs && (
                  <Button variant="link" size="xs" onClick={onOpenGlyphs}>
                    {t('issueList.openGlyphs')}
                  </Button>
                )}
              </AlertAction>
            )}
          </Alert>
        );
      })}
    </div>
  );
}
