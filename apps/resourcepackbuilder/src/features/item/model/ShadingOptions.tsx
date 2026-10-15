import { useId } from 'react';
import { useTranslations } from 'next-intl';
import type { ImportedModel } from '@resourcepackbuilder/core/model/types';
import { Checkbox } from '@resourcepackbuilder/ui/components/checkbox';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@resourcepackbuilder/ui/components/field';
import { updateItemModel } from '../../../commands/items';

/** ambientocclusion (whole model) and shade (per cube) – like in Blockbench. */
export function ShadingOptions({ itemId, model }: { itemId: string; model: ImportedModel }) {
  const t = useTranslations('item');
  const aoId = useId();
  const shadeId = useId();
  const elements = model.json.elements ?? [];
  const unshaded = elements.filter((el) => el.shade === false).length;
  const shadeState = unshaded === 0 ? 'all' : unshaded === elements.length ? 'none' : 'some';
  const usesOverride = elements.some((el) => el.shade_direction_override !== undefined);

  const setAmbientOcclusion = (on: boolean) =>
    updateItemModel(itemId, (m) => {
      if (on) delete m.json.ambientocclusion;
      else m.json.ambientocclusion = false;
    });
  const setShade = (on: boolean) =>
    updateItemModel(itemId, (m) => {
      for (const el of m.json.elements ?? []) {
        if (on) delete el.shade;
        else el.shade = false;
      }
    });

  return (
    <div className="flex flex-col gap-3 py-1">
      <Field orientation="horizontal" className="gap-2.5">
        <Checkbox id={aoId} checked={model.json.ambientocclusion !== false} onCheckedChange={setAmbientOcclusion} />
        <FieldContent>
          <FieldLabel htmlFor={aoId}>{t('model.ambientOcclusion')}</FieldLabel>
          <FieldDescription className="text-xs">{t('model.ambientOcclusionHelp')}</FieldDescription>
        </FieldContent>
      </Field>
      {elements.length > 0 && (
        <Field orientation="horizontal" className="gap-2.5" data-disabled={usesOverride || undefined}>
          <Checkbox
            id={shadeId}
            checked={shadeState === 'all'}
            indeterminate={shadeState === 'some'}
            disabled={usesOverride}
            onCheckedChange={() => setShade(shadeState !== 'all')}
          />
          <FieldContent>
            <FieldLabel htmlFor={shadeId}>{t('model.shade')}</FieldLabel>
            <FieldDescription className="text-xs">
              {usesOverride
                ? t('model.shadeOverride')
                : shadeState === 'some'
                  ? t('model.shadeSome', { off: unshaded, total: elements.length })
                  : t('model.shadeHelp')}
            </FieldDescription>
          </FieldContent>
        </Field>
      )}
    </div>
  );
}
