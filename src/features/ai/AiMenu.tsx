import { useCallback, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { useClickOutside } from '../../shared/ui/useClickOutside';

export type AiPane = 'agents' | 'models' | 'providers';

interface AiMenuProps {
  onOpen: (pane: AiPane) => void;
}

export function AiMenu({ onOpen }: AiMenuProps): ReactElement {
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

  const pick = (pane: AiPane): void => {
    setHover(false);
    onOpen(pane);
  };

  return (
    <div className="albedo-ai-menu" ref={root} onMouseEnter={enter} onMouseLeave={leave}>
      <button type="button" className="albedo-ai-menu-btn" onClick={() => pick('agents')}>
        AI
      </button>
      {hover ? (
        <div className="albedo-ai-drop">
          <button type="button" className="albedo-ai-drop-item" onClick={() => pick('agents')}>
            Agents
          </button>
          <button type="button" className="albedo-ai-drop-item" onClick={() => pick('models')}>
            Models
          </button>
          <button type="button" className="albedo-ai-drop-item" onClick={() => pick('providers')}>
            Providers…
          </button>
        </div>
      ) : null}
    </div>
  );
}
