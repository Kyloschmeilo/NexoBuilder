import { useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Dialog } from '@resourcepackbuilder/ui/components/dialog';
import { Field, FieldError, FieldLabel } from '@resourcepackbuilder/ui/components/field';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { DialogFrame } from '../components/DialogFrame';
import type { Question } from '../store/dialogs';

/** The UI of `prompt()` from the dialog store. */
export function PromptDialog({ question: { options, resolve } }: { question: Extract<Question, { kind: 'prompt' }> }) {
  const t = useTranslations('dialogs');
  const tCommon = useTranslations('common');
  const inputId = useId();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(options.initial);
  const error = value.trim() ? (options.validate?.(value) ?? null) : t('prompt.nameRequired');
  const isInvalid = !!error && !!value;
  const cancel = () => resolve(null);
  const submit = () => {
    if (!error) resolve(value.trim());
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) cancel();
      }}
    >
      <DialogFrame
        title={options.title}
        size="narrow"
        initialFocus={inputRef}
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
          <Field data-invalid={isInvalid}>
            <FieldLabel htmlFor={inputId}>{options.label}</FieldLabel>
            <Input
              ref={inputRef}
              id={inputId}
              aria-invalid={isInvalid}
              value={value}
              placeholder={options.placeholder}
              list={options.suggestions?.length ? listId : undefined}
              spellCheck={options.suggestions?.length ? false : undefined}
              onChange={(e) => setValue(e.target.value)}
              onFocus={(e) => e.target.select()}
            />
            {isInvalid && <FieldError>{error}</FieldError>}
            {!!options.suggestions?.length && (
              <datalist id={listId}>
                {options.suggestions.map((suggestion) => (
                  <option key={suggestion.value} value={suggestion.value}>
                    {suggestion.text}
                  </option>
                ))}
              </datalist>
            )}
          </Field>
        </form>
      </DialogFrame>
    </Dialog>
  );
}
