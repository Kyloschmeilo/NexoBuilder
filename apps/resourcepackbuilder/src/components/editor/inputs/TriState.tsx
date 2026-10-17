import { useTranslations } from 'next-intl';
import { DEFAULT_PACK_TARGET } from '@resourcepackbuilder/core/project';
import { serverAdapterFor } from '@resourcepackbuilder/test-server';
import { SegmentedControl, type SegmentedOption } from '@resourcepackbuilder/ui';
import { useProjectStore } from '../../../store/project';

interface TriStateProps {
  value: boolean | undefined;
  onChange: (value: boolean | undefined) => void;
  /** Offers "Default" (not set) next to yes/no. */
  allowUnset?: boolean;
  /** The value the plugin uses when unset (display only). */
  defaultHint?: boolean;
}

const STATES = { unset: undefined, true: true, false: false } as const;
type StateName = keyof typeof STATES;

/** Yes / no, optionally with a third "default" state. Behaves like radio buttons. */
export function TriState({ value, onChange, allowUnset = true, defaultHint }: TriStateProps) {
  const t = useTranslations('editor');
  const tCommon = useTranslations('common');
  const plugin = serverAdapterFor(useProjectStore((s) => s.project?.target ?? DEFAULT_PACK_TARGET)).pluginName;
  const current: StateName = value === undefined ? 'unset' : value ? 'true' : 'false';
  const options: Array<SegmentedOption<StateName>> = [
    { value: 'true', label: tCommon('yes') },
    { value: 'false', label: tCommon('no'), className: 'data-pressed:bg-muted data-pressed:text-destructive' },
  ];
  if (allowUnset) {
    options.unshift({
      value: 'unset',
      hint: t('inputs.defaultTooltip', { plugin }),
      label:
        defaultHint === undefined
          ? t('inputs.default')
          : t('inputs.defaultWithHint', { value: defaultHint ? tCommon('yes') : tCommon('no') }),
    });
  }
  return <SegmentedControl value={current} options={options} onChange={(next) => onChange(STATES[next])} />;
}
