/**
 * The field rows of the media editors: the translated label, the control, the plugin's YAML key in the key rail and
 * the help in the ⓘ popover ({@link FieldRow}). The key depends on the target, so each row takes it from its caller.
 */
import { useId, type ReactNode } from 'react';
import { FieldRow } from '@resourcepackbuilder/ui';
import { Switch } from '@resourcepackbuilder/ui/components/switch';

interface MediaFieldProps {
  label: string;
  /** The YAML key the export writes for this option; none when the target writes nothing for it */
  yamlKey?: string;
  help?: ReactNode;
  error?: string;
  layout?: 'side' | 'stacked';
  /** The control, given the id its label points to */
  children: (id: string) => ReactNode;
}

/** A labelled control in the Workbench field layout. */
export function MediaField({ label, yamlKey, help, error, layout, children }: MediaFieldProps) {
  const id = useId();
  return (
    <FieldRow label={label} htmlFor={id} yamlKey={yamlKey} help={help} error={error} layout={layout}>
      {children(id)}
    </FieldRow>
  );
}

interface SwitchFieldProps {
  label: string;
  yamlKey?: string;
  help?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

/** An on/off option as a switch row. */
export function SwitchField({ label, yamlKey, help, checked, onChange, disabled }: SwitchFieldProps) {
  return (
    <MediaField label={label} yamlKey={yamlKey} help={help}>
      {(id) => <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} />}
    </MediaField>
  );
}
