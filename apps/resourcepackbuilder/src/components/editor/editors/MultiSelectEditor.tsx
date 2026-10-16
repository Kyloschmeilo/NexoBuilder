import type { MultiSelectField } from '@resourcepackbuilder/core/nexo/form/fields';
import { ToggleGroup, ToggleGroupItem } from '@resourcepackbuilder/ui/components/toggle-group';
import { FieldShell } from '../FieldShell';
import { useChoiceText } from '../inputs/choices';
import type { EditorProps } from '../types';
import { listOrUndefined, toStringList, toggleSelection } from '../values';

export function MultiSelectEditor({ field, value, onChange, hideLabel }: EditorProps<MultiSelectField>) {
  const choiceText = useChoiceText();
  const selected = Array.isArray(value) ? toStringList(value) : [];
  return (
    <FieldShell field={field} hideLabel={hideLabel} wide>
      <ToggleGroup
        multiple
        className="flex-wrap"
        value={selected}
        onValueChange={(next: string[]) => onChange(listOrUndefined(toggleSelection(selected, next)))}
      >
        {field.options.map((option) => (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            size="sm"
            variant="outline"
            className="h-6 rounded-full px-2.5 text-xs font-normal data-pressed:border-primary data-pressed:bg-accent data-pressed:text-primary"
          >
            {choiceText(option) ?? option.value}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </FieldShell>
  );
}
