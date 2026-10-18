/**
 * The boolean control of the field editors: a switch. An optional value keeps its third state ("not set", the plugin
 * decides) as one control: while unset, the switch shows the plugin's default dimmed with "Default: on/off" beside it;
 * once set, an "Unset" text button clears the value again.
 */
import { useTranslations } from 'next-intl';
import { cn } from 'cn';
import { DEFAULT_PACK_TARGET } from '@resourcepackbuilder/core/project';
import { serverAdapterFor } from '@resourcepackbuilder/test-server';
import { Tip } from '@resourcepackbuilder/ui';
import { Switch } from '@resourcepackbuilder/ui/components/switch';
import { useProjectStore } from '../../../store/project';

interface BooleanSwitchProps {
  id?: string;
  value: boolean | undefined;
  onChange: (value: boolean | undefined) => void;
  /** Offers clearing the value (the plugin's default then applies). */
  allowUnset?: boolean;
  /** The value the plugin uses while unset (display only). */
  defaultHint?: boolean;
  /** Accessible name when no label points at the switch. */
  'aria-label'?: string;
  className?: string;
}

/** A switch, optionally with the "not set" state of a plugin default. */
export function BooleanSwitch({ id, value, onChange, allowUnset = true, defaultHint, className, ...props }: BooleanSwitchProps) {
  const t = useTranslations('editor');
  const plugin = serverAdapterFor(useProjectStore((s) => s.project?.target ?? DEFAULT_PACK_TARGET)).pluginName;
  const isUnset = value === undefined;
  const shown = value ?? defaultHint ?? false;
  const onOff = (on: boolean) => (on ? t('inputs.on') : t('inputs.off'));
  return (
    <div data-slot="boolean-switch" data-unset={isUnset || undefined} className={cn('flex min-h-7.5 items-center gap-2.5', className)}>
      <Switch
        id={id}
        aria-label={props['aria-label']}
        checked={shown}
        // An unset switch shows the plugin default dimmed, so a set value stands out
        className={cn(isUnset && allowUnset && 'opacity-60')}
        onCheckedChange={(checked) => onChange(checked)}
      />
      {allowUnset &&
        (isUnset ? (
          <Tip label={t('inputs.defaultTooltip', { plugin })}>
            <span className="text-meta text-text-muted">
              {defaultHint === undefined ? t('inputs.notSet') : t('inputs.defaultIs', { value: onOff(defaultHint) })}
            </span>
          </Tip>
        ) : (
          <Tip label={t('inputs.defaultTooltip', { plugin })}>
            <button
              type="button"
              className="cursor-pointer rounded-sm text-meta text-text-muted underline-offset-2 outline-none hover:text-text hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => onChange(undefined)}
            >
              {defaultHint === undefined ? t('inputs.unset') : t('inputs.unsetWithDefault', { value: onOff(defaultHint) })}
            </button>
          </Tip>
        ))}
    </div>
  );
}
