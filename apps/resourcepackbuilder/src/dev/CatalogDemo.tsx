/**
 * The catalog part of the dev primitives page, on real schema data: the CatalogDialog over CraftEngine's block
 * behaviors (multi, with the added state and "Jump to") and over Nexo's components, a FeatureList of Nexo properties,
 * TypedEntryCards including an unknown type with the YAML fallback, and the Vector3Input and BooleanSwitch controls.
 */
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { CE_LOGIC } from '@resourcepackbuilder/core/craftEngine';
import { getPropertyValue, type PropertyDef, setPropertyValue } from '@resourcepackbuilder/core/form';
import type { ConfigObject } from '@resourcepackbuilder/core/project';
import { formFor } from '@resourcepackbuilder/core/targets';
import { FieldGroup, FieldRow, Section } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { catalogFromPropertyGroup, catalogFromTypedSource, CatalogDialog, TypedEntryCard, useCatalogText } from '../components/catalog';
import { FieldContext, type FieldContextValue } from '../components/editor';
import { BooleanSwitch } from '../components/editor/inputs/BooleanSwitch';
import { Vector3Input } from '../components/editor/inputs/Vector3Input';
import { expandFeature, FeatureList, PropertyFeatureRow } from '../components/features';
import { FormTargetProvider } from '../components/formTarget';

const FIELD_CONTEXT: FieldContextValue = { minecraftVersion: '1.21.4', uploadAsset: async () => null, getAsset: () => undefined };
const VERSION = '1.21.4';
const BEHAVIORS = { types: () => CE_LOGIC.blockBehaviors };

/** Scrolls to the element marked with `data-demo-id`. */
function jumpTo(id: string) {
  const element = document.querySelector(`[data-demo-id="${CSS.escape(id)}"]`);
  element?.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

/** CraftEngine block behaviors: the picker, and one card per behavior. */
function BehaviorsDemo() {
  const t = useTranslations('editor.devPrimitives.catalog');
  const text = useCatalogText();
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<unknown[]>([
    { type: 'crop_block', grow_speed: 0.25, light_requirement: 9 },
    { type: 'falling_block', hurt_amount: 2 },
    { type: 'future_block', speed: 3, mode: 'fast' },
  ]);
  const types = entries.map((entry) => (entry as { type?: string }).type ?? '');
  const catalog = catalogFromTypedSource(BEHAVIORS, { text, target: 'craftengine', added: types });
  return (
    <div className="flex flex-col gap-2">
      {entries.map((entry, i) => (
        <div key={i} data-demo-id={types[i]}>
          <TypedEntryCard
            source={BEHAVIORS}
            entry={entry}
            defaultOpen={i !== 1}
            onChange={(next) => setEntries((prev) => prev.map((old, j) => (j === i ? next : old)))}
            onRemove={() => setEntries((prev) => prev.filter((_, j) => j !== i))}
          />
        </div>
      ))}
      <Button variant="ghost" className="self-start" onClick={() => setOpen(true)} data-demo="open-behaviors">
        <Plus /> {t('addBehavior')}
      </Button>
      <CatalogDialog
        open={open}
        onOpenChange={setOpen}
        title={t('behaviorsTitle')}
        description={t('behaviorsDescription')}
        searchPlaceholder={t('behaviorsSearch')}
        {...catalog}
        multi
        addLabel={t('addBehavior')}
        onAdd={(ids) => setEntries((prev) => [...prev, ...ids.map((type) => ({ type }))])}
        onJumpTo={jumpTo}
      />
    </div>
  );
}

/** Nexo components: the picker over the group, and the item's components as a feature list. */
function ComponentsDemo() {
  const t = useTranslations('editor.devPrimitives.catalog');
  const text = useCatalogText();
  const schema = formFor('nexo');
  const [config, setConfig] = useState<ConfigObject>({
    Components: {
      max_stack_size: 16,
      fire_resistant: true,
      food: { nutrition: 4, saturation: 2.4 },
      tooltip_display: ['minecraft:attribute_modifiers'],
    },
  });
  const [open, setOpen] = useState(false);
  const owner = { config };
  const catalog = useMemo(
    () => catalogFromPropertyGroup(schema, { config }, 'components', { text, version: VERSION }),
    [schema, config, text],
  );
  const active = schema.properties.filter((def) => def.group === 'components' && getPropertyValue(owner, def) !== undefined);
  const update = (def: PropertyDef, value: unknown) =>
    setConfig((prev) => {
      const next = { config: structuredClone(prev) };
      setPropertyValue(next, def, value as never);
      return next.config;
    });
  return (
    <div className="flex flex-col gap-2">
      <FeatureList>
        {active.map((def) => (
          <div key={def.id} data-demo-id={def.id}>
            <PropertyFeatureRow
              def={def}
              value={getPropertyValue(owner, def)}
              version={VERSION}
              expansionKey={`demo/${def.id}`}
              issues={def.id === 'Components.max_stack_size' ? [{ tone: 'warning', message: t('stackWarning') }] : undefined}
              onChange={(value) => update(def, value)}
              onRemove={() => update(def, undefined)}
            />
          </div>
        ))}
      </FeatureList>
      <Button variant="ghost" className="self-start" onClick={() => setOpen(true)} data-demo="open-components">
        <Plus /> {t('addComponent')}
      </Button>
      <CatalogDialog
        open={open}
        onOpenChange={setOpen}
        title={t('componentsTitle')}
        searchPlaceholder={t('componentsSearch')}
        {...catalog}
        multi
        addLabel={t('addComponent')}
        onAdd={(ids) => {
          for (const id of ids) {
            const def = schema.properties.find((p) => p.id === id);
            if (def) {
              update(def, def.defaultValue());
              expandFeature('demo', id);
            }
          }
        }}
        onJumpTo={jumpTo}
      />
    </div>
  );
}

/** The two new controls. */
function ControlsDemo() {
  const t = useTranslations('editor.devPrimitives.catalog');
  const [translation, setTranslation] = useState<string | undefined>('0,0.5,-0.25');
  const [glint, setGlint] = useState<boolean | undefined>(undefined);
  const [unbreakable, setUnbreakable] = useState(true);
  return (
    <FieldGroup>
      <FieldRow label={t('translation')} yamlKey="translation">
        <Vector3Input label={t('translation')} value={translation} onChange={setTranslation} placeholder="0" />
      </FieldRow>
      <FieldRow label={t('glint')} yamlKey="enchantment_glint_override">
        <BooleanSwitch value={glint} onChange={setGlint} defaultHint={false} aria-label={t('glint')} />
      </FieldRow>
      <FieldRow label={t('unbreakable')} yamlKey="unbreakable">
        <BooleanSwitch allowUnset={false} value={unbreakable} onChange={(next) => setUnbreakable(!!next)} aria-label={t('unbreakable')} />
      </FieldRow>
    </FieldGroup>
  );
}

/** The catalog sections of the dev page. */
export function CatalogDemo() {
  const t = useTranslations('editor.devPrimitives');
  return (
    <FieldContext.Provider value={FIELD_CONTEXT}>
      <Section id="catalog" title={t('sections.catalog')} description={t('sections.catalogDescription')}>
        <FormTargetProvider target="craftengine">
          <BehaviorsDemo />
        </FormTargetProvider>
      </Section>
      <Section id="features" title={t('sections.features')} description={t('sections.featuresDescription')}>
        <FormTargetProvider target="nexo">
          <ComponentsDemo />
        </FormTargetProvider>
      </Section>
      <Section id="controls" title={t('sections.controls')}>
        <ControlsDemo />
      </Section>
    </FieldContext.Provider>
  );
}
