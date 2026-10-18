/**
 * The editor primitives: the generic, i18n-free building blocks every editor page is composed of (page frame, section
 * navigation, sections, field rows, lists, maps, feedback). Their own texts come from `UiLabelsProvider`.
 */
export { DocsLink, type DocsRef, type DocsTarget, useDocsLinkLabel } from './DocsLink';
export { EmptyHint } from './EmptyHint';
export { FieldGroup } from './FieldGroup';
export { FieldRow, type FieldRowProps, type FieldState } from './FieldRow';
export { Help } from './Help';
export { ListEditor, type ListEditorProps } from './ListEditor';
export {
  insertItem,
  mapKeyProblem,
  type MapKeyProblem,
  moveItem,
  removeItem,
  removeMapKey,
  renameMapKey,
  replaceItem,
  setMapValue,
} from './listOps';
export { MapEditor, type MapEditorProps } from './MapEditor';
export { MoreOptions } from './MoreOptions';
export { Page } from './Page';
export { PageHeader } from './PageHeader';
export { Panel } from './Panel';
export { Section, SubSection } from './Section';
export { SectionNav, type SectionNavItem, useSectionSpy } from './SectionNav';
export { SegmentedControl, type SegmentedOption } from './SegmentedControl';
export { StatusPill, type StatusPillTone } from './StatusPill';
