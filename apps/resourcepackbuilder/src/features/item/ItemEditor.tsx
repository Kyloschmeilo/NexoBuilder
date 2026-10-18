/**
 * The item editor: a slim header, the section nav on the left of the page and one section at a time beside it
 * (Basics, Model, Features …, see `sections.ts`). The picked section is kept in the ui store, so it stays when the
 * user switches items. The item's final YAML is in the output dock.
 */
import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import type { Item } from '@resourcepackbuilder/core/project';
import { issuesFor } from '@resourcepackbuilder/utils';
import { Page, SectionNav } from '@resourcepackbuilder/ui';
import { FieldContext } from '../../components/editor';
import { usePlan } from '../../shell/PlanProvider';
import { useOpenProject } from '../../store/project';
import { setEditorSection, useUiStore } from '../../store/ui';
import { ItemHeader } from './ItemHeader';
import { useProjectForm } from './properties/useProjectForm';
import { itemSectionNav, itemSections, resolveItemSection, type ItemSectionLabels } from './sections';
import { useItemFieldContext } from './useItemFieldContext';

/** The nav texts: the section names and the feature group titles. */
function useSectionLabels(): ItemSectionLabels {
  const t = useTranslations('item');
  return {
    section: (id) => t(`sections.${id}`),
    // Group ids come from the form at runtime; a test checks the catalogue has a title for each of them
    group: (group) => t(`properties.titles.${group}` as never),
  };
}

function ItemEditorContent({ item }: { item: Item }) {
  const t = useTranslations('item');
  const plan = usePlan();
  const target = useOpenProject().target;
  const storedSection = useUiStore((s) => s.editorSection);
  const fieldContext = useItemFieldContext(item);
  const schema = useProjectForm();
  const labels = useSectionLabels();
  const issues = plan ? issuesFor(plan.issues, { kind: 'item', id: item.id }) : [];
  const sections = itemSections(target, item);
  const { section, focus, navId } = resolveItemSection(sections, storedSection);
  const top = useRef<HTMLDivElement>(null);
  const shownSection = section.id;

  // A new section starts at its top (the page keeps its scroll position otherwise)
  const previous = useRef(shownSection);
  useEffect(() => {
    if (previous.current === shownSection) return;
    previous.current = shownSection;
    top.current?.scrollIntoView({ block: 'start' });
  }, [shownSection]);

  const { Component } = section;
  return (
    <FieldContext.Provider value={fieldContext}>
      <div ref={top} className="scroll-mt-0">
        <Page
          header={<ItemHeader item={item} issues={issues} />}
          nav={
            <SectionNav
              label={t('sections.nav')}
              items={itemSectionNav(schema, item, labels)}
              activeId={navId}
              onSelect={setEditorSection}
            />
          }
        >
          <div data-item-section={section.id} className="min-w-0">
            <Component item={item} focus={focus} />
          </div>
        </Page>
      </div>
    </FieldContext.Provider>
  );
}

/** The editor of one item: header with actions, the section nav and the picked section. */
export function ItemEditor({ itemId }: { itemId: string }) {
  const item = useOpenProject().items[itemId];
  return item ? <ItemEditorContent item={item} /> : null;
}
