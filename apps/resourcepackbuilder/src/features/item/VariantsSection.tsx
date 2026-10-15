import { useFormatter, useTranslations } from 'next-intl';
import { ArrowDown, ArrowUp, Box, Plus, RefreshCw, Trash2 } from 'lucide-react';
import type { ImportedModel } from '@resourcepackbuilder/core/model/types';
import type { Item } from '@resourcepackbuilder/core/project/types';
import { VARIANTS, variantPathSuffix, type VariantDef } from '@resourcepackbuilder/core/nexo/variants';
import { DropZone, pickFiles, Thumb, Tip } from '@resourcepackbuilder/ui';
import { Badge } from '@resourcepackbuilder/ui/components/badge';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@resourcepackbuilder/ui/components/dropdown-menu';
import { useThumbnail } from '@resourcepackbuilder/preview';
import { updateItem } from '../../commands/items';
import { EditorCard, EmptyCard } from './EditorCard';
import { EditorHint } from './EditorHint';
import { SectionTitle } from './SectionTitle';
import { MODEL_ACCEPT, useModelImport } from './useModelImport';

const ACCEPT = MODEL_ACCEPT;

export function VariantsSection({ item }: { item: Item }) {
  const t = useTranslations('item');
  const active = VARIANTS.filter((v) => item.variants?.[v.slot] !== undefined);
  return (
    <div>
      <SectionTitle actions={<AddVariantButton item={item} />}>{t('variants.title')}</SectionTitle>
      {active.length === 0 && <EmptyCard>{t.rich('variants.empty', { b: (chunks) => <strong>{chunks}</strong> })}</EmptyCard>}
      {active.map((def) => (
        <VariantCard key={def.slot} item={item} def={def} />
      ))}
    </div>
  );
}

function AddVariantButton({ item }: { item: Item }) {
  const tCommon = useTranslations('common');
  const tSchema = useTranslations('schema');
  const available = VARIANTS.filter((v) => item.variants?.[v.slot] === undefined);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="sm" disabled={available.length === 0} />}>
        <Plus /> {tCommon('add')}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[360px]">
        {available.map((def) => (
          <DropdownMenuItem
            key={def.slot}
            className="flex-col items-start gap-0.5"
            onClick={() =>
              updateItem(item.id, (d) => {
                d.variants = { ...(d.variants ?? {}), [def.slot]: [] };
              })
            }
          >
            <span className="font-medium">{tSchema(def.label as never)}</span>
            <span className="text-xs text-muted-foreground">{tSchema(def.description as never)}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function VariantCard({ item, def, removable = true }: { item: Item; def: VariantDef; removable?: boolean }) {
  const t = useTranslations('item');
  const tSchema = useTranslations('schema');
  const format = useFormatter();
  const { importModels } = useModelImport();
  const models = item.variants?.[def.slot] ?? [];
  const material = String(item.config.material ?? 'PAPER').toUpperCase();
  const wrongMaterial = def.materials && !def.materials.includes(material);
  const setModels = (next: ImportedModel[]) =>
    updateItem(item.id, (d) => {
      d.variants = { ...(d.variants ?? {}), [def.slot]: next };
    });
  const add = async (files: File[]) => {
    const imported = await importModels(files);
    if (imported.length === 0) return;
    setModels(def.multiple ? [...models, ...imported] : [imported[0]]);
  };

  return (
    <EditorCard
      title={tSchema(def.label as never)}
      badges={
        <>
          {def.kind === 'pack' && (
            <Tip label={t('properties.pathInYaml')}>
              <Badge variant="outline" className="font-mono">
                Pack.{def.slot}
              </Badge>
            </Tip>
          )}
          {def.kind === 'definition' && (
            <Badge variant="outline" className="font-mono">
              {t('variants.ownItemModel')}
            </Badge>
          )}
          {def.kind === 'block' && (
            <Badge variant="outline" className="font-mono">
              custom_block.stackable
            </Badge>
          )}
        </>
      }
      description={tSchema(def.description as never)}
      actions={
        removable && (
          <Tip label={t('variants.remove')}>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:text-destructive"
              aria-label={t('variants.remove')}
              onClick={() =>
                updateItem(item.id, (d) => {
                  const next = { ...(d.variants ?? {}) };
                  delete next[def.slot];
                  d.variants = next;
                })
              }
            >
              <Trash2 />
            </Button>
          </Tip>
        )
      }
    >
      {wrongMaterial && (
        <EditorHint
          warning
          action={
            <Button variant="outline" size="sm" onClick={() => updateItem(item.id, (d) => (d.config.material = def.materials![0]))}>
              {t('variants.setMaterial', { material: def.materials![0] })}
            </Button>
          }
        >
          {t('variants.wrongMaterial', { materials: format.list(def.materials!, { type: 'disjunction' }), material })}
        </EditorHint>
      )}
      {def.hint && <EditorHint>{tSchema(def.hint as never)}</EditorHint>}
      {models.length > 0 && (
        <div className="mb-2.5 flex flex-col gap-2">
          {models.map((model, index) => (
            <VariantEntry
              key={index}
              model={model}
              label={variantPathSuffix(def, index)}
              index={index}
              count={models.length}
              multiple={def.multiple}
              onMove={(to) => {
                const next = [...models];
                const [m] = next.splice(index, 1);
                next.splice(to, 0, m);
                setModels(next);
              }}
              onReplace={async () => {
                const files = await pickFiles(ACCEPT);
                if (!files.length) return;
                const [replacement] = await importModels(files);
                if (replacement) setModels(models.map((m, i) => (i === index ? replacement : m)));
              }}
              onRemove={() => setModels(models.filter((_, i) => i !== index))}
            />
          ))}
        </div>
      )}
      {(def.multiple || models.length === 0) && (
        <DropZone
          onFiles={(files) => void add(files)}
          accept={ACCEPT}
          title={def.multiple ? t('variants.dropMany') : t('model.dropTitle')}
          subtitle={def.multiple ? t('variants.dropManySubtitle') : t('variants.dropOneSubtitle')}
          compact
        />
      )}
    </EditorCard>
  );
}

interface VariantEntryProps {
  model: ImportedModel;
  label: string;
  index: number;
  count: number;
  multiple: boolean;
  onMove: (to: number) => void;
  onReplace: () => void;
  onRemove: () => void;
}

function VariantEntry({ model, label, index, count, multiple, onMove, onReplace, onRemove }: VariantEntryProps) {
  const t = useTranslations('item');
  const tCommon = useTranslations('common');
  const thumb = useThumbnail(model);
  const errors = model.issues.filter((i) => i.level === 'error').length;
  return (
    <div className="flex items-center gap-3 rounded-md border bg-muted/50 p-2">
      <Thumb size={44} src={thumb} fallback={<Box size={18} className="opacity-60" />} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-xs">
        <span className="font-mono">{label}</span>
        <span className="truncate text-muted-foreground">
          {model.fileName}
          {errors > 0 && <span className="text-destructive"> · {t('editor.errors', { count: errors })}</span>}
        </span>
      </div>
      {multiple && (
        <>
          <Tip label={t('variants.moveUp')}>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t('variants.moveUp')}
              disabled={index === 0}
              onClick={() => onMove(index - 1)}
            >
              <ArrowUp />
            </Button>
          </Tip>
          <Tip label={t('variants.moveDown')}>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t('variants.moveDown')}
              disabled={index === count - 1}
              onClick={() => onMove(index + 1)}
            >
              <ArrowDown />
            </Button>
          </Tip>
        </>
      )}
      <Tip label={t('model.replace')}>
        <Button variant="ghost" size="icon-sm" aria-label={t('model.replace')} onClick={onReplace}>
          <RefreshCw />
        </Button>
      </Tip>
      <Tip label={tCommon('remove')}>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-destructive hover:text-destructive"
          aria-label={tCommon('remove')}
          onClick={onRemove}
        >
          <Trash2 />
        </Button>
      </Tip>
    </div>
  );
}
