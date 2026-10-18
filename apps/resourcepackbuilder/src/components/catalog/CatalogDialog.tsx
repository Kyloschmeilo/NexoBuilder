/**
 * The picker behind every "Add feature", "Add behavior", "Add function", "Add condition" … button: a search over the
 * catalog, category facets (All, Common, the categories, Added), cards in a grid, and a detail pane with the docs link
 * and the YAML the entry adds. It is fully usable from the search box: the arrow keys move between cards, Enter adds
 * (or checks, with `multi`), Shift+Enter adds and keeps the dialog open, Ctrl+Enter adds the checked cards.
 */
import { type KeyboardEvent, type ReactNode, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, CornerDownLeft, Search, SearchX } from 'lucide-react';
import { clsx } from 'cn';
import { DocsLink, StatusPill } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@resourcepackbuilder/ui/components/dialog';
import { Kbd } from '@resourcepackbuilder/ui/components/kbd';
import { YamlCode } from '../YamlCode';
import { categoryIcon } from './categoryIcons';
import { Highlight } from './Highlight';
import {
  type CardRect,
  catalogFacets,
  catalogGroups,
  type CatalogMatch,
  FACET_ADDED,
  FACET_ALL,
  FACET_COMMON,
  CATEGORY_OTHER,
  moveInGrid,
} from './search';
import type { CatalogBadge, CatalogCategory, CatalogItem } from './types';

export interface CatalogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "Add a block behavior" */
  title: string;
  /** One line below the title. */
  description?: string;
  /** Placeholder of the search box; a generic one when left out. */
  searchPlaceholder?: string;
  items: readonly CatalogItem[];
  /** The categories in display order with their names (adapters return them next to the items). */
  categories?: readonly CatalogCategory[];
  /** The facet that is selected when the dialog opens (a category id, `common`, `added` or `all`). */
  initialCategory?: string;
  /** Cards get a check; Enter checks, Ctrl+Enter or the add button adds every checked card at once. */
  multi?: boolean;
  /** Receives the ids to add, in the order they were picked. */
  onAdd: (ids: string[]) => void;
  /** Called with an added entry's id by its "Jump to" action; the dialog closes. Without it added cards are inert. */
  onJumpTo?: (id: string) => void;
  /** Caption of the add button ("Add behavior"); "Add" when left out. */
  addLabel?: string;
}

/** The picker dialog; the state (query, facet, checks) starts fresh every time it opens. */
export function CatalogDialog({ open, onOpenChange, ...props }: CatalogDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <CatalogDialogContent {...props} onClose={() => onOpenChange(false)} />}
    </Dialog>
  );
}

type ContentProps = Omit<CatalogDialogProps, 'open' | 'onOpenChange'> & { onClose: () => void };

/** The facet names of the fixed facets; the categories bring their own. */
function useFacetLabel(categories: readonly CatalogCategory[]) {
  const t = useTranslations('editor.catalog');
  return (id: string, label: string) => {
    if (id === FACET_ALL) return t('all');
    if (id === FACET_COMMON) return t('common');
    if (id === FACET_ADDED) return t('added');
    if (id === CATEGORY_OTHER && !label) return t('other');
    return label || categories.find((category) => category.id === id)?.label || id;
  };
}

function CatalogDialogContent({
  title,
  description,
  searchPlaceholder,
  items,
  categories = [],
  initialCategory,
  multi = false,
  onAdd,
  onJumpTo,
  addLabel,
  onClose,
}: ContentProps) {
  const t = useTranslations('editor.catalog');
  const tCommon = useTranslations('common');
  const facetLabel = useFacetLabel(categories);
  const baseId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [facet, setFacet] = useState(initialCategory ?? FACET_ALL);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  // Entries added with Shift+Enter while the dialog stays open, until the caller's data says so itself
  const [addedNow, setAddedNow] = useState<ReadonlySet<string>>(new Set());

  const shown = useMemo(
    () => items.map((item) => (addedNow.has(item.id) && !item.added ? { ...item, added: true } : item)),
    [items, addedNow],
  );
  const facets = useMemo(() => catalogFacets(shown, categories, query), [shown, categories, query]);
  const groups = useMemo(() => catalogGroups(shown, categories, query, facet), [shown, categories, query, facet]);
  const flat = useMemo(() => groups.flatMap((group) => group.matches), [groups]);
  const active = flat.find((match) => match.item.id === activeId) ?? flat[0];
  const optionId = (id: string) => `${baseId}-option-${flat.findIndex((match) => match.item.id === id)}`;
  const isSearching = query.trim() !== '';

  const activeIndex = active ? flat.indexOf(active) : -1;
  useEffect(() => {
    if (activeIndex >= 0) document.getElementById(`${baseId}-option-${activeIndex}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex, baseId]);

  const canAdd = (item: CatalogItem | undefined): item is CatalogItem => !!item && !item.disabledReason && !item.added;

  const add = (ids: string[], keepOpen: boolean) => {
    if (!ids.length) return;
    onAdd(ids);
    if (keepOpen) {
      setAddedNow((prev) => new Set([...prev, ...ids]));
      setChecked((prev) => prev.filter((id) => !ids.includes(id)));
    } else onClose();
  };

  const jumpTo = (id: string) => {
    if (!onJumpTo) return;
    onJumpTo(id);
    onClose();
  };

  const toggleChecked = (id: string) => setChecked((prev) => (prev.includes(id) ? prev.filter((other) => other !== id) : [...prev, id]));

  /** A click on a card or Enter: added → jump to it; multi → check it; otherwise add it and close. */
  const activate = (item: CatalogItem) => {
    setActiveId(item.id);
    if (item.added) jumpTo(item.id);
    else if (!canAdd(item)) return;
    else if (multi) toggleChecked(item.id);
    else add([item.id], false);
  };

  const addChecked = () => {
    const ids = checked.filter((id) => canAdd(shown.find((item) => item.id === id)));
    if (ids.length) add(ids, false);
    else if (canAdd(active?.item)) add([active.item.id], false);
  };

  const move = (key: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown') => {
    if (!flat.length) return;
    const current = activeIndex;
    let next: number;
    if (isSearching) {
      // A search result is a ranked list: up and down step through it in order
      next = Math.min(flat.length - 1, Math.max(0, current + (key === 'ArrowUp' || key === 'ArrowLeft' ? -1 : 1)));
    } else {
      const rects = flat.map((match): CardRect => {
        const box = document.getElementById(optionId(match.item.id))?.getBoundingClientRect();
        return box ? { left: box.left, top: box.top, width: box.width, height: box.height } : { left: 0, top: 0, width: 0, height: 0 };
      });
      next = moveInGrid(rects, current, key);
    }
    if (next >= 0) setActiveId(flat[next].item.id);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const fromSearch = target === inputRef.current;
    // Buttons and links keep their own Enter and Space
    if (!fromSearch && target.closest('button, a, [role=checkbox]')) return;
    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowDown':
        event.preventDefault();
        move(event.key);
        break;
      case 'ArrowLeft':
      case 'ArrowRight':
        // In a search with text, left and right move the caret
        if (fromSearch && query !== '') return;
        event.preventDefault();
        move(event.key);
        break;
      case 'Enter': {
        if (!active) return;
        event.preventDefault();
        if (event.shiftKey) {
          if (canAdd(active.item)) add([active.item.id], true);
        } else if (event.ctrlKey || event.metaKey) {
          if (multi) addChecked();
          else activate(active.item);
        } else activate(active.item);
        break;
      }
    }
  };

  const listboxId = `${baseId}-results`;
  const addCount = multi ? checked.length : 0;

  return (
    <DialogContent
      initialFocus={inputRef}
      className="flex h-[min(680px,calc(100vh-3rem))] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[960px]"
      data-slot="catalog-dialog"
    >
      <div className="flex min-h-0 flex-1 flex-col" onKeyDown={onKeyDown}>
        <header className="flex flex-col gap-0.5 border-b border-line px-4 pt-3.5 pr-12 pb-3">
          <DialogTitle className="font-sans text-(length:--text-title) leading-5 tracking-normal text-text normal-case">
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="text-(length:--text-meta) leading-4 text-text-muted">{description}</DialogDescription>
          )}
        </header>
        <div className="border-b border-line px-4 py-2.5">
          <label className="flex h-(--control-height) items-center gap-2 rounded-md border border-input bg-canvas px-2.5 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring">
            <Search className="size-4 flex-none text-text-muted" aria-hidden />
            <input
              ref={inputRef}
              role="combobox"
              aria-expanded
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={active ? optionId(active.item.id) : undefined}
              aria-label={searchPlaceholder ?? t('searchPlaceholder')}
              placeholder={searchPlaceholder ?? t('searchPlaceholder')}
              className="min-w-0 flex-1 bg-transparent text-label text-text outline-none placeholder:text-text-faint"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveId(null);
              }}
              spellCheck={false}
              autoComplete="off"
            />
          </label>
        </div>
        <div className="@container/catalog flex min-h-0 flex-1 flex-col">
          <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] @2xl/catalog:grid-cols-[196px_minmax(0,1fr)] @2xl/catalog:grid-rows-1 @4xl/catalog:grid-cols-[196px_minmax(0,1fr)_272px]">
            <FacetList
              facets={facets.map((f) => ({ ...f, label: facetLabel(f.id, f.label) }))}
              value={facet}
              onChange={(id) => {
                setFacet(id);
                setActiveId(null);
                inputRef.current?.focus();
              }}
              label={t('facets')}
            />
            <div
              ref={listRef}
              id={listboxId}
              role="listbox"
              aria-label={title}
              aria-multiselectable={multi || undefined}
              className="min-h-0 overflow-y-auto p-3"
            >
              {groups.length === 0 ? (
                <NoResults query={query} />
              ) : (
                <div className="flex flex-col gap-3">
                  {groups.map((group) => (
                    <CardGroup
                      key={group.category ?? 'results'}
                      title={group.category ? facetLabel(group.category, '') : undefined}
                      id={`${baseId}-group-${group.category ?? 'results'}`}
                    >
                      {group.matches.map((match) => (
                        <CatalogCard
                          key={match.item.id}
                          id={optionId(match.item.id)}
                          match={match}
                          active={match === active}
                          multi={multi}
                          checked={checked.includes(match.item.id)}
                          onHover={() => setActiveId(match.item.id)}
                          onActivate={() => activate(match.item)}
                        />
                      ))}
                    </CardGroup>
                  ))}
                </div>
              )}
            </div>
            <div className="hidden min-h-0 overflow-y-auto border-l border-line @4xl/catalog:block">
              {active && <DetailPane item={active.item} onJumpTo={onJumpTo ? () => jumpTo(active.item.id) : undefined} />}
            </div>
          </div>
        </div>
        <footer className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line px-4 py-2.5">
          <KeyHints multi={multi} />
          <div className="ml-auto flex items-center gap-2">
            {multi && addCount > 0 && <span className="text-meta text-text-muted">{t('checkedCount', { count: addCount })}</span>}
            <DialogClose render={<Button variant="outline" />}>{tCommon('cancel')}</DialogClose>
            <Button
              disabled={multi ? addCount === 0 && !canAdd(active?.item) : !canAdd(active?.item)}
              onClick={() => (multi ? addChecked() : active && activate(active.item))}
            >
              {multi && addCount > 0 ? t('addCount', { count: addCount }) : (addLabel ?? tCommon('add'))}
            </Button>
          </div>
        </footer>
      </div>
    </DialogContent>
  );
}

/** The facets: a column beside the cards in a wide dialog, a row of chips above them in a narrow one. */
function FacetList({
  facets,
  value,
  onChange,
  label,
}: {
  facets: Array<{ id: string; label: string; count: number }>;
  value: string;
  onChange: (id: string) => void;
  label: string;
}) {
  return (
    <nav
      aria-label={label}
      className="flex gap-1.5 overflow-x-auto border-b border-line px-3 py-2 @2xl/catalog:flex-col @2xl/catalog:gap-0.5 @2xl/catalog:overflow-y-auto @2xl/catalog:border-r @2xl/catalog:border-b-0 @2xl/catalog:px-2 @2xl/catalog:py-3"
    >
      {facets.map((facet) => {
        const selected = facet.id === value;
        return (
          <button
            key={facet.id}
            type="button"
            aria-pressed={selected}
            data-facet={facet.id}
            title={facet.label}
            onClick={() => onChange(facet.id)}
            className={clsx(
              'flex h-7 flex-none items-center gap-2 rounded-4xl border border-line px-2.5 text-meta whitespace-nowrap text-text-muted outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-ring',
              '@2xl/catalog:rounded-md @2xl/catalog:border-transparent @2xl/catalog:px-2',
              selected && 'border-primary bg-accent-soft font-semibold text-primary hover:text-primary @2xl/catalog:border-transparent',
            )}
          >
            {facet.id === FACET_ADDED && <Check className="size-3.5" aria-hidden />}
            <span className="min-w-0 flex-1 truncate text-left">{facet.label}</span>
            <span className="text-micro text-text-faint tabular-nums">{facet.count}</span>
          </button>
        );
      })}
    </nav>
  );
}

/** A titled grid of cards (the title only in the grouped view without a search). */
function CardGroup({ title, id, children }: { title?: string; id: string; children: ReactNode }) {
  return (
    <div role="group" aria-labelledby={title ? id : undefined} className="flex flex-col gap-2">
      {title && (
        <h3 id={id} className="text-meta font-semibold text-text-muted">
          {title}
        </h3>
      )}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2">{children}</div>
    </div>
  );
}

/** The version and Premium badges of an entry. */
function Badges({ badges }: { badges: readonly CatalogBadge[] }) {
  const t = useTranslations('editor.catalog');
  return (
    <span className="flex flex-wrap gap-1">
      {badges.map((badge, i) =>
        badge.kind === 'premium' ? (
          <StatusPill key={i} tone="info" label={t('premium')} />
        ) : (
          <StatusPill
            key={i}
            tone={badge.unsupported ? 'warning' : 'muted'}
            label={t(badge.kind === 'from' ? 'fromVersion' : 'untilVersion', { version: badge.version })}
          />
        ),
      )}
    </span>
  );
}

/** The icon tile of a card or the detail pane. */
function IconTile({ item, size = 'sm' }: { item: CatalogItem; size?: 'sm' | 'md' }) {
  return (
    <span
      aria-hidden
      className={clsx(
        'grid flex-none place-items-center rounded-md bg-accent-soft text-primary',
        size === 'sm' ? 'size-6.5 [&_svg]:size-3.5' : 'size-8 [&_svg]:size-4',
      )}
    >
      {item.icon ?? categoryIcon(item.category)}
    </span>
  );
}

interface CatalogCardProps {
  id: string;
  match: CatalogMatch;
  active: boolean;
  multi: boolean;
  checked: boolean;
  onHover: () => void;
  onActivate: () => void;
}

/** One entry: icon, label, key, a clamped description and badges; "Added" or the conflict instead of adding. */
function CatalogCard({ id, match, active, multi, checked, onHover, onActivate }: CatalogCardProps) {
  const t = useTranslations('editor.catalog');
  const { item, ranges } = match;
  const disabled = !!item.disabledReason;
  return (
    <div
      id={id}
      role="option"
      aria-selected={multi ? checked : active}
      aria-disabled={disabled || undefined}
      data-active={active || undefined}
      data-added={item.added || undefined}
      data-item-id={item.id}
      // Clicking a card keeps the focus in the search box, so the keyboard keeps working
      onMouseDown={(event) => event.preventDefault()}
      onMouseMove={active ? undefined : onHover}
      onClick={onActivate}
      className={clsx(
        'flex min-w-0 cursor-pointer flex-col gap-1 rounded-xl border border-line bg-surface px-3 py-2.5 text-left transition-colors hover:border-line-strong',
        active && 'border-primary ring-1 ring-primary hover:border-primary',
        item.added && 'bg-surface-sunken',
        disabled && 'cursor-not-allowed opacity-60',
        item.unsupported && !disabled && 'opacity-80',
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <IconTile item={item} />
        <span className="min-w-0 flex-1 truncate text-label font-semibold text-text">
          <Highlight text={item.label} ranges={ranges.label} />
        </span>
        {multi && !item.added && !disabled && (
          <span
            aria-hidden
            className={clsx(
              'grid size-4 flex-none place-items-center rounded-[4px] border border-input',
              checked && 'border-primary bg-primary text-primary-foreground',
            )}
          >
            {checked && <Check className="size-3" />}
          </span>
        )}
        {item.added && <StatusPill tone="ok" label={t('addedPill')} />}
      </span>
      <code className="truncate font-mono text-micro text-text-faint">
        <Highlight text={item.yamlKey} ranges={ranges.key} />
      </code>
      {(item.disabledReason ?? item.description) && (
        <span className={clsx('line-clamp-2 text-meta text-text-muted', disabled && 'text-warning')}>
          {item.disabledReason ?? <Highlight text={item.description ?? ''} ranges={ranges.description} />}
        </span>
      )}
      {item.badges && item.badges.length > 0 && <Badges badges={item.badges} />}
    </div>
  );
}

/** The active entry in full: description, note, conflict, docs link and the YAML it adds. */
function DetailPane({ item, onJumpTo }: { item: CatalogItem; onJumpTo?: () => void }) {
  const t = useTranslations('editor.catalog');
  return (
    <aside className="flex flex-col gap-3 p-4" data-slot="catalog-detail">
      <div className="flex items-start gap-2.5">
        <IconTile item={item} size="md" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-label font-semibold break-words text-text">{item.label}</span>
          <code className="font-mono text-micro break-all text-text-faint">{item.yamlKey}</code>
        </div>
        {item.docs && <DocsLink {...item.docs} label={item.label} />}
      </div>
      {item.badges && item.badges.length > 0 && <Badges badges={item.badges} />}
      {item.description && <p className="text-meta text-text">{item.description}</p>}
      {item.note && <p className="text-meta text-text-muted">{item.note}</p>}
      {item.disabledReason && <p className="text-meta text-warning">{item.disabledReason}</p>}
      {item.added && (
        <div className="flex items-center gap-2">
          <StatusPill tone="ok" dot label={t('addedPill')} />
          {onJumpTo && (
            <Button variant="outline" size="sm" onClick={onJumpTo}>
              <CornerDownLeft /> {t('jumpTo')}
            </Button>
          )}
        </div>
      )}
      {item.preview && (
        <div className="flex flex-col gap-1.5">
          <span className="text-meta font-semibold text-text-muted">{t('adds')}</span>
          <YamlCode text={item.preview} className="max-h-60 text-micro" />
        </div>
      )}
    </aside>
  );
}

/** The empty result of a search. */
function NoResults({ query }: { query: string }) {
  const t = useTranslations('editor.catalog');
  return (
    <div className="grid place-items-center gap-1.5 rounded-xl border border-dashed border-line px-4 py-10 text-center">
      <SearchX className="size-5 text-text-faint" aria-hidden />
      <span className="text-label font-semibold text-text">{query.trim() ? t('noMatch', { query: query.trim() }) : t('empty')}</span>
      {query.trim() && <span className="text-meta text-text-muted">{t('noMatchHint')}</span>}
    </div>
  );
}

/** The keys of the dialog, in the footer. */
function KeyHints({ multi }: { multi: boolean }) {
  const t = useTranslations('editor.catalog.keys');
  const hint = (keys: ReactNode, text: string) => (
    <span className="flex items-center gap-1.5">
      {keys}
      <span>{text}</span>
    </span>
  );
  return (
    <div className="hidden flex-wrap items-center gap-x-3 gap-y-1 text-micro text-text-muted sm:flex" aria-hidden>
      {hint(<Kbd>↑↓←→</Kbd>, t('move'))}
      {hint(<Kbd>Enter</Kbd>, multi ? t('check') : t('add'))}
      {hint(<Kbd>Shift+Enter</Kbd>, t('addKeepOpen'))}
      {multi && hint(<Kbd>Ctrl+Enter</Kbd>, t('addChecked'))}
    </div>
  );
}
