/** Display name, item ID and material of one new item. */
import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { MATERIALS } from '@resourcepackbuilder/core/nexo/options';
import { DEFAULT_MATERIAL, normalizeTypedMaterial } from '@resourcepackbuilder/core/nexo/material';
import { normalizeTypedId } from '@resourcepackbuilder/core/minecraft/resourceLocation';
import { Field, FieldError, FieldLabel } from '@resourcepackbuilder/ui/components/field';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { TextInput } from '../../components/editor';
import type { ItemMeta, MetaPatch } from './newItemState';
import type { IdError } from './useNewItems';

interface ItemMetaFieldsProps {
  meta: ItemMeta;
  idError: IdError | null;
  onChange: (patch: MetaPatch) => void;
}

export function ItemMetaFields({ meta, idError, onChange }: ItemMetaFieldsProps) {
  const t = useTranslations('dialogs.newItem');
  const id = useId();
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-4">
      <Field>
        <FieldLabel htmlFor={`${id}-name`}>{t('displayName')}</FieldLabel>
        <Input
          id={`${id}-name`}
          data-testid="new-item-display-name"
          value={meta.displayName}
          placeholder={t('displayNamePlaceholder', { tag: '<red>' })}
          autoFocus
          onChange={(e) => onChange({ displayName: e.target.value })}
        />
      </Field>
      <Field data-invalid={idError !== null}>
        <FieldLabel htmlFor={`${id}-id`}>{t('itemId')}</FieldLabel>
        <Input
          id={`${id}-id`}
          className="font-mono"
          aria-invalid={idError !== null}
          value={meta.nexoId}
          onChange={(e) => onChange({ nexoId: normalizeTypedId(e.target.value) })}
        />
        {idError && <FieldError>{t(idError)}</FieldError>}
      </Field>
      <Field>
        <FieldLabel htmlFor={`${id}-material`}>{t('material')}</FieldLabel>
        <TextInput
          id={`${id}-material`}
          value={meta.material}
          placeholder={DEFAULT_MATERIAL}
          suggestions={MATERIALS}
          mono
          onChange={(value) => onChange({ material: normalizeTypedMaterial(value ?? '') })}
        />
      </Field>
    </div>
  );
}
