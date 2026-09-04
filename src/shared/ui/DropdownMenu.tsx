import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
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

export function DropdownMenu({
  label,
  items,
  align = 'left',
  className,
  onTriggerClick,
}: DropdownMenuProps): ReactElement {
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const hide = useRef(0);
  const leaveAnim = useRef(0);
  const root = useRef<HTMLDivElement>(null);

  const closeNow = useCallback((): void => {
    window.clearTimeout(hide.current);
    window.clearTimeout(leaveAnim.current);
    setLeaving(true);
    leaveAnim.current = window.setTimeout(() => {
      setOpen(false);
      setLeaving(false);
    }, LEAVE_MS);
  }, []);

  useClickOutside(open, root, closeNow);

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
      {open ? (
        <div
          className={`albedo-drop${align === 'right' ? ' is-right' : ''}${leaving ? ' is-leave' : ''}`}
          role="menu"
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
        </div>
      ) : null}
    </div>
  );
}

interface DropdownPanelProps {
  open: boolean;
  align?: 'left' | 'right';
  children: ReactNode;
}

/** Панель без хоста — для kebab, когда триггер снаружи. */
export function DropdownPanel({ open, align = 'left', children }: DropdownPanelProps): ReactElement | null {
  const [mounted, setMounted] = useState(open);
  const [leaving, setLeaving] = useState(false);

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

  if (!mounted) {
    return null;
  }
  return (
    <div className={`albedo-drop${align === 'right' ? ' is-right' : ''}${leaving ? ' is-leave' : ''}`} role="menu">
      {children}
    </div>
  );
}
