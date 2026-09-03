import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactElement, ReactNode } from 'react';
import { askBox, cascadeBox, clampBox, fromRatio, growHeightSnapY, toRatio, topCenterBox } from './windowGeom';
import type { WindowBox } from './windowGeom';
import { peekWindow, rememberWindow } from './windowLayout';

export type WindowSize = 'frame' | 'ask';

export interface WindowProps {
  open: boolean;
  title: string;
  windowId: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  size?: WindowSize;
  icon?: string;
  parentId?: string;
}

const WINDOW_ICONS: Record<string, string> = {
  'albedo-admin': 'bi-shield-lock',
  'albedo-admin-role-create': 'bi-shield-plus',
  'albedo-admin-role-edit': 'bi-shield',
  'albedo-admin-role-pick': 'bi-shield',
  'albedo-system-modules': 'bi-box-seam',
  'albedo-system-prefs': 'bi-sliders',
  'albedo-system-install': 'bi-download',
  'albedo-confirm': 'bi-question-circle',
  'albedo-prompt': 'bi-input-cursor-text',
  'albedo-settings': 'bi-gear',
  'albedo-ai-agents': 'bi-robot',
  'albedo-ai-agent-form': 'bi-robot',
  'albedo-ai-models': 'bi-cpu',
  'albedo-ai-providers': 'bi-hdd-network',
  'albedo-folders': 'bi-folder-plus',
  'albedo-workspaces': 'bi-collection',
  'albedo-workspace-create': 'bi-plus-square',
  'albedo-sessions': 'bi-chat-dots',
  'albedo-share': 'bi-share',
  'albedo-share-add': 'bi-person-plus',
};

const CLOSE_MS = 180;

function initialBox(windowId: string, size: WindowSize, parentId?: string): WindowBox {
  if (size === 'ask') {
    return askBox();
  }
  const saved = peekWindow(windowId);
  if (saved) {
    return fromRatio(saved);
  }
  if (parentId) {
    const parent = peekWindow(parentId);
    if (parent) {
      return cascadeBox(fromRatio(parent));
    }
  }
  return topCenterBox();
}

export function Window({
  open,
  title,
  windowId,
  onClose,
  children,
  className,
  size = 'frame',
  icon,
  parentId,
}: WindowProps): ReactElement | null {
  const [mounted, setMounted] = useState(open);
  const [leaving, setLeaving] = useState(false);
  const [box, setBox] = useState<WindowBox>(() => initialBox(windowId, size, parentId));
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const resize = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef(box);
  boxRef.current = box;

  useEffect(() => {
    if (open) {
      setBox(initialBox(windowId, size, parentId));
      setMounted(true);
      setLeaving(false);
      return;
    }
    if (!mounted) {
      return;
    }
    if (size !== 'ask') {
      rememberWindow(windowId, toRatio(boxRef.current));
    }
    setLeaving(true);
    const timer = window.setTimeout(() => {
      setMounted(false);
      setLeaving(false);
    }, CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [open, mounted, windowId, size, parentId]);

  useEffect(() => {
    const onResize = (): void => {
      setBox((current) => clampBox(current));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

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

  useEffect(() => {
    if (!mounted || leaving || size === 'ask' || dragging || resizing) {
      return;
    }
    const body = bodyRef.current;
    if (!body) {
      return;
    }
    const growIfOverflow = (): void => {
      if (body.scrollHeight <= body.clientHeight) {
        return;
      }
      const extra = body.scrollHeight - body.clientHeight;
      setBox((current) => {
        const next = growHeightSnapY(current, current.h + extra);
        if (next.x === current.x && next.y === current.y && next.w === current.w && next.h === current.h) {
          return current;
        }
        return next;
      });
    };
    growIfOverflow();
    const observer = new ResizeObserver(growIfOverflow);
    observer.observe(body);
    return () => observer.disconnect();
  }, [mounted, leaving, size, dragging, resizing]);

  const onHeaderDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if ((event.target as HTMLElement).closest('button')) {
      return;
    }
    drag.current = { dx: event.clientX - box.x, dy: event.clientY - box.y };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onHeaderMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!drag.current) {
      return;
    }
    const grab = drag.current;
    setBox((current) =>
      clampBox({
        x: event.clientX - grab.dx,
        y: event.clientY - grab.dy,
        w: current.w,
        h: current.h,
      }),
    );
  };

  const onHeaderUp = (): void => {
    drag.current = null;
    setDragging(false);
  };

  const onResizeDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    event.stopPropagation();
    resize.current = { x: event.clientX, y: event.clientY, w: box.w, h: box.h };
    setResizing(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onResizeMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!resize.current) {
      return;
    }
    const grab = resize.current;
    setBox((current) =>
      clampBox({
        x: current.x,
        y: current.y,
        w: grab.w + event.clientX - grab.x,
        h: grab.h + event.clientY - grab.y,
      }),
    );
  };

  const onResizeUp = (): void => {
    resize.current = null;
    setResizing(false);
  };

  if (!mounted) {
    return null;
  }

  const style: CSSProperties = {
    position: 'fixed',
    margin: 0,
    left: box.x,
    top: box.y,
    width: box.w,
    height: box.h,
    maxWidth: 'none',
    minHeight: 0,
    transform: 'none',
  };

  const rootClass = [
    'albedo-window',
    leaving ? 'is-leaving' : 'is-open',
    dragging ? 'is-dragging' : '',
    resizing ? 'is-resizing' : '',
    size === 'ask' ? 'is-ask' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClass} role="dialog" aria-modal="true" aria-label={title}>
      <div className="albedo-window-backdrop" onClick={onClose} />
      <div className="albedo-window-frame" style={style}>
        <div className="albedo-window-card">
          <div
            className="albedo-window-head"
            onPointerDown={onHeaderDown}
            onPointerMove={onHeaderMove}
            onPointerUp={onHeaderUp}
            onPointerCancel={onHeaderUp}
          >
            <h2 className="albedo-window-title">
              <i className={`bi ${icon ?? WINDOW_ICONS[windowId] ?? 'bi-window'}`} />
              {title}
            </h2>
            <button type="button" className="albedo-window-close" aria-label="Закрыть" onClick={onClose} />
          </div>
          <div className="albedo-window-body" ref={bodyRef}>
            {children}
          </div>
          {size === 'ask' ? null : (
            <div
              className="albedo-window-resize"
              onPointerDown={onResizeDown}
              onPointerMove={onResizeMove}
              onPointerUp={onResizeUp}
              onPointerCancel={onResizeUp}
            />
          )}
        </div>
      </div>
    </div>
  );
}
