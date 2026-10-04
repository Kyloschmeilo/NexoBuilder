import { useState } from 'react';
import { useStore, type DialogState } from '../../state/store';
import { Modal } from './Modal';

export function ConfirmDialog({ dialog }: { dialog: Extract<DialogState, { type: 'confirm' }> }) {
  const close = useStore((s) => s.closeDialog);
  return (
    <Modal
      title={dialog.title}
      onClose={close}
      size="narrow"
      footer={
        <>
          <button className="btn" onClick={close}>
            Abbrechen
          </button>
          <button
            className={`btn ${dialog.danger ? 'danger-solid' : 'primary'}`}
            autoFocus
            onClick={() => {
              close();
              dialog.onConfirm();
            }}
          >
            {dialog.confirmLabel}
          </button>
        </>
      }
    >
      <p className="muted" style={{ margin: 0, whiteSpace: 'pre-line' }}>
        {dialog.message}
      </p>
    </Modal>
  );
}

export function PromptDialog({ dialog }: { dialog: Extract<DialogState, { type: 'prompt' }> }) {
  const close = useStore((s) => s.closeDialog);
  const [value, setValue] = useState(dialog.initial);
  const error = dialog.validate?.(value) ?? (value.trim() ? null : 'Bitte einen Namen eingeben.');
  const submit = () => {
    if (error) return;
    close();
    dialog.onSubmit(value.trim());
  };
  return (
    <Modal
      title={dialog.title}
      onClose={close}
      size="narrow"
      footer={
        <>
          <button className="btn" onClick={close}>
            Abbrechen
          </button>
          <button className="btn primary" disabled={!!error} onClick={submit}>
            {dialog.confirmLabel}
          </button>
        </>
      }
    >
      <label className="field">
        <span className="field-label">{dialog.label}</span>
        <input
          className={`input ${error && value ? 'invalid' : ''}`}
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
          onFocus={(e) => e.target.select()}
        />
        {error && value && <span className="field-error">{error}</span>}
      </label>
    </Modal>
  );
}

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`} onClick={() => dismiss(t.id)} role="status">
          {t.message}
        </div>
      ))}
    </div>
  );
}
