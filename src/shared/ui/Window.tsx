import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactElement, ReactNode } from 'react';

export interface WindowProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

const MIN_W = 360;
const MIN_H = 280;
const CLOSE_MS = 180;

export function Window({ open, title, onClose, children, className }: WindowProps): ReactElement | null {
  const [mounted, setMounted] = useState(open);
  const [leaving, setLeaving] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const resize = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const frame = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setLeaving(false);
      return;
    }
    if (!mounted) {
      return;
    }
    setLeaving(true);
    const timer = window.setTimeout(() => {
      setMounted(false);
      setLeaving(false);
      setPos(null);
      setSize(null);
    }, CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [open, mounted]);

  useEffect(() => {
    if (!mounted || leaving) {
      return;
    }
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mounted, leaving, onClose]);

  const visualBox = (): DOMRect | null => frame.current?.getBoundingClientRect() ?? null;

  const onHeaderDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if ((event.target as HTMLElement).closest('button')) {
      return;
    }
    const box = visualBox();
    if (!box) {
      return;
    }
    drag.current = { dx: event.clientX - box.left, dy: event.clientY - box.top };
    setPos({ x: box.left, y: box.top });
    setSize({ w: box.width, h: box.height });
    setDragging(true);
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
    setDragging(false);
  };

  const onResizeDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    event.stopPropagation();
    const box = visualBox();
    if (!box) {
      return;
    }
    if (!pos) {
      setPos({ x: box.left, y: box.top });
    }
    resize.current = { x: event.clientX, y: event.clientY, w: box.width, h: box.height };
    setResizing(true);
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
    setResizing(false);
  };

  if (!mounted) {
    return null;
  }

  const placed = Boolean(pos);
  const style: CSSProperties = {};
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

  const rootClass = [
    'albedo-window',
    leaving ? 'is-leaving' : 'is-open',
    dragging ? 'is-dragging' : '',
    resizing ? 'is-resizing' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClass} role="dialog" aria-modal="true" aria-label={title}>
      <div className="albedo-window-backdrop" onClick={onClose} />
      <div
        className={`albedo-window-frame${placed ? '' : ' is-centered'}`}
        style={Object.keys(style).length ? style : undefined}
      >
        <div className="albedo-window-card" ref={frame}>
          <div
            className="albedo-window-head"
            onPointerDown={onHeaderDown}
            onPointerMove={onHeaderMove}
            onPointerUp={onHeaderUp}
            onPointerCancel={onHeaderUp}
          >
            <h2 className="albedo-window-title">{title}</h2>
            <button type="button" className="albedo-window-close" aria-label="Закрыть" onClick={onClose} />
          </div>
          <div className="albedo-window-body">{children}</div>
          <div
            className="albedo-window-resize"
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
