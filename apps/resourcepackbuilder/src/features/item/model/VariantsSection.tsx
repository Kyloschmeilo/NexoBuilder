/**
 * The special appearance of an item (Nexo's "Special Item Appearance", CraftEngine's generated `models`): extra models
 * for states such as pulling a bow or blocking with a shield, as a list of collapsed rows that expand to their models.
 * "Add appearance" opens the catalog of the slots the project's target exports; a model stored in a slot of another
 * target stays listed, marked as not exported, so it can be removed.
 */
import { useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { Box } from 'lucide-react';
import { isVariantForTarget, type Item, VARIANTS, type VariantDef } from '@resourcepackbuilder/core/project';
import { serverAdapterFor } from '@resourcepackbuilder/test-server';
import { ListEditor, Section, StatusPill, Thumb } from '@resourcepackbuilder/ui';
import { removeVariant, setVariantModels } from '../../../commands/items';
import { CatalogDialog, type CatalogItem } from '../../../components/catalog';
import { useSchemaText } from '../../../components/useSchemaText';
import { useThumbnail } from '../../../components/useThumbnail';
import { useOpenProject } from '../../../store/project';
import { fitsMaterial, useVariantDocs, useVariantKey, VariantModels } from './VariantCard';

const THUMB_SIZE = 22;

/** The item's variants in the order they were added (the list's add appends at the end). */
function activeVariants(item: Item): VariantDef[] {
  const slots = Object.keys(item.variants ?? {});
  return slots.flatMap((slot) => VARIANTS.filter((def) => def.slot === slot));
}

/** The collapsed row of a variant: thumbnail, name, model count, warnings and the YAML key. */
function VariantSummary({ item, def }: { item: Item; def: VariantDef }) {
  const t = useTranslations('item');
  const format = useFormatter();
  const tSchema = useSchemaText();
  const variantKey = useVariantKey();
  const target = useOpenProject().target;
  const models = item.variants?.[def.slot] ?? [];
  const thumb = useThumbnail(models[0] ?? null);
  const key = variantKey(def);
  return (
    <span className="@container/variant flex min-w-0 items-center gap-2">
      <Thumb size={THUMB_SIZE} src={thumb} fallback={<Box className="size-3.5 opacity-60" />} />
      <span className="truncate font-medium">{tSchema(def.label, def.params)}</span>
      <span className="flex-none text-meta text-text-muted">{t('variants.modelCount', { count: models.length })}</span>
      {!isVariantForTarget(def, target) && (
        <StatusPill tone="warning" label={t('variants.notExported', { plugin: serverAdapterFor(target).pluginName })} />
      )}
      {isVariantForTarget(def, target) && !fitsMaterial(item, def) && def.materials && (
        <StatusPill
          tone="warning"
          label={t('variants.needsMaterial', { materials: format.list(def.materials, { type: 'disjunction' }) })}
        />
      )}
      {key && (
        <code className="ml-auto hidden max-w-56 flex-none truncate font-mono text-micro text-text-faint @md/variant:block">{key}</code>
      )}
    </span>
  );
}

/** The catalog entries of the slots the project's target exports; slots the item already has are marked added. */
function useVariantCatalog(item: Item): CatalogItem[] {
  const tSchema = useSchemaText();
  const variantKey = useVariantKey();
  const docs = useVariantDocs();
  const target = useOpenProject().target;
  return VARIANTS.filter((def) => isVariantForTarget(def, target)).map((def) => ({
    id: def.slot,
    label: tSchema(def.label, def.params),
    description: tSchema(def.description, def.params),
    yamlKey: variantKey(def) ?? def.slot,
    docs: docs(def),
    added: item.variants?.[def.slot] !== undefined,
    note: def.hint ? tSchema(def.hint, def.params) : undefined,
  }));
}

/** The special appearance section of an item. */
export function VariantsSection({ item, id }: { item: Item; id?: string }) {
  const t = useTranslations('item');
  const [isPicking, setIsPicking] = useState(false);
  const catalog = useVariantCatalog(item);
  const active = activeVariants(item);
  return (
    <Section id={id} title={t('variants.title')} description={t('variants.description')}>
      <ListEditor
        aria-label={t('variants.title')}
        items={active}
        getKey={(def) => def.slot}
        reorderable={false}
        duplicate={false}
        onChange={(next) => {
          for (const def of active) if (!next.includes(def)) removeVariant(item.id, def.slot);
        }}
        renderSummary={(def) => <VariantSummary item={item} def={def} />}
        renderEditor={(def) => <VariantModels item={item} def={def} />}
        onAdd={() => setIsPicking(true)}
        addLabel={t('variants.add')}
        emptyText={t('variants.emptyText')}
      />
      <CatalogDialog
        open={isPicking}
        onOpenChange={setIsPicking}
        title={t('variants.catalogTitle')}
        items={catalog}
        addLabel={t('variants.add')}
        onAdd={(slots) => {
          for (const slot of slots) setVariantModels(item.id, slot as VariantDef['slot'], []);
        }}
        onJumpTo={(slot) =>
          document.querySelector(`[data-row-key="${CSS.escape(slot)}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
        }
      />
    </Section>
  );
}
