import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { useClickOutside } from './useClickOutside';

export interface MenuItem {
  id: string;
  label: string;
  disabled?: boolean;
  children?: MenuItem[];
  action?: () => void;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

const EDGE = 8;

function clamp(x: number, y: number, width: number, height: number): { x: number; y: number } {
  const maxX = Math.max(EDGE, window.innerWidth - width - EDGE);
  const maxY = Math.max(EDGE, window.innerHeight - height - EDGE);
  return {
    x: Math.min(Math.max(EDGE, x), maxX),
    y: Math.min(Math.max(EDGE, y), maxY),
  };
}

function MenuList({
  items,
  onClose,
  submenu,
}: {
  items: MenuItem[];
  onClose: () => void;
  submenu?: boolean;
}): ReactElement {
  const [openId, setOpenId] = useState<string | null>(null);

  const run = (item: MenuItem): void => {
    if (item.disabled || item.children?.length) {
      return;
    }
    item.action?.();
    onClose();
  };

  return (
    <div className={submenu ? 'albedo-ws-drop albedo-ws-submenu' : undefined}>
      {items.map((item) => {
        const hasKids = Boolean(item.children?.length);
        const showKids = hasKids && openId === item.id;
        return (
          <div
            key={item.id}
            className="albedo-ws-drop-wrap"
            onMouseEnter={() => setOpenId(hasKids ? item.id : null)}
            onMouseLeave={() => setOpenId((current) => (current === item.id ? null : current))}
          >
            <button
              type="button"
              className={`albedo-ws-drop-item${hasKids ? ' has-children' : ''}`}
              disabled={item.disabled}
              onClick={() => run(item)}
            >
              <span>{item.label}</span>
              {hasKids ? <i className="bi bi-chevron-right" /> : null}
            </button>
            {showKids && item.children ? (
              <MenuList items={item.children} onClose={onClose} submenu />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps): ReactElement {
  const root = useRef<HTMLDivElement>(null);
  const close = useCallback(() => onClose(), [onClose]);
  const [pos, setPos] = useState({ x, y });

  useClickOutside(true, root, close);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      close();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [close]);

  useLayoutEffect(() => {
    const node = root.current;
    if (!node) {
      return;
    }
    setPos(clamp(x, y, node.offsetWidth, node.offsetHeight));
  }, [x, y, items]);

  return createPortal(
    <div
      ref={root}
      className="albedo-ws-drop albedo-ctx"
      style={{ position: 'fixed', top: pos.y, left: pos.x }}
      role="menu"
    >
      <MenuList items={items} onClose={close} />
    </div>,
    document.body,
  );
}
