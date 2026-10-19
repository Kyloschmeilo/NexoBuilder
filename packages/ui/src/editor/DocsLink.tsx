/**
 * The book icon that opens a feature's page in the plugin documentation of the project's target, tinted with the
 * target's marker colour.
 */
import { BookOpen } from 'lucide-react';
import { cn } from '../lib/cn';
import { useUiLabels } from '../labels';
import { Tip } from '../Tip';

/**
 * The plugin a docs link points to. It mirrors core's `PackTargetId`; the ui package does not depend on core.
 */
export type DocsTarget = 'nexo' | 'craftengine';

/** A docs URL together with the plugin it documents. */
export interface DocsRef {
  url: string;
  target: DocsTarget;
}

interface DocsLinkProps extends DocsRef {
  /** The topic, appended to the tooltip ("Open Nexo docs: Food"). */
  label?: string;
  className?: string;
}

/** Tint of the icon per target. */
const TARGET_TEXT_CLASS: Record<DocsTarget, string> = {
  nexo: 'text-target-nexo',
  craftengine: 'text-target-ce',
};

/** The tooltip and accessible name of a docs link: "Open Nexo docs: Food". */
export function useDocsLinkLabel(target: DocsTarget, label?: string): string {
  const labels = useUiLabels();
  const prefix = target === 'nexo' ? labels.docsNexo : labels.docsCraftEngine;
  return label ? `${prefix}: ${label}` : prefix;
}

/**
 * A 20 px icon link to a docs page, opened in a new tab (in Electron the window handler sends it to the browser).
 * The tooltip names the documentation and the topic.
 */
export function DocsLink({ url, target, label, className }: DocsLinkProps) {
  const name = useDocsLinkLabel(target, label);
  return (
    <Tip label={name}>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        aria-label={name}
        data-target={target}
        className={cn(
          'inline-grid size-5 flex-none place-items-center rounded-md outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
          TARGET_TEXT_CLASS[target],
          className,
        )}
      >
        <BookOpen className="size-3.5" aria-hidden />
      </a>
    </Tip>
  );
}
