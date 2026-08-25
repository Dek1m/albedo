import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactElement, ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ open, title, onClose, children }: ModalProps): ReactElement | null {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const onHeaderDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if ((event.target as HTMLElement).closest('button')) {
      return;
    }
    const box = dialog.current?.getBoundingClientRect();
    if (!box) {
      return;
    }
    drag.current = { dx: event.clientX - box.left, dy: event.clientY - box.top };
    setPos({ x: box.left, y: box.top });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onHeaderMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!drag.current) {
      return;
    }
    setPos({
      x: event.clientX - drag.current.dx,
      y: event.clientY - drag.current.dy,
    });
  };

  const onHeaderUp = (): void => {
    drag.current = null;
  };

  if (!open) {
    return null;
  }
  return (
    <div className="modal d-block albedo-modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="albedo-modal-backdrop" onClick={onClose} />
      <div
        ref={dialog}
        className={`modal-dialog${pos ? '' : ' modal-dialog-centered'} albedo-modal-dialog`}
        style={pos ? { position: 'fixed', margin: 0, left: pos.x, top: pos.y, transform: 'none' } : undefined}
      >
        <div className="modal-content">
          <div
            className="modal-header albedo-modal-drag"
            onPointerDown={onHeaderDown}
            onPointerMove={onHeaderMove}
            onPointerUp={onHeaderUp}
            onPointerCancel={onHeaderUp}
          >
            <h2 className="modal-title fs-5">{title}</h2>
            <button type="button" className="btn-close btn-close-white" aria-label="Закрыть" onClick={onClose} />
          </div>
          <div className="modal-body">{children}</div>
        </div>
      </div>
    </div>
  );
}
