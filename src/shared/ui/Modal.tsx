import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactElement, ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

const MIN_W = 360;
const MIN_H = 280;

export function Modal({ open, title, onClose, children }: ModalProps): ReactElement | null {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const resize = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setPos(null);
      setSize(null);
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

  const pinBox = (): DOMRect | null => {
    const box = dialog.current?.getBoundingClientRect();
    if (!box) {
      return null;
    }
    if (!pos) {
      setPos({ x: box.left, y: box.top });
    }
    if (!size) {
      setSize({ w: box.width, h: box.height });
    }
    return box;
  };

  const onHeaderDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if ((event.target as HTMLElement).closest('button')) {
      return;
    }
    const box = pinBox();
    if (!box) {
      return;
    }
    drag.current = { dx: event.clientX - box.left, dy: event.clientY - box.top };
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

  const onResizeDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    event.stopPropagation();
    const box = pinBox();
    if (!box) {
      return;
    }
    resize.current = { x: event.clientX, y: event.clientY, w: box.width, h: box.height };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onResizeMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!resize.current) {
      return;
    }
    const maxW = window.innerWidth - 16;
    const maxH = window.innerHeight - 16;
    setSize({
      w: Math.min(maxW, Math.max(MIN_W, resize.current.w + event.clientX - resize.current.x)),
      h: Math.min(maxH, Math.max(MIN_H, resize.current.h + event.clientY - resize.current.y)),
    });
  };

  const onResizeUp = (): void => {
    resize.current = null;
  };

  if (!open) {
    return null;
  }

  const placed = Boolean(pos);
  const style: { [key: string]: string | number } = {};
  if (pos) {
    style.position = 'fixed';
    style.margin = 0;
    style.left = pos.x;
    style.top = pos.y;
    style.transform = 'none';
  }
  if (size) {
    style.width = size.w;
    style.height = size.h;
    style.maxWidth = 'none';
    style.minHeight = size.h;
  }

  return (
    <div className="modal d-block albedo-modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="albedo-modal-backdrop" onClick={onClose} />
      <div
        ref={dialog}
        className={`modal-dialog${placed ? '' : ' modal-dialog-centered'} albedo-modal-dialog`}
        style={Object.keys(style).length ? style : undefined}
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
          <div
            className="albedo-modal-resize"
            onPointerDown={onResizeDown}
            onPointerMove={onResizeMove}
            onPointerUp={onResizeUp}
            onPointerCancel={onResizeUp}
          />
        </div>
      </div>
    </div>
  );
}
