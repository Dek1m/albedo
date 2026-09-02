import { useCallback } from 'react';
import type { MouseEvent, ReactElement } from 'react';
import { useToastStore } from './toastStore';
import type { Toast } from './toastStore';

const ICON: Record<string, string> = {
  error: 'bi-x-circle-fill',
  ok: 'bi-check-circle-fill',
  info: 'bi-info-circle-fill',
};

function ToastItem({ toast: t }: { toast: Toast }): ReactElement {
  const dismiss = useToastStore((s) => s.dismiss);
  const freeze = useToastStore((s) => s.freeze);
  const unfreeze = useToastStore((s) => s.unfreeze);
  const pause = useToastStore((s) => s.pause);
  const resume = useToastStore((s) => s.resume);

  const onMouseEnter = useCallback(() => freeze(t.id), [freeze, t.id]);
  const onMouseLeave = useCallback(() => unfreeze(t.id), [unfreeze, t.id]);
  const onBodyClick = (event: MouseEvent<HTMLDivElement>): void => {
    if ((event.target as HTMLElement).closest('.albedo-toast-close')) {
      return;
    }
    if (t.pinned) {
      resume(t.id);
      return;
    }
    pause(t.id);
  };

  const fading = !t.frozen && !t.pinned;
  return (
    <div
      className={`albedo-toast albedo-toast--${t.kind}${t.removing ? ' albedo-toast--out' : ''}${fading ? ' albedo-toast--fade' : ''}${t.pinned ? ' is-pinned' : ''}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onBodyClick}
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
