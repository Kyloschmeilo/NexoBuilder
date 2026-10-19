/**
 * The page of a CraftEngine registry view (loot sources, templates, worldgen …). With an entry selected (in the Logic
 * panel or the overview) it edits that entry: a list entry with its fields (a typed entry by its type), a map entry
 * with its name and value. Otherwise it is the view's overview: what the section is for, its entries per group with
 * "New …" buttons, and any page-wide settings of the view (`extras`).
 */
import { type ComponentType, type ReactNode, useEffect, useId, useRef } from 'react';
import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { MessageKey } from '@resourcepackbuilder/i18n';
import type { ObjectField } from '@resourcepackbuilder/core/form';
import type { Project } from '@resourcepackbuilder/core/project';
import { CRAFT_ENGINE_PLUGIN_DIR } from '@resourcepackbuilder/export';
import { isPlainObject } from '@resourcepackbuilder/utils';
import { DocsLink, FieldRow, type MenuEntry, Page, PageHeader, Section, StatusPill, useDraft } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { FieldRenderer } from '../../components/editor';
import { Datalist } from '../../components/editor/inputs/TextInput';
import { useSchemaText } from '../../components/useSchemaText';
import { ObjectFields } from '../../components/editor/editors/ObjectEditor';
import { TypedEntryBody, TypeInput } from '../../components/editor/editors/TypedListEditor';
import type { RegistryMapGroupId } from '../../shell/sidebar/panels/registryTexts';
import { useRegistryGroupText } from '../../shell/sidebar/panels/useRegistryGroupText';
import { useOpenProject } from '../../store/project';
import { selectEntry, useSelectedEntry } from '../../store/ui';
import { EntryTable, FilePath, PageHint } from '../media/RegistryPageParts';
import { ProjectFieldContext } from './ProjectFieldContext';
import { useAddEntry } from './registries';
import {
  CRAFT_ENGINE_SOURCES,
  type CraftEngineRegistryView,
  entryKey,
  type EntrySource,
  followListEntry,
  listEntryLabel,
  type ListSource,
  mapKeyProblem,
  type MapSource,
  type ResolvedEntry,
  resolveEntry,
  sourceGroups,
  withDuplicate,
  withListEntry,
  withMovedEntry,
  withoutKey,
  withoutListEntry,
  withRenamedKey,
} from './registrySources';

/** The longer explanation of a group shown on the overview, for registries with several groups. */
const GROUP_HINTS: Partial<Record<string, MessageKey<'media'>>> = {
  definitions: 'attributes.definitions.hint',
  operations: 'attributes.operations.hint',
  equipmentSets: 'attributes.equipmentSets.hint',
  damageRules: 'attributes.damageRules.hint',
  lang: 'translations.lang.hint',
  server: 'translations.server.hint',
  configuredFeatures: 'worldgen.configured.hint',
  placedFeatures: 'worldgen.placed.hint',
  configFactories: 'pack.factories.hint',
};

export interface RegistryPageProps {
  view: CraftEngineRegistryView;
  icon: ComponentType;
  /** The wiki page of the section */
  docs: string;
  /** The file the view writes, relative to the plugin folder; for an entry of `group`, the file that entry goes to */
  file: (project: Project, group?: string, key?: string) => string;
  /** The overview's explanation; the view's `hint` text when absent */
  hint?: ReactNode;
  /** Page-wide settings or references shown on the overview before the entries */
  before?: ReactNode;
  /** … and after them */
  after?: ReactNode;
}

/** The overview: header, hint, extras and one section of entries per group. */
function Overview({ view, icon: Icon, docs, file, hint, before, after }: RegistryPageProps) {
  const t = useTranslations('media');
  const tRegistry = useTranslations('media.registry');
  const text = useRegistryGroupText();
  const project = useOpenProject();
  const addEntry = useAddEntry();
  const sources = CRAFT_ENGINE_SOURCES[view];
  const groups = sourceGroups(sources, project);
  const isSingle = groups.length === 1;
  const count = groups.reduce((sum, group) => sum + group.entries.length, 0);
  const add = (source: EntrySource) =>
    void addEntry(source).then((key) => {
      if (key) selectEntry(view, key);
    });

  return (
    <Page
      header={
        <PageHeader
          thumb={<Icon />}
          title={t(`${view}.title`)}
          meta={
            <>
              <StatusPill tone="muted" label={tRegistry('entryCount', { count })} />
              <FilePath path={`${CRAFT_ENGINE_PLUGIN_DIR}/${file(project)}`} />
            </>
          }
          actions={
            <>
              {isSingle && (
                <Button onClick={() => add(sources[0]!)}>
                  <Plus /> {text(sources[0]!.id, 'add')}
                </Button>
              )}
              <DocsLink url={docs} target="craftengine" label={t(`${view}.title`)} />
            </>
          }
        />
      }
    >
      <PageHint>{hint ?? t(`${view}.hint`)}</PageHint>
      {before}
      {groups.map((group, i) => {
        const source = sources[i]!;
        const groupHint = GROUP_HINTS[group.id];
        return (
          <Section
            key={group.id}
            id={group.id}
            title={isSingle ? tRegistry('entries') : text(group.id, 'title')}
            description={groupHint ? t(groupHint) : undefined}
            meta={<StatusPill tone="muted" label={String(group.entries.length)} />}
            actions={
              // An empty group offers the same action in its empty hint
              !isSingle &&
              group.entries.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => add(source)}>
                  <Plus /> {text(group.id, 'add')}
                </Button>
              )
            }
          >
            {/* A single group has its add button in the header */}
            <EntryTable view={view} group={group} onAdd={isSingle ? undefined : () => add(source)} />
          </Section>
        );
      })}
      {after}
    </Page>
  );
}

/** The name of a map entry; a rename is applied when the input loses focus (or on Enter) and refused when taken. */
function MapKeyField({ view, source, mapKey }: { view: CraftEngineRegistryView; source: MapSource; mapKey: string }) {
  const tRegistry = useTranslations('media.registry');
  const schemaText = useSchemaText();
  const id = useId();
  const listId = useId();
  const project = useOpenProject();
  const map = source.read(project);
  const { draft, setDraft, reset } = useDraft(
    mapKey,
    (value) => ({ value: value.trim() }),
    (key) => key,
  );
  const problem = mapKeyProblem(map, draft, mapKey);
  const commit = () => {
    const next = draft.trim();
    if (next !== mapKey && !mapKeyProblem(map, next, mapKey)) {
      source.write(withRenamedKey(map, mapKey, next));
      selectEntry(view, entryKey(source, next));
    }
    reset();
  };
  return (
    <FieldRow
      label={tRegistry(`groups.${source.id as RegistryMapGroupId}.keyLabel`)}
      htmlFor={id}
      error={problem === 'taken' ? tRegistry('keyTaken') : problem === 'empty' ? tRegistry('keyEmpty') : undefined}
    >
      <Input
        id={id}
        className="font-mono"
        value={draft}
        placeholder={schemaText(source.field.keyPlaceholder)}
        list={source.field.keyOptions?.length ? listId : undefined}
        spellCheck={false}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') reset();
        }}
      />
      {/* The schema's key options (e.g. the locales CraftEngine reads), without the ones other entries use */}
      <Datalist
        id={listId}
        choices={source.field.keyOptions?.filter((option) => option.value === mapKey || !Object.hasOwn(map, option.value))}
      />
    </FieldRow>
  );
}

/** The editor of a list entry: its type (typed lists) and fields. */
function ListEntryEditor({ source, index, value }: { source: ListSource; index: number; value: unknown }) {
  const tRegistry = useTranslations('media.registry');
  const project = useOpenProject();
  const entry = isPlainObject(value) ? value : {};
  const write = (next: unknown) => source.write(withListEntry(source.read(project), index, next));
  if (source.field.type === 'typedList') {
    return (
      <div className="flex flex-col gap-3">
        <FieldRow label={tRegistry('type')} yamlKey="type">
          <TypeInput source={source.field} entry={entry} onChange={write} />
        </FieldRow>
        <TypedEntryBody source={source.field} entry={value} onChange={write} />
      </div>
    );
  }
  const field: ObjectField = { type: 'object', key: '', label: '', fields: source.field.fields };
  return <ObjectFields field={field} value={entry} onChange={write} />;
}

/** The editor of a map entry: its name and its value. */
function MapEntryEditor({
  view,
  source,
  mapKey,
  value,
}: {
  view: CraftEngineRegistryView;
  source: MapSource;
  mapKey: string;
  value: unknown;
}) {
  const tRegistry = useTranslations('media.registry');
  const project = useOpenProject();
  const valueField = source.field.value;
  const write = (next: unknown) => source.write({ ...source.read(project), [mapKey]: next ?? (valueField.type === 'map' ? {} : '') });
  return (
    <div className="flex flex-col gap-3">
      <MapKeyField key={mapKey} view={view} source={source} mapKey={mapKey} />
      {valueField.type === 'object' ? (
        <ObjectFields field={valueField} value={value} onChange={write} />
      ) : (
        <FieldRow label={tRegistry('value')} layout="stacked">
          <FieldRenderer field={valueField} value={value} hideLabel onChange={write} />
        </FieldRow>
      )}
    </div>
  );
}

/** The page of one entry: header with its name, group and file, the `⋯` menu, and its editor. */
function EntryPage({ view, icon: Icon, docs, file, resolved }: RegistryPageProps & { resolved: ResolvedEntry }) {
  const t = useTranslations('media');
  const tRegistry = useTranslations('media.registry');
  const tCommon = useTranslations('common');
  const text = useRegistryGroupText();
  const project = useOpenProject();
  const { source } = resolved;
  const isMulti = CRAFT_ENGINE_SOURCES[view].length > 1;
  let title: string;
  let menu: MenuEntry[];
  let filePath: string;
  if (resolved.kind === 'list') {
    const { source: list, index } = resolved;
    const entries = list.read(project);
    const move = (to: number) => {
      list.write(withMovedEntry(entries, index, to));
      selectEntry(view, entryKey(list, Math.max(0, Math.min(entries.length - 1, to))));
    };
    title = listEntryLabel(list.field, resolved.value);
    filePath = file(project, list.id);
    menu = [
      {
        icon: <Copy />,
        label: tCommon('duplicate'),
        onSelect: () => {
          list.write(withDuplicate(entries, index));
          selectEntry(view, entryKey(list, index + 1));
        },
      },
      { icon: <ArrowUp />, label: tRegistry('moveUp'), disabled: index === 0, onSelect: () => move(index - 1) },
      { icon: <ArrowDown />, label: tRegistry('moveDown'), disabled: index === entries.length - 1, onSelect: () => move(index + 1) },
      'separator',
      {
        icon: <Trash2 />,
        label: tCommon('delete'),
        destructive: true,
        onSelect: () => {
          list.write(withoutListEntry(entries, index));
          selectEntry(view);
        },
      },
    ];
  } else {
    const { source: map, key } = resolved;
    title = key;
    filePath = file(project, map.id, key);
    menu = [
      {
        icon: <Trash2 />,
        label: tCommon('delete'),
        destructive: true,
        onSelect: () => {
          map.write(withoutKey(map.read(project), key));
          selectEntry(view);
        },
      },
    ];
  }

  return (
    <Page
      header={
        <PageHeader
          thumb={<Icon />}
          title={
            title ? (
              <span className="font-mono">{title}</span>
            ) : (
              <span className="text-text-muted italic">{text(source.id, 'untitled')}</span>
            )
          }
          meta={
            <>
              <Button variant="link" size="xs" className="h-auto p-0 text-meta" onClick={() => selectEntry(view)}>
                {t(`${view}.title`)}
              </Button>
              {isMulti && <StatusPill tone="info" label={text(source.id, 'title')} />}
              <FilePath path={`${CRAFT_ENGINE_PLUGIN_DIR}/${filePath}`} />
            </>
          }
          actions={<DocsLink url={docs} target="craftengine" label={t(`${view}.title`)} />}
          menu={menu}
        />
      }
    >
      {resolved.kind === 'list' ? (
        <ListEntryEditor key={`${source.id}/${resolved.index}`} source={resolved.source} index={resolved.index} value={resolved.value} />
      ) : (
        <MapEntryEditor view={view} source={resolved.source} mapKey={resolved.key} value={resolved.value} />
      )}
    </Page>
  );
}

/** A CraftEngine registry view: the selected entry's editor, or the overview. */
export function RegistryPage(props: RegistryPageProps) {
  const project = useOpenProject();
  const { view } = props;
  const selected = useSelectedEntry(view);
  const resolved = resolveEntry(CRAFT_ENGINE_SOURCES[view], project, selected);
  // The list as it was when the selected entry was last shown
  const shown = useRef<{ key: string; list: readonly unknown[] } | null>(null);
  // Keeps the selection on its entry when the project changes from elsewhere (undo, redo): a gone entry shows the
  // overview, a moved one is followed, and a slot that now holds a neighbour is not shown as if it were the entry
  useEffect(() => {
    if (selected === undefined || !resolved) {
      shown.current = null;
      if (selected !== undefined) selectEntry(view);
      return;
    }
    if (resolved.kind === 'map') {
      shown.current = null;
      return;
    }
    const list = resolved.source.read(project);
    const previous = shown.current;
    if (previous && previous.key === selected && previous.list !== list) {
      const index = followListEntry(previous.list, list, resolved.index);
      if (index !== resolved.index) {
        shown.current = null;
        selectEntry(view, index === null ? undefined : entryKey(resolved.source, index));
        return;
      }
    }
    shown.current = { key: selected, list };
  });
  return <ProjectFieldContext>{resolved ? <EntryPage {...props} resolved={resolved} /> : <Overview {...props} />}</ProjectFieldContext>;
}
