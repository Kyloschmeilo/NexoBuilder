/** The UI of `prompt()` from the dialog store: one required text field (a name) in a narrow dialog. */
import { useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { FieldRow } from '@resourcepackbuilder/ui';
import { Button } from '@resourcepackbuilder/ui/components/button';
import { Dialog } from '@resourcepackbuilder/ui/components/dialog';
import { Input } from '@resourcepackbuilder/ui/components/input';
import { DialogFrame } from '../components/DialogFrame';
import type { Question } from '../store/dialogs';

/** Asks for a name; Enter submits, an empty or invalid name keeps the dialog open. */
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
          <FieldRow label={options.label} htmlFor={inputId} layout="stacked" error={isInvalid ? (error ?? undefined) : undefined}>
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
            {!!options.suggestions?.length && (
              <datalist id={listId}>
                {options.suggestions.map((suggestion) => (
                  <option key={suggestion.value} value={suggestion.value}>
                    {suggestion.text}
                  </option>
                ))}
              </datalist>
            )}
          </FieldRow>
        </form>
      </DialogFrame>
    </Dialog>
  );
}
