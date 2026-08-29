import type { ReactElement } from 'react';
import { Window } from './Window';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'OK',
  danger = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps): ReactElement {
  return (
    <Window
      className="albedo-confirm"
      windowId="albedo-confirm"
      size="ask"
      open={open}
      title={title}
      icon={danger ? 'bi-exclamation-triangle' : 'bi-question-circle'}
      onClose={onClose}
    >
      <p className="albedo-confirm-body">{body}</p>
      <div className="albedo-confirm-actions">
        <button type="button" className="btn btn-sm albedo-ghost-btn" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className={`btn btn-sm ${danger ? 'albedo-danger-btn' : 'btn-albedo-primary'}`}
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </Window>
  );
}
