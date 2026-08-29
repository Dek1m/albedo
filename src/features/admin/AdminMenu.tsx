import { useCallback, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { useClickOutside } from '../../shared/ui/useClickOutside';

interface AdminMenuProps {
  onOpen: () => void;
}

export function AdminMenu({ onOpen }: AdminMenuProps): ReactElement {
  const [hover, setHover] = useState(false);
  const hide = useRef<number>(0);
  const root = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setHover(false), []);

  useClickOutside(hover, root, close);

  const enter = (): void => {
    window.clearTimeout(hide.current);
    setHover(true);
  };
  const leave = (): void => {
    hide.current = window.setTimeout(() => setHover(false), 180);
  };

  const open = (): void => {
    setHover(false);
    onOpen();
  };

  return (
    <div className="albedo-ws-menu" ref={root} onMouseEnter={enter} onMouseLeave={leave}>
      <button type="button" className="albedo-ws-menu-btn" onClick={open}>
        Admin Panel
      </button>
      {hover ? (
        <div className="albedo-ws-drop">
          <button type="button" className="albedo-ws-drop-item" onClick={open}>
            Admin Panel
          </button>
        </div>
      ) : null}
    </div>
  );
}
