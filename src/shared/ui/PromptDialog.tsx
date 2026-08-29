import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { Window } from './Window';

interface PromptDialogProps {
  open: boolean;
  title: string;
  label?: string;
  confirmLabel?: string;
  onSubmit: (value: string) => void;
  onClose: () => void;
}

export function PromptDialog({
  open,
  title,
  label = 'Name',
  confirmLabel = 'Create',
  onSubmit,
  onClose,
}: PromptDialogProps): ReactElement {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (open) {
      setValue('');
    }
  }, [open]);

  return (
    <Window className="albedo-prompt" open={open} title={title} onClose={onClose}>
      <label className="form-label" htmlFor="albedo-prompt">
        {label}
      </label>
      <input
        id="albedo-prompt"
        className="form-control form-control-sm"
        autoFocus
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && value.trim()) {
            onSubmit(value.trim());
            onClose();
          }
        }}
      />
      <div className="albedo-confirm-actions">
        <button type="button" className="btn btn-sm albedo-ghost-btn" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-sm btn-albedo-primary"
          disabled={!value.trim()}
          onClick={() => {
            onSubmit(value.trim());
            onClose();
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </Window>
  );
}
