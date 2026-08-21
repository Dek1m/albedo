import type { ReactElement } from 'react';
import { useToastStore } from './toastStore';

const ICON: Record<string, string> = {
  error: '✕',
  ok: '✓',
  info: 'i',
};

export function ToastView(): ReactElement {
  const items = useToastStore((s) => s.items);
  const dismiss = useToastStore((s) => s.dismiss);

  if (!items.length) {
    return <></>;
  }

  return (
    <div className="albedo-toast-stack">
      {items.map((t) => (
        <div
          key={t.id}
          className={`albedo-toast albedo-toast--${t.kind}${t.removing ? ' albedo-toast--out' : ''}`}
        >
          <span className="albedo-toast-icon">{ICON[t.kind] ?? '!'}</span>
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
      ))}
    </div>
  );
}
