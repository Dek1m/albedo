import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { useClickOutside } from './useClickOutside';

export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
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
const LEAVE_MS = 160;

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
    <div className={submenu ? 'albedo-drop albedo-drop-sub' : undefined}>
      {items.map((item) => {
        const hasKids = Boolean(item.children?.length);
        const showKids = hasKids && openId === item.id;
        return (
          <div
            key={item.id}
            className="albedo-drop-wrap"
            onMouseEnter={() => setOpenId(hasKids ? item.id : null)}
            onMouseLeave={() => setOpenId((current) => (current === item.id ? null : current))}
          >
            <button
              type="button"
              className={`albedo-drop-item${hasKids ? ' has-children' : ''}`}
              disabled={item.disabled}
              onClick={() => run(item)}
            >
              <span className="albedo-drop-label">
                {item.icon ? <i className={item.icon} aria-hidden="true" /> : null}
                <span>{item.label}</span>
              </span>
              {hasKids ? <i className="bi bi-chevron-right" /> : null}
            </button>
            {showKids && item.children ? <MenuList items={item.children} onClose={onClose} submenu /> : null}
          </div>
        );
      })}
    </div>
  );
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps): ReactElement {
  const root = useRef<HTMLDivElement>(null);
  const [leaving, setLeaving] = useState(false);
  const leaveTimer = useRef(0);
  const close = useCallback(() => {
    window.clearTimeout(leaveTimer.current);
    setLeaving(true);
    leaveTimer.current = window.setTimeout(onClose, LEAVE_MS);
  }, [onClose]);
  const [pos, setPos] = useState({ x, y });

  useClickOutside(true, root, close);

  useEffect(() => () => window.clearTimeout(leaveTimer.current), []);

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
      className={`albedo-drop albedo-drop-ctx${leaving ? ' is-leave' : ''}`}
      style={{ position: 'fixed', top: pos.y, left: pos.x }}
      role="menu"
    >
      <MenuList items={items} onClose={close} />
    </div>,
    document.body,
  );
}
