import { useTranslations } from 'next-intl';
import { cn } from 'cn';
import { Tip } from '@resourcepackbuilder/ui';
import { ToggleGroup, ToggleGroupItem } from '@resourcepackbuilder/ui/components/toggle-group';

interface TriStateProps {
  value: boolean | undefined;
  onChange: (value: boolean | undefined) => void;
  /** Offers "Default" (not set) next to yes/no. */
  allowUnset?: boolean;
  /** The value Nexo uses when unset (display only). */
  defaultHint?: boolean;
}

const ITEM =
  'px-3.5 text-muted-foreground hover:bg-muted hover:text-foreground data-pressed:bg-accent data-pressed:font-semibold data-pressed:text-primary';

const STATES = { unset: undefined, true: true, false: false } as const;
type StateName = keyof typeof STATES;

const isStateName = (value: string): value is StateName => value in STATES;

/** Yes / no, optionally with a third "default" state. Behaves like radio buttons. */
export function TriState({ value, onChange, allowUnset = true, defaultHint }: TriStateProps) {
  const t = useTranslations('ui');
  const common = useTranslations('common');
  const current: StateName = value === undefined ? 'unset' : value ? 'true' : 'false';
  return (
    <ToggleGroup
      variant="outline"
      spacing={0}
      className="bg-background"
      value={[current]}
      onValueChange={(next: string[]) => {
        // Clicking the active button keeps the selection (radio behaviour)
        const picked = next.find((v) => v !== current);
        if (picked && isStateName(picked)) onChange(STATES[picked]);
      }}
    >
      {allowUnset && (
        <Tip label={t('inputs.defaultTooltip')}>
          <ToggleGroupItem value="unset" className={ITEM}>
            {defaultHint === undefined
              ? t('inputs.default')
              : t('inputs.defaultWithHint', { value: defaultHint ? common('yes') : common('no') })}
          </ToggleGroupItem>
        </Tip>
      )}
      <ToggleGroupItem value="true" className={ITEM}>
        {common('yes')}
      </ToggleGroupItem>
      <ToggleGroupItem value="false" className={cn(ITEM, 'data-pressed:bg-muted data-pressed:text-destructive')}>
        {common('no')}
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
