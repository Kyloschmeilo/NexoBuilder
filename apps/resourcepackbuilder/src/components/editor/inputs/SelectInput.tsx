import { useTranslations } from 'next-intl';
import { NativeSelect, NativeSelectOption } from '@resourcepackbuilder/ui/components/native-select';
import { useChoiceText, type Choice } from './choices';
import { TextInput } from './TextInput';

interface SelectInputProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  options: readonly Choice[];
  /** Free text with the options as suggestions instead of a fixed list. */
  allowCustom?: boolean;
  /** Display text of the empty choice. */
  placeholder?: string;
}

/** A select with a "not set" entry; a value outside the options is kept and shown as is. */
export function SelectInput({ value, onChange, options, allowCustom, placeholder }: SelectInputProps) {
  const t = useTranslations('ui');
  const choiceText = useChoiceText();
  if (allowCustom) {
    return <TextInput value={value} onChange={onChange} suggestions={options} placeholder={placeholder ?? t('inputs.selectOrType')} />;
  }
  const known = options.some((o) => o.value === value);
  return (
    <NativeSelect className="w-full" value={value ?? ''} onChange={(e) => onChange(e.target.value || undefined)}>
      <NativeSelectOption value="">{placeholder ? t('inputs.placeholderOption', { placeholder }) : t('inputs.notSetOption')}</NativeSelectOption>
      {!known && value && <NativeSelectOption value={value}>{value}</NativeSelectOption>}
      {options.map((o) => (
        <NativeSelectOption key={o.value} value={o.value}>
          {choiceText(o) ?? o.value}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
}
