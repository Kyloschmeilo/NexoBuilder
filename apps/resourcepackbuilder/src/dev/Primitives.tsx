/**
 * Development page that shows every editor primitive of `@resourcepackbuilder/ui` with sample content, for checking the
 * Workbench look in each color theme and mode. It is served at `/dev/primitives` by `npm run dev` only and is not
 * linked from the app.
 */
import { useState } from 'react';
import { Box, Copy, Moon, Sun, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import {
  DocsLink,
  EmptyHint,
  FieldGroup,
  FieldRow,
  Help,
  ListEditor,
  MapEditor,
  MoreOptions,
  Page,
  PageHeader,
  Panel,
  Section,
  SectionNav,
  SegmentedControl,
  StatusPill,
  SubSection,
  useSectionSpy,
} from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { TooltipProvider } from '@resourcepackbuilder/ui/components/tooltip';
import { I18nProvider } from '../i18n/I18nProvider';
import { CatalogDemo } from './CatalogDemo';
import { COLOR_THEMES, type ColorTheme } from '../theme/colorThemes';
import { useColorTheme } from '../theme/useColorTheme';

const NEXO_ITEMS = 'https://docs.nexomc.com/configuration/items';
const CE_SETTINGS = 'https://xiao-momi.github.io/craft-engine-wiki/configuration/block/settings';

/** A sample block behavior of the list demos. */
interface Behavior {
  type: string;
  delay: number;
}

type Placement = 'nothing' | 'block' | 'furniture';

/** Theme and mode switches at the top of the page, so every theme can be checked without the settings. */
function ThemeBar() {
  const t = useTranslations('editor.devPrimitives');
  const tThemes = useTranslations('dialogs.settings.colorThemes');
  const { colorTheme, setColorTheme } = useColorTheme();
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SegmentedControl<ColorTheme>
        size="sm"
        aria-label={t('colorTheme')}
        value={colorTheme}
        options={COLOR_THEMES.map((id) => ({ value: id, label: tThemes(`${id}.name`) }))}
        onChange={setColorTheme}
      />
      <Button variant="outline" size="sm" onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>
        {resolvedTheme === 'dark' ? <Sun /> : <Moon />} {t('toggleMode')}
      </Button>
    </div>
  );
}

/** Every primitive with sample content. */
function PrimitivesPage() {
  const t = useTranslations('editor.devPrimitives');
  const [name, setName] = useState('<gold>Fire Sword');
  const [hardness, setHardness] = useState('3.0');
  const [saturation, setSaturation] = useState('-1');
  const [placement, setPlacement] = useState<Placement>('block');
  const [behaviors, setBehaviors] = useState<Behavior[]>([
    { type: 'crop_block', delay: 20 },
    { type: 'falling_block', delay: 0 },
    { type: 'door_block', delay: 5 },
  ]);
  const [dialogBehaviors, setDialogBehaviors] = useState<Behavior[]>([{ type: 'sapling_block', delay: 40 }]);
  const [empty, setEmpty] = useState<Behavior[]>([]);
  const [variables, setVariables] = useState<Record<string, string>>({ prefix: '<gray>[Shop]', currency: 'coins' });
  const sections = [
    { id: 'fields', label: t('sections.fields'), count: 6 },
    { id: 'fields-food', label: t('sections.food'), level: 1 as const },
    { id: 'lists', label: t('sections.lists'), count: behaviors.length, tone: 'warning' as const },
    { id: 'maps', label: t('sections.maps'), count: Object.keys(variables).length },
    { id: 'choices', label: t('sections.choices') },
    { id: 'feedback', label: t('sections.feedback'), tone: 'error' as const },
    { id: 'empty', label: t('sections.empty'), muted: true },
    { id: 'catalog', label: t('sections.catalog') },
    { id: 'features', label: t('sections.features') },
    { id: 'controls', label: t('sections.controls') },
  ];
  const spy = useSectionSpy(sections.map((section) => section.id));

  const behaviorEditor = (item: Behavior, onChange: (item: Behavior) => void) => (
    <FieldGroup>
      <FieldRow label={t('fields.type')} yamlKey="type" htmlFor={`type-${item.type}`}>
        <Input
          id={`type-${item.type}`}
          className="font-mono"
          value={item.type}
          onChange={(e) => onChange({ ...item, type: e.target.value })}
        />
      </FieldRow>
      <FieldRow label={t('fields.delay')} yamlKey="delay" help={t('fields.delayHelp')}>
        <Input
          aria-label={t('fields.delay')}
          className="w-28 font-mono"
          value={String(item.delay)}
          onChange={(e) => onChange({ ...item, delay: Number(e.target.value) || 0 })}
        />
      </FieldRow>
    </FieldGroup>
  );

  return (
    <Page
      header={
        <PageHeader
          thumb={<Box />}
          title={t('title')}
          status={<StatusPill tone="ok" dot label={t('pills.valid')} />}
          meta={
            <>
              <code className="font-mono">fire_sword</code>
              <span aria-hidden>·</span>
              <span>{t('meta.folder')}</span>
              <StatusPill tone="info" label="PAPER" />
            </>
          }
          actions={
            <Button variant="outline">
              <Copy /> {t('actions.duplicate')}
            </Button>
          }
          menu={[
            { icon: <Copy />, label: t('actions.copyFeatures'), onSelect: () => {} },
            'separator',
            { icon: <Trash2 />, label: t('actions.delete'), destructive: true, onSelect: () => {} },
          ]}
        />
      }
      nav={<SectionNav items={sections} activeId={spy.activeId} onSelect={spy.scrollTo} />}
    >
      <ThemeBar />
      <Section id="fields" title={t('sections.fields')} description={t('sections.fieldsDescription')}>
        <FieldGroup>
          <FieldRow
            label={t('fields.displayName')}
            htmlFor="display-name"
            yamlKey="itemname"
            docs={{ url: NEXO_ITEMS, target: 'nexo' }}
            help={t('fields.displayNameHelp')}
            helpInline
            state="set"
          >
            <Input id="display-name" className="font-mono" value={name} onChange={(e) => setName(e.target.value)} />
          </FieldRow>
          <FieldRow
            label={t('fields.hardness')}
            htmlFor="hardness"
            yamlKey="settings.hardness"
            docs={{ url: CE_SETTINGS, target: 'craftengine' }}
            help={t('fields.hardnessHelp')}
            state={hardness === '' ? 'default' : 'set'}
            onReset={() => setHardness('')}
          >
            <Input id="hardness" className="w-32 font-mono" value={hardness} onChange={(e) => setHardness(e.target.value)} />
          </FieldRow>
          <FieldRow label={t('fields.saturation')} htmlFor="saturation" yamlKey="saturation" error={t('fields.saturationError')}>
            <Input id="saturation" className="w-32 font-mono" value={saturation} onChange={(e) => setSaturation(e.target.value)} />
          </FieldRow>
          <FieldRow
            label={t('fields.material')}
            htmlFor="material"
            yamlKey="material"
            state="inherited"
            warning={t('fields.materialWarning')}
          >
            <Input id="material" className="font-mono" defaultValue="PAPER" />
          </FieldRow>
          <FieldRow label={t('fields.lore')} yamlKey="lore" layout="stacked">
            <Input aria-label={t('fields.lore')} defaultValue={t('fields.loreValue')} />
          </FieldRow>
          <MoreOptions count={2}>
            <FieldGroup>
              <FieldRow label={t('fields.unbreakable')} yamlKey="unbreakable">
                <Input aria-label={t('fields.unbreakable')} className="w-32 font-mono" defaultValue="true" />
              </FieldRow>
              <FieldRow label={t('fields.glint')} yamlKey="enchantment_glint_override">
                <Input aria-label={t('fields.glint')} className="w-32 font-mono" defaultValue="false" />
              </FieldRow>
            </FieldGroup>
          </MoreOptions>
        </FieldGroup>
        <SubSection id="fields-food" title={t('sections.food')} description={t('sections.foodDescription')} className="mt-3">
          <FieldGroup columns={3}>
            {(['x', 'y', 'z'] as const).map((axis) => (
              <FieldRow key={axis} label={axis.toUpperCase()} yamlKey={axis} layout="stacked">
                <Input aria-label={axis} className="font-mono" defaultValue="0" />
              </FieldRow>
            ))}
          </FieldGroup>
        </SubSection>
      </Section>

      <Section
        id="lists"
        title={t('sections.lists')}
        description={t('sections.listsDescription')}
        meta={<StatusPill tone="warning" label={t('pills.warnings', { count: 2 })} />}
      >
        <div className="flex flex-col gap-4">
          <ListEditor
            aria-label={t('sections.lists')}
            items={behaviors}
            onChange={setBehaviors}
            renderSummary={(item) => (
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate font-medium">{item.type}</span>
                <code className="font-mono text-micro text-text-faint">delay: {item.delay}</code>
              </span>
            )}
            renderEditor={behaviorEditor}
            onAdd={() => setBehaviors((prev) => [...prev, { type: 'new_block', delay: 0 }])}
            addLabel={t('actions.addBehavior')}
            emptyText={t('empty.behaviors')}
          />
          <ListEditor
            items={dialogBehaviors}
            onChange={setDialogBehaviors}
            editIn="dialog"
            renderSummary={(item) => item.type}
            renderEditor={behaviorEditor}
            onAdd={() => setDialogBehaviors((prev) => [...prev, { type: 'grass_block', delay: 0 }])}
            addLabel={t('actions.addBehavior')}
          />
        </div>
      </Section>

      <Section id="maps" title={t('sections.maps')} description={t('sections.mapsDescription')}>
        <MapEditor
          entries={variables}
          onChange={setVariables}
          newValue={() => ''}
          keyLabel={t('fields.variable')}
          valueLabel={t('fields.variableValue')}
          keySuggestions={['prefix', 'suffix', 'currency']}
          renderValue={(value, onChange, key) => (
            <Input aria-label={key} className="font-mono" value={value} onChange={(e) => onChange(e.target.value)} />
          )}
        />
      </Section>

      <Section id="choices" title={t('sections.choices')}>
        <FieldGroup>
          <FieldRow label={t('fields.places')} yamlKey="behavior.type">
            <SegmentedControl<Placement>
              aria-label={t('fields.places')}
              value={placement}
              onChange={setPlacement}
              options={[
                { value: 'nothing', label: t('choices.nothing') },
                { value: 'block', label: t('choices.block') },
                { value: 'furniture', label: t('choices.furniture') },
              ]}
            />
          </FieldRow>
        </FieldGroup>
      </Section>

      <Section id="feedback" title={t('sections.feedback')}>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone="ok" dot label={t('pills.valid')} />
            <StatusPill tone="warning" label={t('pills.warnings', { count: 2 })} />
            <StatusPill tone="error" label={t('pills.errors', { count: 1 })} />
            <StatusPill tone="info" label={t('pills.info')} />
            <StatusPill tone="muted" label={t('pills.draft')} />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-label">
            <DocsLink url={NEXO_ITEMS} target="nexo" label={t('fields.displayName')} />
            <DocsLink url={CE_SETTINGS} target="craftengine" label={t('fields.hardness')} />
            <Help>{t('fields.hardnessHelp')}</Help>
          </div>
          <EmptyHint actionLabel={t('actions.addBehavior')} onAction={() => setEmpty([{ type: 'stone', delay: 0 }])}>
            {t('empty.behaviors')}
          </EmptyHint>
          <Panel className="p-3 text-label text-text-muted">{t('panel')}</Panel>
        </div>
      </Section>

      <Section id="empty" title={t('sections.empty')}>
        <ListEditor
          items={empty}
          onChange={setEmpty}
          renderSummary={(item) => item.type}
          onAdd={() => setEmpty([{ type: 'stone', delay: 0 }])}
          addLabel={t('actions.addRecipe')}
          emptyText={t('empty.recipes')}
        />
      </Section>

      <CatalogDemo />
    </Page>
  );
}

/** The primitives page with the providers the app root gives its pages (messages, ui labels, tooltips). */
export default function Primitives() {
  return (
    <I18nProvider>
      <TooltipProvider>
        <div className="min-h-screen bg-background text-foreground">
          <PrimitivesPage />
        </div>
      </TooltipProvider>
    </I18nProvider>
  );
}
