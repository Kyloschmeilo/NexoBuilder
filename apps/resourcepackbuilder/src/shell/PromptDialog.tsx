import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Field, FieldError, FieldLabel } from '@resourcepackbuilder/ui/components/field';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { DialogFrame } from '../components/DialogFrame';
import type { Question } from '../store/dialogs';

/** The UI of `prompt()` from the dialog store. */
export function PromptDialog({ question: { options, resolve } }: { question: Extract<Question, { kind: 'prompt' }> }) {
  const t = useTranslations('dialogs');
  const tCommon = useTranslations('common');
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(options.initial);
  const error = value.trim() ? (options.validate?.(value) ?? null) : t('prompt.nameRequired');
  const invalid = !!error && !!value;
  const cancel = () => resolve(null);
  const submit = () => {
    if (!error) resolve(value.trim());
  };
  return (
    <DialogFrame
      title={options.title}
      size="narrow"
      initialFocus={inputRef}
      onClose={cancel}
      footer={
        <>
          <Button variant="outline" onClick={cancel}>
            {tCommon('cancel')}
          </Button>
          <Button disabled={!!error} onClick={submit}>
            {options.confirmLabel}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field data-invalid={invalid}>
          <FieldLabel htmlFor="prompt-dialog-input">{options.label}</FieldLabel>
          <Input
            ref={inputRef}
            id="prompt-dialog-input"
            aria-invalid={invalid}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={(e) => e.target.select()}
          />
          {invalid && <FieldError>{error}</FieldError>}
        </Field>
      </form>
    </DialogFrame>
  );
}
