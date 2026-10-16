/** Display name, item ID and material of an item – in the item editor and for new items. */
import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from 'cn';
import { normalizeTypedId } from '@resourcepackbuilder/minecraft';
import { DEFAULT_MATERIAL, type ItemIdError, itemLabel, normalizeTypedMaterial } from '@resourcepackbuilder/core/project';
import { MATERIALS } from '@resourcepackbuilder/core/nexo';
import { Field, FieldDescription, FieldError, FieldLabel } from '@resourcepackbuilder/ui/components/field';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { TextInput } from './editor';

/** Example tags shown in the display-name help (MiniMessage syntax, not translated). */
const DISPLAY_NAME_EXAMPLE = '<gradient:#ff5555:#ffaa00>';
const COLOR_EXAMPLES = '<red>, <#ff8800>, <gradient:#ff0000:#0000ff>';
const FORMATTING_EXAMPLES = '<bold>, <italic>, <!italic>';

export interface ItemIdentity {
  displayName: string;
  itemId: string;
  material: string;
}

/** The text of an item ID error (see validateItemId / validateNewItemIds). */
export function useItemIdErrorText(): (error: ItemIdError | null) => string | null {
  const t = useTranslations('item');
  return (error) => {
    switch (error?.kind) {
      case 'missing':
        return t('general.idEmpty');
      case 'invalid':
        return t('general.idInvalid');
      case 'duplicate':
        return t('general.idDuplicate', { name: itemLabel(error.other) });
      case 'repeated':
        return t('general.idRepeated');
      default:
        return null;
    }
  };
}

interface ItemIdentityFieldsProps {
  value: ItemIdentity;
  idError: ItemIdError | null;
  /** Receives the changed field; IDs and materials are normalised as typed */
  onChange: (patch: Partial<ItemIdentity>, field: keyof ItemIdentity) => void;
  /** Help texts below the display name and material (the editor has room for them) */
  showHelp?: boolean;
  autoFocus?: boolean;
  /** `data-testid` of the display name input */
  displayNameTestId?: string;
  /** Class of every field */
  fieldClassName?: string;
  /** Additional class of the display name field, e.g. to span the grid */
  displayNameClassName?: string;
}

/** The three fields as siblings; the caller places them in its grid. */
export function ItemIdentityFields({
  value,
  idError,
  onChange,
  showHelp,
  autoFocus,
  displayNameTestId,
  fieldClassName,
  displayNameClassName,
}: ItemIdentityFieldsProps) {
  const t = useTranslations('item');
  const idErrorText = useItemIdErrorText()(idError);
  const id = useId();
  return (
    <>
      <Field className={cn(fieldClassName, displayNameClassName)}>
        <FieldLabel htmlFor={`${id}-name`}>{t('general.displayName')}</FieldLabel>
        <Input
          id={`${id}-name`}
          data-testid={displayNameTestId}
          value={value.displayName}
          placeholder={t('general.displayNamePlaceholder', { tag: DISPLAY_NAME_EXAMPLE })}
          autoFocus={autoFocus}
          onChange={(e) => onChange({ displayName: e.target.value }, 'displayName')}
        />
        {showHelp && (
          <FieldDescription className="text-xs">
            {t('general.displayNameHelp', { colors: COLOR_EXAMPLES, formatting: FORMATTING_EXAMPLES })}
          </FieldDescription>
        )}
      </Field>
      <Field className={fieldClassName} data-invalid={idErrorText ? true : undefined}>
        <FieldLabel htmlFor={`${id}-id`}>{t('general.itemId')}</FieldLabel>
        <Input
          id={`${id}-id`}
          className="font-mono"
          aria-invalid={idErrorText ? true : undefined}
          value={value.itemId}
          onChange={(e) => onChange({ itemId: normalizeTypedId(e.target.value) }, 'itemId')}
        />
        {idErrorText && <FieldError className="text-xs">{idErrorText}</FieldError>}
      </Field>
      <Field className={fieldClassName}>
        <FieldLabel htmlFor={`${id}-material`}>{t('general.material')}</FieldLabel>
        <TextInput
          id={`${id}-material`}
          value={value.material}
          placeholder={DEFAULT_MATERIAL}
          suggestions={MATERIALS}
          mono
          onChange={(material) => onChange({ material: normalizeTypedMaterial(material ?? '') }, 'material')}
        />
        {showHelp && <FieldDescription className="text-xs">{t('general.materialHelp')}</FieldDescription>}
      </Field>
    </>
  );
}
