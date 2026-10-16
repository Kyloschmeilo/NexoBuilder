import { useTranslations } from 'next-intl';
import { Box, RefreshCw, Trash2 } from 'lucide-react';
import { cn } from 'cn';
import type { Item, VariantDef } from '@resourcepackbuilder/core/project';
import { DropZone, IconButton, pickFiles, Thumb, Tip } from '@resourcepackbuilder/ui';
import { useThumbnail } from '../../../components/useThumbnail';
import { removeVariant, setVariantModels } from '../../../commands/items';
import { MODEL_ACCEPT } from '../../../components/modelFiles';
import { useSchemaText } from '../../../components/useSchemaText';
import { useModelImport } from './useModelImport';

const THUMB_SIZE = 48;

/** A slot for exactly one model (a furniture feature or state). */
export function ModelSlot({ item, def }: { item: Item; def: VariantDef }) {
  const t = useTranslations('item');
  const tCommon = useTranslations('common');
  const tSchema = useSchemaText();
  const { importModels } = useModelImport();
  const model = item.variants?.[def.slot]?.[0] ?? null;
  const thumb = useThumbnail(model);

  const load = async (files: File[]) => {
    const [imported] = await importModels(files);
    if (imported) setVariantModels(item.id, def.slot, [imported]);
  };
  const replace = async () => {
    const files = await pickFiles(MODEL_ACCEPT);
    if (files.length) await load(files);
  };

  return (
    <div className={cn('flex min-w-0 flex-col gap-2 rounded-md border p-2', model && 'border-primary bg-primary/10')}>
      <div className="flex min-h-7 items-center gap-0.5">
        <span className="min-w-0 flex-1 truncate font-heading text-xs font-semibold tracking-[0.08em] uppercase">
          {tSchema(def.label, def.params)}
        </span>
        {model && (
          <>
            <IconButton label={t('model.replace')} size="icon-xs" onClick={() => void replace()}>
              <RefreshCw />
            </IconButton>
            <IconButton
              label={tCommon('remove')}
              size="icon-xs"
              variant="ghost-destructive"
              onClick={() => removeVariant(item.id, def.slot)}
            >
              <Trash2 />
            </IconButton>
          </>
        )}
      </div>
      {model ? (
        <div className="flex min-w-0 items-center gap-2">
          <Thumb size={THUMB_SIZE} src={thumb} fallback={<Box className="size-4.5 opacity-60" />} />
          <Tip label={model.fileName}>
            <span className="truncate text-xs text-muted-foreground">{model.fileName}</span>
          </Tip>
        </div>
      ) : (
        <DropZone
          onFiles={(files) => void load(files)}
          accept={MODEL_ACCEPT}
          title={t('slots.model')}
          subtitle={tSchema(def.description, def.params)}
          multiple={false}
          compact
        />
      )}
    </div>
  );
}
