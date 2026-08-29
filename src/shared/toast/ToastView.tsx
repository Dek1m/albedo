import { useCallback } from 'react';
import type { ReactElement } from 'react';
import { useToastStore } from './toastStore';

const ICON: Record<string, string> = {
  error: 'bi-x-circle-fill',
  ok: 'bi-check-circle-fill',
  info: 'bi-info-circle-fill',
};

function ToastItem({ toast: t }: { toast: { id: number; text: string; kind: string; removing: boolean; frozen: boolean } }): ReactElement {
  const dismiss = useToastStore((s) => s.dismiss);
  const freeze = useToastStore((s) => s.freeze);
  const unfreeze = useToastStore((s) => s.unfreeze);

  const onMouseEnter = useCallback(() => freeze(t.id), [freeze, t.id]);
  const onMouseLeave = useCallback(() => unfreeze(t.id), [unfreeze, t.id]);

  return (
    <div
      className={`albedo-toast albedo-toast--${t.kind}${t.removing ? ' albedo-toast--out' : ''}${t.frozen ? '' : ' albedo-toast--fade'}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <span className="albedo-toast-icon">
        <i className={`bi ${ICON[t.kind] ?? 'bi-bell-fill'}`} />
      </span>
      <span className="albedo-toast-text">{t.text}</span>
      <button
        type="button"
        className="albedo-toast-close"
        onClick={() => dismiss(t.id)}
        aria-label="Закрыть"
      >
        ✕
      </button>
    </div>
  );
}

export function ToastView(): ReactElement {
  const items = useToastStore((s) => s.items);

  if (!items.length) {
    return <></>;
  }

  return (
    <div className="albedo-toast-stack">
      {items.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
