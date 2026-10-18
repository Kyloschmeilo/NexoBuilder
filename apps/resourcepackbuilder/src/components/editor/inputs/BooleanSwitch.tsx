/**
 * The one boolean control. A required value is a plain switch with its state as text. An optional one keeps the
 * plugin default while unset: the switch shows that default dimmed with "Default: off", and once set, an "Unset" text
 * button clears the value again. So the three states (unset, on, off) read as one control.
 */
import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { clsx } from 'cn';
import { Switch } from '@resourcepackbuilder/ui/components/switch';

interface BooleanSwitchProps {
  value: boolean | undefined;
  /** Receives undefined when an optional value is unset. */
  onChange: (value: boolean | undefined) => void;
  /** The value must be on or off; there is no unset state. */
  required?: boolean;
  /** What the plugin uses while the value is unset (display only); off when left out. */
  defaultValue?: boolean;
  /** The field's name for screen readers, when no label element points at `id`. */
  label?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}

/** A switch with its state as text, and for optional values the plugin default and an unset button. */
export function BooleanSwitch({
  value,
  onChange,
  required = false,
  defaultValue = false,
  label,
  id,
  disabled,
  className,
}: BooleanSwitchProps) {
  const t = useTranslations('editor.inputs.switch');
  const stateId = useId();
  const isUnset = value === undefined && !required;
  const checked = value ?? defaultValue;
  const state = checked ? t('on') : t('off');
  return (
    <div
      data-slot="boolean-switch"
      data-unset={isUnset || undefined}
      className={clsx('flex min-h-(--control-height) items-center gap-2', className)}
    >
      <Switch
        id={id}
        aria-label={label}
        aria-describedby={stateId}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(next) => onChange(next)}
        className={clsx(isUnset && 'opacity-60')}
      />
      <span id={stateId} className={clsx('text-label', isUnset ? 'text-text-muted' : 'text-text')}>
        {isUnset ? t('defaultState', { state }) : state}
      </span>
      {!required && !isUnset && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(undefined)}
          title={t('unsetHint', { state: defaultValue ? t('on') : t('off') })}
          className="rounded-md px-1 text-meta text-text-muted underline-offset-2 outline-none hover:text-text hover:underline focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        >
          {t('unset')}
        </button>
      )}
    </div>
  );
}
