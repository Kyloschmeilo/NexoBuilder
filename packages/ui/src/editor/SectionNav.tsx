/**
 * The in-page navigation between the sections of an editor page: a sticky list beside the page when the page is
 * wide, a select above it when narrow. `useSectionSpy` keeps the active entry in step with the scroll position.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../lib/cn';
import { NativeSelect, NativeSelectOption } from '../components/native-select';
import { useUiLabels } from '../labels';

/** One entry of a {@link SectionNav}. */
export interface SectionNavItem {
  /** The `data-section-id` of the section it jumps to. */
  id: string;
  label: string;
  /** Number of entries in the section, shown on the right. */
  count?: number;
  /** `1` indents the entry below the one before (a sub-section). */
  level?: 0 | 1;
  /** A dot in the warning or error colour: the section has problems. */
  tone?: 'warning' | 'error';
  /** Faint entry: the section is empty. */
  muted?: boolean;
}

interface SectionNavProps {
  items: readonly SectionNavItem[];
  activeId?: string;
  onSelect: (id: string) => void;
  /** Accessible name of the navigation; "Sections" by default. */
  label?: string;
  className?: string;
}

/** Indent of a sub-section in the select (an em space; option text cannot be padded with CSS). */
const SUB_INDENT = String.fromCodePoint(0x2003);

const TONE_DOT_CLASS = { warning: 'bg-warning', error: 'bg-danger' } as const;

/**
 * Section links of a page. Laid out inside `Page`, the list shows from the page container's `@3xl` width and the
 * select below it.
 */
export function SectionNav({ items, activeId, onSelect, label, className }: SectionNavProps) {
  const labels = useUiLabels();
  const name = label ?? labels.sections;
  return (
    <nav aria-label={name} className={cn('min-w-0', className)}>
      <NativeSelect
        aria-label={name}
        className="w-full @3xl/page:hidden"
        value={activeId ?? items[0]?.id ?? ''}
        onChange={(e) => onSelect(e.target.value)}
      >
        {items.map((item) => (
          <NativeSelectOption key={item.id} value={item.id}>
            {item.level === 1 ? `${SUB_INDENT}${item.label}` : item.label}
            {item.count ? ` (${item.count})` : ''}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <ul className="m-0 hidden list-none flex-col gap-px p-0 @3xl/page:flex">
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <li key={item.id}>
              <button
                type="button"
                aria-current={isActive ? 'location' : undefined}
                onClick={() => onSelect(item.id)}
                className={cn(
                  'relative flex h-7 w-full cursor-pointer items-center gap-2 rounded-md pr-2 text-left text-label outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
                  item.level === 1 ? 'pl-5' : 'pl-2.5',
                  isActive ? 'bg-accent font-medium text-text' : item.muted ? 'text-text-faint' : 'text-text-muted',
                )}
              >
                {isActive && <span aria-hidden className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary" />}
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.tone && <span aria-hidden className={cn('size-1.5 flex-none rounded-full', TONE_DOT_CLASS[item.tone])} />}
                {item.count !== undefined && item.count > 0 && (
                  <span className="flex-none font-mono text-micro text-text-faint tabular-nums">{item.count}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Whether the user asked the system for less motion. */
function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/** How long the spy keeps the section picked through `scrollTo` while the page scrolls there, in milliseconds. */
const SCROLL_LOCK_MS = 1000;

/**
 * Scroll spy over the elements with a `data-section-id` among `ids`: the active id is the last section (in `ids`
 * order) that reaches into the upper third of the viewport, so a sub-section wins over its parent and the next section
 * wins as soon as it starts. `scrollTo` brings a section to the top and keeps it active while the page scrolls there,
 * also when the page ends before the section reaches the top.
 */
export function useSectionSpy(ids: readonly string[]): { activeId: string | undefined; scrollTo: (id: string) => void } {
  const [activeId, setActiveId] = useState<string | undefined>(ids[0]);
  const lockedUntil = useRef(0);
  const key = ids.join('\n');

  useEffect(() => {
    const order = key ? key.split('\n') : [];
    if (typeof IntersectionObserver === 'undefined' || order.length === 0) return;
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.sectionId;
          if (!id) continue;
          if (entry.isIntersecting) visible.add(id);
          else visible.delete(id);
        }
        const last = order.findLast((id) => visible.has(id));
        if (last && Date.now() >= lockedUntil.current) setActiveId(last);
      },
      { rootMargin: '0px 0px -66% 0px' },
    );
    for (const id of order) {
      const element = document.querySelector(`[data-section-id="${CSS.escape(id)}"]`);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [key]);

  const scrollTo = useCallback((id: string) => {
    lockedUntil.current = Date.now() + SCROLL_LOCK_MS;
    setActiveId(id);
    document
      .querySelector(`[data-section-id="${CSS.escape(id)}"]`)
      ?.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, []);

  return { activeId: activeId !== undefined && ids.includes(activeId) ? activeId : ids[0], scrollTo };
}
