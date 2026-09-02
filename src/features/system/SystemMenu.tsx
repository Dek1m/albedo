import { useCallback, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { useClickOutside } from '../../shared/ui/useClickOutside';

export type SystemPane = 'users' | 'modules' | 'preferences';

interface SystemMenuProps {
  onOpen: (pane: SystemPane) => void;
}

export function SystemMenu({ onOpen }: SystemMenuProps): ReactElement {
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

  const pick = (pane: SystemPane): void => {
    setHover(false);
    onOpen(pane);
  };

  return (
    <div className="albedo-ai-menu" ref={root} onMouseEnter={enter} onMouseLeave={leave}>
      <button type="button" className="albedo-ai-menu-btn" onClick={() => pick('users')}>
        System
      </button>
      {hover ? (
        <div className="albedo-ai-drop">
          <button type="button" className="albedo-ai-drop-item" onClick={() => pick('users')}>
            Users & Roles
          </button>
          <button type="button" className="albedo-ai-drop-item" onClick={() => pick('modules')}>
            Modules
          </button>
          <button type="button" className="albedo-ai-drop-item" onClick={() => pick('preferences')}>
            Preferences
          </button>
        </div>
      ) : null}
    </div>
  );
}
