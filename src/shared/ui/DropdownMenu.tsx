import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactElement, ReactNode, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useClickOutside } from './useClickOutside';

export interface DropdownItem {
  id: string;
  label: string;
  disabled?: boolean;
  onSelect?: () => void;
}

interface DropdownMenuProps {
  label: string;
  items: DropdownItem[];
  align?: 'left' | 'right';
  className?: string;
  onTriggerClick?: () => void;
}

const LEAVE_MS = 160;
const HOVER_MS = 180;
const EDGE = 8;

function placeMenu(
  anchor: HTMLElement,
  menu: HTMLElement,
  align: 'left' | 'right',
): { x: number; y: number } {
  const rect = anchor.getBoundingClientRect();
  const width = menu.offsetWidth;
  const height = menu.offsetHeight;
  let x = align === 'right' ? rect.right - width : rect.left;
  let y = rect.bottom + 4;
  x = Math.min(Math.max(EDGE, x), Math.max(EDGE, window.innerWidth - width - EDGE));
  y = Math.min(Math.max(EDGE, y), Math.max(EDGE, window.innerHeight - height - EDGE));
  return { x, y };
}

export function DropdownMenu({
  label,
  items,
  align = 'left',
  className,
  onTriggerClick,
}: DropdownMenuProps): ReactElement {
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const hide = useRef(0);
  const leaveAnim = useRef(0);
  const root = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  const closeNow = useCallback((): void => {
    window.clearTimeout(hide.current);
    window.clearTimeout(leaveAnim.current);
    setLeaving(true);
    leaveAnim.current = window.setTimeout(() => {
      setOpen(false);
      setLeaving(false);
    }, LEAVE_MS);
  }, []);

  useClickOutside(open, [root, menu], closeNow);

  useEffect(
    () => () => {
      window.clearTimeout(hide.current);
      window.clearTimeout(leaveAnim.current);
    },
    [],
  );

  const enter = (): void => {
    window.clearTimeout(hide.current);
    window.clearTimeout(leaveAnim.current);
    setLeaving(false);
    setOpen(true);
  };

  const leave = (): void => {
    hide.current = window.setTimeout(closeNow, HOVER_MS);
  };

  const pick = (item: DropdownItem): void => {
    if (item.disabled) {
      return;
    }
    item.onSelect?.();
    closeNow();
  };

  useLayoutEffect(() => {
    if (!open || !root.current || !menu.current) {
      return;
    }
    setPos(placeMenu(root.current, menu.current, align));
  }, [open, align, items]);

  return (
    <div
      className={`albedo-drop-host${className ? ` ${className}` : ''}`}
      ref={root}
      onMouseEnter={enter}
      onMouseLeave={leave}
    >
      <button type="button" className="albedo-drop-trigger" onClick={() => onTriggerClick?.() ?? enter()}>
        {label}
      </button>
      {open
        ? createPortal(
            <div
              ref={menu}
              className={`albedo-drop albedo-drop-float${leaving ? ' is-leave' : ''}`}
              role="menu"
              style={{ position: 'fixed', top: pos.y, left: pos.x }}
              onMouseEnter={enter}
              onMouseLeave={leave}
            >
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  className="albedo-drop-item"
                  disabled={item.disabled}
                  onClick={() => pick(item)}
                >
                  {item.label}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

interface DropdownPanelProps {
  open: boolean;
  align?: 'left' | 'right';
  anchor: RefObject<HTMLElement | null>;
  onClose?: () => void;
  children: ReactNode;
}

/** Панель без хоста — для kebab, когда триггер снаружи. Портал на body. */
export function DropdownPanel({
  open,
  align = 'left',
  anchor,
  onClose,
  children,
}: DropdownPanelProps): ReactElement | null {
  const [mounted, setMounted] = useState(open);
  const [leaving, setLeaving] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const menu = useRef<HTMLDivElement>(null);

  useClickOutside(open, [anchor, menu], () => onClose?.());

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
    }, LEAVE_MS);
    return () => window.clearTimeout(timer);
  }, [open, mounted]);

  useLayoutEffect(() => {
    if (!mounted || !anchor.current || !menu.current) {
      return;
    }
    setPos(placeMenu(anchor.current, menu.current, align));
  }, [mounted, align, children, anchor]);

  if (!mounted) {
    return null;
  }
  return createPortal(
    <div
      ref={menu}
      className={`albedo-drop albedo-drop-float${leaving ? ' is-leave' : ''}`}
      role="menu"
      style={{ position: 'fixed', top: pos.y, left: pos.x }}
    >
      {children}
    </div>,
    document.body,
  );
}
