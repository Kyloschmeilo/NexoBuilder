import type { ObjectField } from '@resourcepackbuilder/core/form';
import { isPlainObject } from '@resourcepackbuilder/utils';
import { FieldRenderer } from '../../components/editor';

/**
 * The child fields of an object field, each rendered on its own, for a page whose whole content is that object (a
 * dialog file, multipack.yml): no collapsible frame around them. Siblings are passed on, so `showIf` (e.g. the fields
 * of a dialog type) works; a cleared field removes its key.
 */
export function ObjectFieldRows({
  field,
  value,
  onChange,
}: {
  field: ObjectField;
  value: unknown;
  onChange: (value: Record<string, unknown>) => void;
}) {
  const object = isPlainObject(value) ? value : {};
  return (
    <div className="flex flex-col gap-3">
      {field.fields.map((child) => (
        <FieldRenderer
          key={child.key}
          field={child}
          value={object[child.key]}
          siblings={object}
          onChange={(next) => {
            const updated: Record<string, unknown> = { ...object };
            if (next === undefined) delete updated[child.key];
            else updated[child.key] = next;
            onChange(updated);
          }}
        />
      ))}
    </div>
  );
}
