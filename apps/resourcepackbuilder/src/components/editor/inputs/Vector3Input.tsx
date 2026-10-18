/**
 * Three compact number inputs with x, y and z inside the field, for positions, translations, rotations and scales.
 * The value is a tuple; `parseVector3` and `formatVector3` convert the text form the plugins write (`0.5,1,0`).
 */
import { useTranslations } from 'next-intl';
import { clsx } from 'cn';
import { NumberInput } from './NumberInput';

/** x, y and z; an axis left empty is undefined. */
export type Vector3 = readonly [x: number | undefined, y: number | undefined, z: number | undefined];

const AXES = ['x', 'y', 'z'] as const;

/** Reads `0.5,1,0` or `0.5 1 0` into a vector; an empty or unreadable text gives undefined. */
export function parseVector3(text: string | undefined): Vector3 | undefined {
  if (!text?.trim()) return undefined;
  const parts = text.trim().split(/\s*,\s*|\s+/);
  if (parts.length !== 3) return undefined;
  const numbers = parts.map((part) => (/^-?\d+(\.\d+)?$/.test(part) ? Number(part) : NaN));
  return numbers.some(Number.isNaN) ? undefined : [numbers[0], numbers[1], numbers[2]];
}

/** Writes a vector as `x,y,z` (another separator with `separator`); undefined when no axis is set, empty axes as 0. */
export function formatVector3(vector: Vector3 | undefined, separator = ','): string | undefined {
  if (!vector || vector.every((axis) => axis === undefined)) return undefined;
  return vector.map((axis) => axis ?? 0).join(separator);
}

interface Vector3InputProps {
  value: Vector3 | undefined;
  /** Receives the whole vector after an axis changes, or undefined once every axis is empty. */
  onChange: (value: Vector3 | undefined) => void;
  /** The field's name; each input is named "<label> x" … for screen readers. */
  label: string;
  integer?: boolean;
  min?: number;
  max?: number;
  /** What an empty axis means (e.g. the plugin's default `0`). */
  placeholder?: string;
  invalid?: boolean;
  className?: string;
}

/** x | y | z, side by side, each with its axis letter inside the field. */
export function Vector3Input({ value, onChange, label, integer, min, max, placeholder, invalid, className }: Vector3InputProps) {
  const t = useTranslations('editor.inputs.vector');
  const setAxis = (index: number, next: number | undefined) => {
    const vector = [...(value ?? [undefined, undefined, undefined])] as [number | undefined, number | undefined, number | undefined];
    vector[index] = next;
    onChange(vector.every((axis) => axis === undefined) ? undefined : vector);
  };
  return (
    <div role="group" aria-label={label} data-slot="vector3-input" className={clsx('grid max-w-80 grid-cols-3 gap-1.5', className)}>
      {AXES.map((axis, index) => (
        <div key={axis} className="relative min-w-0">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-2 z-10 flex items-center font-mono text-micro font-semibold text-text-faint"
          >
            {axis}
          </span>
          <NumberInput
            label={t('axis', { label, axis })}
            className="pl-5.5 font-mono"
            value={value?.[index]}
            onChange={(next) => setAxis(index, next)}
            integer={integer}
            min={min}
            max={max}
            placeholder={placeholder}
            invalid={invalid}
          />
        </div>
      ))}
    </div>
  );
}
